import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { Client, WsClient, startServer } from './helpers.ts';
import type { TestServer } from './helpers.ts';

let s: TestServer;
before(async () => { s = await startServer(); });
after(async () => { await s.stop(); });

async function player(name: string): Promise<{ http: Client; ws: WsClient; userId: string }> {
  const http = new Client(s.base);
  const me = await http.get('/api/me');
  await http.patch('/api/profile', { displayName: name });
  const ws = await WsClient.connect(s.base, http.cookie);
  return { http, ws, userId: me.body.profile.userId };
}

test('ws upgrade requires a session', async () => {
  const ws = new WebSocket(s.base.replace('http', 'ws') + '/ws');
  const err = await new Promise<Error>((resolve) => { ws.once('error', resolve); ws.once('open', () => resolve(new Error('opened'))); });
  assert.match(err.message, /401/);
});

test("private room: fool's mate ends with checkmate, stored for both players", async () => {
  const a = await player('Alice');
  const b = await player('Bob');
  a.ws.send({ t: 'ping' });
  await a.ws.next('pong');
  a.ws.send({ t: 'createRoom', tc: { initial: 300, increment: 2 }, color: 'white' });
  const { code } = await a.ws.next('roomCreated');
  assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
  b.ws.send({ t: 'joinRoom', code: code.toLowerCase() });
  const startA = (await a.ws.next('gameStart')).game;
  const startB = (await b.ws.next('gameStart')).game;
  assert.equal(startA.you, 'white');
  assert.equal(startB.you, 'black');
  assert.equal(startA.white.name, 'Alice');
  assert.ok(startA.clocks.white <= 300_000 && startA.clocks.white > 299_000);
  const id = startA.id;

  // illegal and out-of-turn moves are rejected
  b.ws.send({ t: 'move', gameId: id, uci: 'e7e5', ply: 0 });
  assert.match((await b.ws.next('error')).message, /Not your turn/);
  a.ws.send({ t: 'move', gameId: id, uci: 'e2e5', ply: 0 });
  assert.match((await a.ws.next('error')).message, /Illegal/);
  await a.ws.next('gameState');

  const seq: [typeof a, string][] = [[a, 'f2f3'], [b, 'e7e5'], [a, 'g2g4'], [b, 'd8h4']];
  for (let i = 0; i < seq.length; i++) {
    const [p, uci] = seq[i];
    p.ws.send({ t: 'move', gameId: id, uci, ply: i });
    if (i < seq.length - 1) {
      const st = (await a.ws.next('gameState', (m) => m.game.moves.length === i + 1)).game;
      await b.ws.next('gameState', (m) => m.game.moves.length === i + 1);
      assert.equal(st.moves[i], uci);
      assert.ok(st.clocks.white <= 300_000 + 2000 * Math.ceil((i + 1) / 2), `white clock ${st.clocks.white}`);
    }
  }
  const endA = await a.ws.next('gameEnd');
  const endB = await b.ws.next('gameEnd');
  assert.deepEqual([endA.result, endA.reason], ['0-1', 'checkmate']);
  assert.equal(endB.result, '0-1');
  assert.equal(endA.ratingChange, undefined, 'private rooms are casual by default');

  const ga = (await a.http.get('/api/games')).body;
  const gb = (await b.http.get('/api/games')).body;
  assert.equal(ga.length, 1);
  assert.equal(gb.length, 1);
  assert.equal(ga[0].mode, 'online');
  assert.equal(ga[0].result, 0);
  assert.equal(gb[0].result, 1);
  assert.equal(ga[0].opponent, 'Bob');
  assert.match(ga[0].pgn, /Qh4#/);

  // rematch swaps colours
  a.ws.send({ t: 'rematch', gameId: id });
  await b.ws.next('rematchOffered');
  b.ws.send({ t: 'rematch', gameId: id });
  const re = (await a.ws.next('gameStart')).game;
  assert.equal(re.you, 'black');
  a.ws.send({ t: 'resign', gameId: re.id });
  const reEnd = await b.ws.next('gameEnd');
  assert.deepEqual([reEnd.result, reEnd.reason], ['1-0', 'resign'], 'black (Alice) resigned');
  a.ws.close(); b.ws.close();
});

test('clock flag: white runs out of time', async () => {
  const a = await player('Flagger');
  const b = await player('Waiter');
  a.ws.send({ t: 'createRoom', tc: { initial: 1, increment: 0 }, color: 'white' });
  const { code } = await a.ws.next('roomCreated');
  b.ws.send({ t: 'joinRoom', code });
  await a.ws.next('gameStart');
  const end = await b.ws.next('gameEnd', () => true, 4000);
  assert.deepEqual([end.result, end.reason], ['0-1', 'timeout']);
  a.ws.close(); b.ws.close();
});

test('matchmaking seek pairs two players; rated game updates online ratings; draw by agreement', async () => {
  const a = await player('Seeker1');
  const b = await player('Seeker2');
  a.ws.send({ t: 'seek', tc: { initial: 180, increment: 0 }, rated: true });
  await a.ws.next('lobby', (m) => m.seeks.length === 1);
  b.ws.send({ t: 'seek', tc: { initial: 180, increment: 0 }, rated: true });
  const ga = (await a.ws.next('gameStart')).game;
  const gb = (await b.ws.next('gameStart')).game;
  assert.equal(ga.id, gb.id);
  assert.notEqual(ga.you, gb.you);
  const [white, black] = ga.you === 'white' ? [a, b] : [b, a];
  white.ws.send({ t: 'move', gameId: ga.id, uci: 'e2e4', ply: 0 });
  await black.ws.next('gameState', (m) => m.game.moves.length === 1);
  black.ws.send({ t: 'move', gameId: ga.id, uci: 'e7e5', ply: 1 });
  await white.ws.next('gameState', (m) => m.game.moves.length === 2);
  white.ws.send({ t: 'offerDraw', gameId: ga.id });
  assert.equal((await black.ws.next('drawOffered')).by, 'white');
  black.ws.send({ t: 'acceptDraw', gameId: ga.id });
  const end = await white.ws.next('gameEnd');
  assert.deepEqual([end.result, end.reason], ['1/2-1/2', 'agreement']);
  assert.ok(end.ratingChange && typeof end.ratingChange.white === 'number');
  const me = (await a.http.get('/api/me')).body;
  assert.equal(me.ratings.online.games, 1);
  a.ws.close(); b.ws.close();
});

test('disconnect and rejoin within the grace period', async () => {
  const a = await player('Dropper');
  const b = await player('Stayer');
  a.ws.send({ t: 'createRoom', tc: { initial: 60, increment: 0 }, color: 'white' });
  const { code } = await a.ws.next('roomCreated');
  b.ws.send({ t: 'joinRoom', code });
  const g = (await a.ws.next('gameStart')).game;
  a.ws.send({ t: 'move', gameId: g.id, uci: 'd2d4', ply: 0 });
  await b.ws.next('gameState', (m) => m.game.moves.length === 1);
  a.ws.close();
  const st = await b.ws.next('gameState', (m) => m.game.connected?.white === false);
  assert.equal(st.game.status, 'active');
  const a2 = await WsClient.connect(s.base, a.http.cookie);
  const auto = await a2.next('gameState');
  assert.equal(auto.game.id, g.id);
  assert.equal(auto.game.you, 'white');
  a2.send({ t: 'rejoin', gameId: g.id });
  const rj = await a2.next('gameState');
  assert.deepEqual(rj.game.moves, ['d2d4']);
  a2.send({ t: 'resign', gameId: g.id });
  await b.ws.next('gameEnd');
  a2.close(); b.ws.close();
});
