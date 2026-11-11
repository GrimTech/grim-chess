// Bot level picker: one tile per BOT_LEVELS entry with persona, rating and an honest description.
import { BOT_LEVELS, type BotLevel } from '../../../lib/engine.ts';

export function BotPicker({ value, onChange, kidsOnly, levels = BOT_LEVELS }: {
  value: number; onChange: (id: number) => void; kidsOnly?: boolean; levels?: BotLevel[];
}) {
  const list = kidsOnly ? levels.filter((l) => l.kidsFriendly) : levels;
  const sel = list.find((l) => l.id === value) ?? list[0];
  return (
    <div className="stack play-botpicker">
      <div className="play-botgrid" role="radiogroup" aria-label="Computer opponent">
        {list.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={l.id === sel?.id} aria-label={`${l.name}, about ${l.rating}`}
            className={`play-bot ${l.id === sel?.id ? 'is-selected' : ''}`} onClick={() => onChange(l.id)}>
            <span className="play-bot__avatar" aria-hidden="true">{l.name.replace(/^The /, '')[0]}</span>
            <span className="play-bot__name">{l.name}</span>
            <span className="play-bot__rating">{l.rating}{l.id === BOT_LEVELS[BOT_LEVELS.length - 1].id ? '+' : ''}</span>
          </button>
        ))}
      </div>
      {sel && (
        <div className="card card-sunken play-bot-detail" aria-live="polite">
          <div className="row">
            <strong>{sel.name}</strong>
            <span className="badge badge-outline">~{sel.rating}</span>
            <span className={`badge ${sel.engine === 'grim' ? 'badge-brass' : 'badge-info'}`}>{sel.engine === 'grim' ? 'Grim engine (human-like)' : 'Stockfish 19'}</span>
            {sel.kidsFriendly && <span className="badge badge-success">Kids</span>}
          </div>
          <p className="hint" style={{ margin: 0 }}>{sel.description}</p>
          <p className="hint" style={{ margin: 0 }}>
            Rating ±{sel.rd} uncertainty. {sel.engine === 'grim'
              ? 'Heuristic estimate, not yet calibrated against rated humans.'
              : 'Stockfish’s UCI_Elo is calibrated against engines at blitz, not FIDE humans.'}
          </p>
        </div>
      )}
    </div>
  );
}
