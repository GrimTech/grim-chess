// /play/online and /play/lan: WebSocket client (lobby, seeks, private rooms, live games with server clocks).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, Flag, Handshake, Repeat, Search, Wifi, WifiOff } from 'lucide-react';
import { Board, type BoardMove } from '../../components/Board.tsx';
import { useSession } from '../../lib/session.tsx';
import { Clock } from './components/Clock.tsx';
import { GameOverDialog } from './components/GameOverDialog.tsx';
import { MoveList, MoveNav } from './components/MoveList.tsx';
import { PlayerStrip } from './components/PlayerStrip.tsx';
import { QrCode } from './components/QrCode.tsx';
import { TIME_CONTROLS, sameTc } from './components/TimeControlPicker.tsx';
import { START_FEN, applyUci, buildPgn, describeResult, other, replayUci, tcLabel, type Color } from './lib/chess.ts';
import { liveClocks, useOnline, type GameView } from './lib/online.ts';
import { usePlyKeys } from './lib/useKeys.ts';
import type { TimeControl } from './lib/useClocks.ts';

type Online = ReturnType<typeof useOnline>;

export function OnlinePlay({ mode = 'online', header, shareBase }: { mode?: 'online' | 'lan'; header?: ReactNode; shareBase?: string | null }) {
  const net = useOnline();
  const [params, setParams] = useSearchParams();
  const roomParam = params.get('room');
  const joinedParam = useRef<string | null>(null);

  useEffect(() => {
    if (!roomParam || net.conn !== 'open' || net.game?.status === 'active') return;
    if (joinedParam.current === roomParam || net.roomCode === roomParam.toUpperCase()) return;
    joinedParam.current = roomParam;
    net.joinRoom(roomParam);
  }, [roomParam, net.conn, net.game?.status, net.roomCode, net]);

  // once a game starts from a room link, drop ?room= so a reload rejoins the game instead
  useEffect(() => {
    if (net.game?.status === 'active' && roomParam) { params.delete('room'); setParams(params, { replace: true }); }
  }, [net.game?.status, roomParam, params, setParams]);

  const inGame = !!net.game;
  return (
    <div className="play-page">
      {!inGame && (
        <header className="play-header">
          <Link to="/play" className="muted">← Play</Link>
          <h1>{mode === 'lan' ? 'Play on your local network' : 'Play online'}</h1>
          <ConnBadge conn={net.conn} lobby={net.lobby} />
        </header>
      )}
      {!inGame && header}
      {net.error && (
        <div className="toast toast-danger play-inline-toast" role="alert">
          <div className="toast__body">{net.error}</div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={net.clearError}>Dismiss</button>
        </div>
      )}
      {inGame ? <OnlineGame net={net} game={net.game!} mode={mode} /> : <Lobby net={net} mode={mode} shareBase={shareBase} />}
    </div>
  );
}

function ConnBadge({ conn, lobby }: { conn: Online['conn']; lobby: Online['lobby'] }) {
  return (
    <p className="row muted" style={{ margin: 0 }}>
      {conn === 'open' ? <Wifi size={16} strokeWidth={1.75} /> : <WifiOff size={16} strokeWidth={1.75} />}
      <span>{conn === 'open' ? 'Connected' : conn === 'connecting' ? 'Connecting…' : 'Disconnected, retrying…'}</span>
      {conn === 'open' && lobby && <span>· {lobby.players} online{lobby.games != null ? ` · ${lobby.games} games` : ''}</span>}
    </p>
  );
}

function Lobby({ net, mode, shareBase }: { net: Online; mode: 'online' | 'lan'; shareBase?: string | null }) {
  const [rated, setRated] = useState(mode === 'online');
  const [roomTc, setRoomTc] = useState<TimeControl>(TIME_CONTROLS[2]);
  const [roomColor, setRoomColor] = useState<Color | 'random'>('random');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const base = shareBase ?? location.origin;
  const path = mode === 'lan' ? '/play/lan' : '/play/online';
  const link = net.roomCode ? `${base.replace(/\/$/, '')}${path}?room=${net.roomCode}` : '';
  const seeksFor = (tc: TimeControl) => net.lobby?.seeks.filter((s) => sameTc(s.tc, tc) && s.rated === rated).length ?? 0;
  const disabled = net.conn !== 'open';

  return (
    <div className="play-lobby">
      <section className="card">
        <h2 className="card__title">Quick game</h2>
        <p className="card__subtitle">Get paired with someone near your rating at the same time control.</p>
        <div className="play-tcgrid">
          {TIME_CONTROLS.map((tc) => {
            const active = sameTc(net.seeking, tc);
            const n = seeksFor(tc);
            return (
              <button key={tcLabel(tc)} type="button" className={`play-tc ${active ? 'is-seeking' : ''}`} disabled={disabled || (!!net.seeking && !active)}
                onClick={() => (active ? net.cancelSeek() : net.seek(tc, rated))} aria-pressed={active}>
                <span className="play-tc__time">{tcLabel(tc)}</span>
                <span className="play-tc__kind">{active ? 'Searching… (tap to cancel)' : tc.initial < 480 ? 'Blitz' : tc.initial < 1500 ? 'Rapid' : 'Classical'}</span>
                {n > 0 && !active && <span className="badge badge-pill badge-info">{n} waiting</span>}
              </button>
            );
          })}
        </div>
        <label className="check">
          <input type="checkbox" className="switch" checked={rated} onChange={(e) => setRated(e.target.checked)} disabled={!!net.seeking} />
          <span>Rated <span className="muted">(updates your online rating; games under 2 moves are not rated)</span></span>
        </label>
        {net.seeking && <p className="hint" role="status">Looking for an opponent for {tcLabel(net.seeking)}… the rating window widens the longer you wait.</p>}
      </section>

      <section className="card">
        <h2 className="card__title">Play a friend</h2>
        {!net.roomCode ? (
          <>
            <p className="card__subtitle">Create a private room and send the code or link.</p>
            <div className="play-setup__row">
              <div className="field">
                <label className="label" htmlFor="room-tc">Time control</label>
                <div className="select-wrap">
                  <select id="room-tc" className="select" value={tcLabel(roomTc)} onChange={(e) => setRoomTc(TIME_CONTROLS.find((t) => tcLabel(t) === e.target.value) ?? TIME_CONTROLS[2])}>
                    {TIME_CONTROLS.map((t) => <option key={tcLabel(t)} value={tcLabel(t)}>{tcLabel(t)}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="label" htmlFor="room-color">Your colour</label>
                <div className="select-wrap">
                  <select id="room-color" className="select" value={roomColor} onChange={(e) => setRoomColor(e.target.value as Color | 'random')}>
                    <option value="random">Random</option><option value="white">White</option><option value="black">Black</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="row"><button type="button" className="btn btn-primary" disabled={disabled} onClick={() => net.createRoom(roomTc, roomColor, false)}>Create room</button></div>
          </>
        ) : (
          <div className="play-room">
            <div className="stack">
              <p className="card__subtitle">Room code</p>
              <p className="play-roomcode" aria-label={`Room code ${net.roomCode.split('').join(' ')}`}>{net.roomCode}</p>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input className="input input-mono" readOnly value={link} aria-label="Room link" onFocus={(e) => e.currentTarget.select()} />
                <button type="button" className="btn btn-icon" aria-label="Copy link" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* manual copy */ } }}><Copy size={18} strokeWidth={1.75} /></button>
              </div>
              <p className="hint" role="status">{copied ? 'Link copied.' : 'Waiting for your friend to join… The game starts automatically.'}</p>
            </div>
            <QrCode text={link} size={150} label="QR code for the room link" />
          </div>
        )}
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (code.trim().length >= 4) net.joinRoom(code); }}>
          <div className="field" style={{ flex: 1 }}>
            <label className="label" htmlFor="join-code">Join with a code</label>
            <input id="join-code" className="input input-mono play-codeinput" value={code} maxLength={6} autoComplete="off" autoCapitalize="characters"
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="ABC123" />
          </div>
          <button type="submit" className="btn" style={{ alignSelf: 'flex-end' }} disabled={disabled || code.length < 4}>Join</button>
        </form>
      </section>
    </div>
  );
}

function useTicker(active: boolean) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0, last = 0;
    const f = (t: number) => { raf = requestAnimationFrame(f); if (t - last > 100) { last = t; set((x) => x + 1); } };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

function OnlineGame({ net, game, mode }: { net: Online; game: GameView; mode: 'online' | 'lan' }) {
  const navigate = useNavigate();
  const { refresh } = useSession();
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [dialog, setDialog] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const active = game.status === 'active';
  useTicker(active);
  const plies = useMemo(() => replayUci(START_FEN, game.moves), [game.moves]);
  const you: Color | 'spectator' = game.you;
  const orientation: Color = you === 'spectator' ? 'white' : you;
  const top = other(orientation);
  const shown = viewPly ?? plies.length;
  const shownFen = shown === plies.length ? game.fen : (shown === 0 ? START_FEN : plies[shown - 1].fen);
  const clocks = liveClocks(game, net.receivedAt);
  const initialMs = game.tc.initial * 1000;
  const lastMove = shown > 0 && plies[shown - 1] ? [plies[shown - 1].from, plies[shown - 1].to] as [string, string] : null;

  useEffect(() => { if (net.end && net.end.gameId === game.id) { setDialog(true); void refresh(); } }, [net.end, game.id, refresh]);
  useEffect(() => { setViewPly(null); }, [game.id]);

  const onMove = (m: BoardMove) => {
    if (!active || you === 'spectator' || game.turn !== you || viewPly !== null) return false;
    const uci = m.from + m.to + (m.promotion ?? '');
    const p = applyUci(game.fen, uci);
    if (!p) return false;
    net.move(p.uci, p.fen);
  };

  usePlyKeys(shown, plies.length, (p) => setViewPly(p >= plies.length ? null : p));

  const result = game.result ? { result: game.result, reason: game.reason ?? '' } : null;
  const pgn = buildPgn(START_FEN, plies, {
    Event: `Grim Chess ${mode === 'lan' ? 'LAN' : 'online'} ${game.rated ? 'rated' : 'casual'} game`, Site: mode === 'lan' ? 'Grim Chess LAN' : 'Grim Chess',
    White: game.white.name, Black: game.black.name, WhiteElo: String(game.white.rating), BlackElo: String(game.black.rating),
    TimeControl: `${game.tc.initial}+${game.tc.increment}`, Termination: game.reason,
  }, game.result ?? '*');
  const review = () => navigate('/review', { state: { pgn, color: you === 'spectator' ? 'white' : you, title: `${game.white.name} vs ${game.black.name}` } });
  const rc = game.ratingChange ?? net.end?.ratingChange;
  const yourDelta = rc && you !== 'spectator' ? rc[you] : null;
  const tone = result && you !== 'spectator' ? (result.result === '1/2-1/2' ? 'draw' : (result.result === '1-0') === (you === 'white') ? 'win' : 'loss') : undefined;
  const oppColor: Color | null = you === 'spectator' ? null : other(you);
  const conn = (c: Color) => game.connected && !game.connected[c] && active ? <span className="badge badge-warning">disconnected</span> : null;

  return (
    <div className="play-game">
      <div className="layout-board">
        <div className="layout-board__board">
          <PlayerStrip name={game[top].name} rating={game[top].rating} fen={shownFen} color={top} badge={conn(top)}
            clock={<Clock ms={clocks[top]} running={active && game.turn === top} initialMs={initialMs} label={top} />} />
          <Board fen={shownFen} orientation={orientation} lastMove={lastMove}
            movable={active && you !== 'spectator' && viewPly === null && game.turn === you ? you : 'none'} onMove={onMove} />
          <PlayerStrip name={game[orientation].name} rating={game[orientation].rating} fen={shownFen} color={orientation} badge={conn(orientation)}
            clock={<Clock ms={clocks[orientation]} running={active && game.turn === orientation} initialMs={initialMs} label={orientation} />} />
        </div>
        <aside className="layout-board__side">
          <div className="card play-status">
            <div className="row">
              <span className={`badge ${game.rated ? 'badge-accent' : 'badge-outline'}`}>{game.rated ? 'Rated' : 'Casual'}</span>
              <span className="badge badge-outline">{tcLabel(game.tc)}</span>
              <span className="badge badge-outline">{mode === 'lan' ? 'LAN' : 'Online'}</span>
              {you === 'spectator' && <span className="badge badge-info">Spectating</span>}
              {net.conn !== 'open' && <span className="badge badge-warning">Reconnecting…</span>}
            </div>
            <p className="play-status__text" role="status">
              {result ? describeResult(result, you === 'spectator' ? undefined : you) + (yourDelta != null ? ` (${yourDelta >= 0 ? '+' : ''}${yourDelta})` : '')
                : viewPly !== null ? 'Viewing an earlier position.' : you === 'spectator' ? `${game.turn === 'white' ? 'White' : 'Black'} to move.`
                : game.turn === you ? 'Your move.' : 'Waiting for your opponent…'}
            </p>
            {active && net.drawOfferBy && oppColor && net.drawOfferBy === oppColor && (
              <div className="row">
                <span>Your opponent offers a draw.</span>
                <button type="button" className="btn btn-sm btn-primary" onClick={net.acceptDraw}>Accept</button>
                <button type="button" className="btn btn-sm" onClick={net.declineDraw}>Decline</button>
              </div>
            )}
            {active && net.drawOfferBy && net.drawOfferBy === you && <p className="hint">Draw offered. Waiting for a reply…</p>}
            {!active && net.rematchOffered && <p className="hint">Your opponent wants a rematch.</p>}
          </div>
          <div className="card card-flush panel-grow">
            <MoveList sans={plies.map((p) => p.san)} current={shown} onSelect={(p) => setViewPly(p >= plies.length ? null : p)} startFen={START_FEN} result={game.result} />
            <MoveNav current={shown} total={plies.length} onSelect={(p) => setViewPly(p >= plies.length ? null : p)} />
          </div>
          <div className="row play-actions">
            {active && you !== 'spectator' ? (
              confirmResign ? (
                <>
                  <span>Resign this game?</span>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => { setConfirmResign(false); net.resign(); }}>Yes, resign</button>
                  <button type="button" className="btn btn-sm" onClick={() => setConfirmResign(false)}>Cancel</button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-sm" onClick={net.offerDraw} disabled={net.drawOfferBy === you}><Handshake size={16} strokeWidth={1.75} /> Offer draw</button>
                  <button type="button" className="btn btn-sm btn-danger-soft" onClick={() => setConfirmResign(true)}><Flag size={16} strokeWidth={1.75} /> Resign</button>
                </>
              )
            ) : (
              <>
                {you !== 'spectator' && !active && <button type="button" className="btn btn-sm btn-primary" onClick={net.rematch}><Repeat size={16} strokeWidth={1.75} /> {net.rematchOffered ? 'Accept rematch' : 'Rematch'}</button>}
                {!active && <button type="button" className="btn btn-sm" onClick={review}><Search size={16} strokeWidth={1.75} /> Review game</button>}
                <button type="button" className="btn btn-sm" onClick={net.leaveGame}>Back to lobby</button>
              </>
            )}
          </div>
        </aside>
      </div>
      <GameOverDialog open={dialog && !active} onClose={() => setDialog(false)} tone={tone}
        title={result ? (tone === 'win' ? 'You won' : tone === 'loss' ? 'You lost' : tone === 'draw' ? 'Draw' : describeResult(result)) : ''}
        subtitle={result ? describeResult(result, you === 'spectator' ? undefined : you) : undefined}
        actions={<>
          <button type="button" className="btn" onClick={() => { setDialog(false); net.leaveGame(); }}>Back to lobby</button>
          {you !== 'spectator' && <button type="button" className="btn" onClick={() => { setDialog(false); net.rematch(); }}>{net.rematchOffered ? 'Accept rematch' : 'Rematch'}</button>}
          <button type="button" className="btn btn-primary" onClick={review}>Review game</button>
        </>}>
        {yourDelta != null && game.rated && <p>Online rating {yourDelta >= 0 ? '+' : ''}{yourDelta}</p>}
        {!game.rated && <p className="hint">Casual game: ratings unchanged. The game is saved to your history.</p>}
      </GameOverDialog>
    </div>
  );
}
