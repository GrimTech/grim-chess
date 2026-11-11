// Engine panel (design system `.engine` / `.engine-line`): top N principal variations in SAN.
import type { EngineLine } from '../../../lib/engine.ts';
import { formatScore, turnOf, uciToSanLine, moveLabel } from '../lib/chess.ts';
import { figurine } from './MoveList.tsx';

export function EngineLines({ fen, lines, on, onToggle, onPlay, thinking }: {
  fen: string; lines: EngineLine[]; on: boolean; onToggle?: (on: boolean) => void; onPlay?: (uci: string) => void; thinking?: boolean;
}) {
  const turn = turnOf(fen);
  const top = lines[0];
  const fullmove = Number(fen.split(' ')[5] || 1);
  return (
    <div className="engine">
      <div className="engine__header">
        <span className="engine__eval">{on ? formatScore(top, true, turn) : '–'}</span>
        <span>{on ? (top ? `Stockfish 19 · depth ${top.depth}${thinking ? '…' : ''}` : 'Starting engine…') : 'Engine off'}</span>
        {onToggle && (
          <label className="row" style={{ marginLeft: 'auto', gap: 'var(--size-1h, 6px)' }}>
            <span className="sr-only">Engine</span>
            <input type="checkbox" role="switch" className="switch" checked={on} onChange={(e) => onToggle(e.target.checked)} aria-label="Engine on" />
          </label>
        )}
      </div>
      {on && lines.map((l) => {
        const sans = uciToSanLine(fen, l.pv, 10);
        const score = formatScore(l, true, turn);
        const whiteBetter = !score.startsWith('−') && !score.startsWith('-');
        const startLabel = turn === 'black' ? `${fullmove}...` : '';
        return (
          <div key={l.multipv} className="engine-line" role="button" tabIndex={0}
            onClick={() => l.pv[0] && onPlay?.(l.pv[0])} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && l.pv[0]) onPlay?.(l.pv[0]); }}>
            <span className={`engine-line__score ${whiteBetter ? '' : 'is-black'}`}>{score}</span>
            <span className="engine-line__pv">
              {startLabel && `${startLabel} `}
              {sans.map((s, i) => {
                const label = moveLabel(fen, i);
                return <span key={i}>{(turn === 'white' ? i % 2 === 0 : i % 2 === 1) ? `${label} ` : ''}{figurine(s)} </span>;
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
