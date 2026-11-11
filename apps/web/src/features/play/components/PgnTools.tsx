// FEN / PGN import and export.
import { useState } from 'react';
import { Copy, Download, Upload } from 'lucide-react';
import { downloadText, parsePgnOrFen, type ParsedGame } from '../lib/chess.ts';

export function PgnTools({ fen, pgn, onImport, filename = 'grim-chess.pgn' }: {
  fen: string; pgn: string; onImport?: (g: ParsedGame) => void; filename?: string;
}) {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const copy = async (what: string, label: string) => {
    try { await navigator.clipboard.writeText(what); setMsg({ kind: 'ok', text: `${label} copied.` }); }
    catch { setMsg({ kind: 'err', text: 'Clipboard not available; select the text and copy it manually.' }); }
  };
  const load = () => {
    try { const g = parsePgnOrFen(text); onImport?.(g); setMsg({ kind: 'ok', text: g.plies.length ? `Loaded ${g.plies.length} moves.` : 'Position loaded.' }); setText(''); }
    catch (e) { setMsg({ kind: 'err', text: `Could not read that: ${(e as Error).message}` }); }
  };
  return (
    <div className="stack play-pgntools">
      <div className="field">
        <label className="label" htmlFor="pgn-fen">FEN</label>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input id="pgn-fen" className="input input-mono" readOnly value={fen} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="btn btn-icon" aria-label="Copy FEN" onClick={() => copy(fen, 'FEN')}><Copy size={18} strokeWidth={1.75} /></button>
        </div>
      </div>
      <div className="row">
        <button type="button" className="btn btn-sm" onClick={() => copy(pgn, 'PGN')}><Copy size={16} strokeWidth={1.75} /> Copy PGN</button>
        <button type="button" className="btn btn-sm" onClick={() => downloadText(filename, pgn)}><Download size={16} strokeWidth={1.75} /> Download PGN</button>
      </div>
      {onImport && (
        <div className="field">
          <label className="label" htmlFor="pgn-import">Import PGN or FEN</label>
          <textarea id="pgn-import" className="textarea input-mono" rows={4} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={'1. e4 e5 2. Nf3 Nc6 …'} />
          <div className="row">
            <button type="button" className="btn btn-sm btn-primary" onClick={load} disabled={!text.trim()}><Upload size={16} strokeWidth={1.75} /> Load</button>
          </div>
        </div>
      )}
      {msg && <p className={msg.kind === 'err' ? 'error' : 'hint'} role="status">{msg.text}</p>}
    </div>
  );
}
