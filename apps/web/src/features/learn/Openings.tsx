// Opening repertoire trainer: build a repertoire from the Lichess openings list, drill lines with FSRS.
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Play } from 'lucide-react';
import type { SrsCard } from '@grim/core';
import { Board, type BoardMove } from '../../components/Board.tsx';
import { api } from '../../lib/api.ts';
import { applySan, getJson, lsGet, lsSet, sameSan, sanTokens, useTimeouts } from './util.ts';
import defaults from './default-repertoire.json';

export interface RepLine { id: string; color: 'white' | 'black'; eco: string; name: string; pgn: string }
interface OpeningEntry { eco: string; name: string; pgn: string }
const KEY = 'gc_repertoire';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
export const cardIdFor = (l: RepLine) => `opening:${l.color}:${l.id}`;

function validLine(pgn: string): string[] | null {
  let fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const sans = sanTokens(pgn);
  for (const s of sans) { const r = applySan(fen, s); if (!r) return null; fen = r.fen; }
  return sans.length ? sans : null;
}

function LineDrill({ line, onDone }: { line: RepLine; onDone: (mistakes: number) => void }) {
  const later = useTimeouts();
  const sans = useMemo(() => validLine(line.pgn) ?? [], [line.pgn]);
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const [fen, setFen] = useState(START);
  const [ply, setPly] = useState(0);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [hint, setHint] = useState<[string, string, 'green'] | null>(null);
  const [finished, setFinished] = useState(false);
  const learnerTurn = (p: number) => (p % 2 === 0) === (line.color === 'white');

  useEffect(() => { setFen(START); setPly(0); setLast(null); setMistakes(0); setHint(null); setFinished(false); }, [line.id]);
  useEffect(() => {
    if (finished) return;
    if (ply >= sans.length) { setFinished(true); onDone(mistakes); return; }
    if (!learnerTurn(ply)) {
      later(() => { const r = applySan(fen, sans[ply]); if (r) { setFen(r.fen); setLast([r.from, r.to]); setPly(ply + 1); } }, 450);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ply, sans, finished]);

  const onMove = (m: BoardMove) => {
    if (finished || !learnerTurn(ply)) return false;
    if (!sameSan(m.san, sans[ply])) {
      setMistakes((x) => x + 1);
      const r = applySan(fen, sans[ply]);
      if (r) setHint([r.from, r.to, 'green']);
      return false;
    }
    setHint(null); setFen(m.fenAfter); setLast([m.from, m.to]); setPly(ply + 1);
    return true;
  };
  const moveText = sans.slice(0, ply).map((s, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${s}` : s)).join(' ');
  return (
    <div className="lr-train">
      <div className="lr-train__board"><div className="lr-board" data-state={finished ? 'correct' : hint ? 'wrong' : undefined}>
        <Board fen={fen} orientation={line.color} movable={finished ? 'none' : line.color} onMove={onMove} lastMove={last} arrows={hint ? [hint] : []} />
      </div></div>
      <aside className="lr-train__side stack">
        <p className="lr-eyebrow muted">{line.eco} · you play {line.color}</p>
        <h2>{line.name}</h2>
        <p className="lr-notation">{moveText || '…'}</p>
        <p role="status">{finished ? (mistakes ? `Line complete with ${mistakes} mistake${mistakes > 1 ? 's' : ''}.` : 'Perfect recall.') : hint ? 'Not your repertoire move: the green arrow shows it.' : 'Play your repertoire move.'}</p>
      </aside>
    </div>
  );
}

export function OpeningsPage() {
  const [params] = useSearchParams();
  const reviewOnly = params.get('mode') === 'review';
  const [rep, setRep] = useState<RepLine[]>(() => lsGet<RepLine[]>(KEY, (defaults.lines as RepLine[])));
  const [catalog, setCatalog] = useState<OpeningEntry[] | null>(null);
  const [q, setQ] = useState('');
  const [color, setColor] = useState<'white' | 'black'>('white');
  const [due, setDue] = useState<SrsCard[]>([]);
  const [current, setCurrent] = useState<RepLine | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const seen = lsGet<string[]>('gc_opening_seen', []);
  const save = (r: RepLine[]) => { setRep(r); lsSet(KEY, r); };

  useEffect(() => {
    void getJson<OpeningEntry[]>('/api/curriculum/openings').then((c) => setCatalog(Array.isArray(c) && c.length ? c : (defaults.lines as OpeningEntry[])));
    api.srsDue('opening').then(setDue).catch(() => setDue([]));
  }, []);

  const dueIds = new Set(due.map((c) => c.id));
  const queue = rep.filter((l) => dueIds.has(cardIdFor(l)));
  const fresh = rep.filter((l) => !seen.includes(cardIdFor(l)));
  const nextLine = () => {
    const pick = queue[0] ?? (reviewOnly ? null : fresh[0] ?? rep[Math.floor(Math.random() * rep.length)]);
    setMsg(pick ? null : 'No opening lines are due. Come back tomorrow, or drill without review mode.');
    setCurrent(pick ?? null);
  };

  const onDone = async (mistakes: number) => {
    if (!current) return;
    const grade = (mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1) as 1 | 2 | 3;
    const id = cardIdFor(current);
    lsSet('gc_opening_seen', [...new Set([...seen, id])]);
    try {
      const card = await api.srsReview(id, 'opening', grade);
      setDue((d) => d.filter((c) => c.id !== id));
      setMsg(`Next review of this line: ${new Date(card.due).toLocaleDateString()}.`);
    } catch { setMsg('Could not save the review (offline?).'); }
  };

  const results = useMemo(() => {
    if (!catalog || q.trim().length < 2) return [];
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return catalog.filter((o) => words.every((w) => `${o.eco} ${o.name}`.toLowerCase().includes(w))).slice(0, 25);
  }, [catalog, q]);
  const add = (o: OpeningEntry) => {
    if (!validLine(o.pgn)) return;
    const id = `${slug(o.name)}-${o.eco.toLowerCase()}-${sanTokens(o.pgn).length}`;
    if (rep.some((l) => l.id === id && l.color === color)) return;
    save([...rep, { id, color, eco: o.eco, name: o.name, pgn: o.pgn }]);
  };

  return (
    <div className="lr-page">
      <header className="lr-head">
        <div><p className="lr-eyebrow muted">Train</p><h1>Opening repertoire</h1></div>
        <div className="row">
          <span className="badge badge-lg badge-accent">{queue.length} due</span>
          <button className="btn btn-primary" onClick={nextLine}><Play aria-hidden="true" /> {queue.length ? 'Review due lines' : reviewOnly ? 'Check for due lines' : 'Drill a line'}</button>
        </div>
      </header>
      {msg && <p className="lr-note" role="status">{msg}</p>}
      {current && <LineDrill key={current.id + current.color} line={current} onDone={onDone} />}
      {current && <div className="row"><button className="btn" onClick={nextLine}>Next line</button><button className="btn btn-ghost" onClick={() => setCurrent(null)}>Close</button></div>}

      <section className="layout-dashboard lr-section">
        {(['white', 'black'] as const).map((c) => (
          <div key={c} className="card span-6">
            <h2 className="card__title">As {c}</h2>
            <ul className="lr-list">
              {rep.filter((l) => l.color === c).map((l) => (
                <li key={l.id} className="lr-list__row">
                  <button className="lr-list__item" onClick={() => setCurrent(l)}>
                    <span><strong>{l.eco}</strong> {l.name}<br /><span className="muted lr-notation-sm">{l.pgn}</span></span>
                    <span className={`badge ${dueIds.has(cardIdFor(l)) ? 'badge-warning' : seen.includes(cardIdFor(l)) ? 'badge-success' : 'badge-outline'}`}>{dueIds.has(cardIdFor(l)) ? 'due' : seen.includes(cardIdFor(l)) ? 'learned' : 'new'}</span>
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" aria-label={`Remove ${l.name}`} onClick={() => save(rep.filter((x) => x !== l))}><Trash2 aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="card span-12">
          <h2 className="card__title">Add lines</h2>
          <div className="row">
            <input className="input" style={{ maxWidth: 360 }} placeholder="Search openings, e.g. Najdorf or B90" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search openings" />
            <div className="segmented" role="group" aria-label="Colour">
              <button aria-pressed={color === 'white'} onClick={() => setColor('white')}>for White</button>
              <button aria-pressed={color === 'black'} onClick={() => setColor('black')}>for Black</button>
            </div>
            {rep.length !== defaults.lines.length && <button className="btn btn-ghost btn-sm" onClick={() => save(defaults.lines as RepLine[])}>Reset to default</button>}
          </div>
          <ul className="lr-list">
            {results.map((o) => (
              <li key={o.eco + o.name + o.pgn} className="lr-list__row">
                <span><strong>{o.eco}</strong> {o.name}<br /><span className="muted lr-notation-sm">{o.pgn}</span></span>
                <button className="btn btn-sm" onClick={() => add(o)}><Plus aria-hidden="true" /> Add</button>
              </li>
            ))}
          </ul>
          <p className="muted">Keep the repertoire small and understood. Lines are scheduled with FSRS: perfect recall = Good, one slip = Hard, more = Again.</p>
        </div>
      </section>
    </div>
  );
}
