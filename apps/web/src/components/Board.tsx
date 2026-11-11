// Shared chessboard. Wraps lichess chessground; legality via chess.js.
// ALL features must use this component for boards. Do not fork it; extend via props.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Config } from '@lichess-org/chessground/config';
import type { Key } from '@lichess-org/chessground/types';
import type { DrawShape } from '@lichess-org/chessground/draw';
import { Chess, SQUARES, type Square } from 'chess.js';
import '@lichess-org/chessground/assets/chessground.base.css';
import '@lichess-org/chessground/assets/chessground.cburnett.css';
import './board.css';

export type Color = 'white' | 'black';
export interface BoardMove { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n'; san: string; fenAfter: string }
export type BoardArrow = [string, string, ('green' | 'red' | 'blue' | 'yellow')?];

export interface BoardProps {
  fen: string;
  orientation?: Color;
  /** Which side the user may move. 'none' = view only. 'turn' = whoever is to move (hotseat). */
  movable?: Color | 'both' | 'turn' | 'none';
  /** Called after a legal user move. Return false to reject (board snaps back). */
  onMove?: (m: BoardMove) => boolean | void;
  lastMove?: [string, string] | null;
  arrows?: BoardArrow[];
  highlights?: string[];
  /** Show coordinates on the board edge */
  coordinates?: boolean;
  /** When true, promotion always becomes a queen without asking */
  autoQueen?: boolean;
  className?: string;
  /** Allow free piece movement (setup / variants). Bypasses legality. */
  free?: boolean;
  onSquareClick?: (sq: string) => void;
}

function destsFor(chess: Chess): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>();
  for (const s of SQUARES) {
    const ms = chess.moves({ square: s as Square, verbose: true });
    if (ms.length) dests.set(s as Key, ms.map((m) => m.to as Key));
  }
  return dests;
}

export function Board(props: BoardProps) {
  const { fen, orientation = 'white', movable = 'none', onMove, lastMove, arrows, highlights, coordinates = true, autoQueen = false, className, free, onSquareClick } = props;
  const el = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string; color: Color } | null>(null);
  const onMoveRef = useRef(onMove); onMoveRef.current = onMove;
  const clickRef = useRef(onSquareClick); clickRef.current = onSquareClick;

  const chess = useMemo(() => { try { return new Chess(fen); } catch { return null; } }, [fen]);

  const config = (): Config => {
    const turn: Color = chess?.turn() === 'b' ? 'black' : 'white';
    const movColor: Color | 'both' | undefined =
      movable === 'none' ? undefined : movable === 'turn' ? turn : movable;
    const shapes: DrawShape[] = [
      ...(arrows ?? []).map(([o, d, c]) => ({ orig: o as Key, dest: d as Key, brush: c ?? 'green' })),
      ...(highlights ?? []).map((s) => ({ orig: s as Key, brush: 'yellow' })),
    ];
    return {
      fen, orientation, turnColor: turn, coordinates,
      check: chess?.inCheck() ? turn : false,
      lastMove: lastMove ? (lastMove as Key[]) : undefined,
      // chessground binds input events only if viewOnly is false when it is created, so a board that can
      // become movable later (it has onMove) must never be viewOnly; movable.color undefined blocks moves.
      viewOnly: movable === 'none' && !free && !onMove,
      movable: free
        ? { free: true, color: 'both' }
        : { free: false, color: movColor, dests: chess && movColor ? destsFor(chess) : new Map(), showDests: true },
      premovable: { enabled: false },
      draggable: { enabled: true, showGhost: true },
      highlight: { lastMove: true, check: true },
      animation: { enabled: true, duration: 180 },
      drawable: { enabled: true, autoShapes: shapes },
      events: {
        select: (k) => clickRef.current?.(k),
        move: (orig, dest) => {
          if (free || !chess) return;
          const piece = chess.get(orig as Square);
          const isPromo = piece?.type === 'p' && (dest[1] === '8' || dest[1] === '1');
          if (isPromo && !autoQueen) { setPromo({ from: orig, to: dest, color: piece!.color === 'w' ? 'white' : 'black' }); return; }
          finish(orig, dest, isPromo ? 'q' : undefined);
        },
      },
    };
  };

  const finish = (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n') => {
    if (!chess) return;
    const c = new Chess(chess.fen());
    let mv;
    try { mv = c.move({ from, to, promotion }); } catch { mv = null; }
    if (!mv) { api.current?.set(config()); return; }
    const ok = onMoveRef.current?.({ from, to, promotion, san: mv.san, fenAfter: c.fen() });
    if (ok === false) api.current?.set(config());
  };

  useEffect(() => {
    if (!el.current) return;
    api.current = Chessground(el.current, config());
    return () => { api.current?.destroy(); api.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { api.current?.set(config()); });

  return (
    <div className={`board-wrap ${className ?? ''}`}>
      <div className="board-aspect"><div ref={el} className="cg-host" /></div>
      {promo && (
        <div className="promo-overlay" role="dialog" aria-label="Choose promotion piece">
          {(['q', 'r', 'b', 'n'] as const).map((p) => (
            <button key={p} className="promo-piece"
              aria-label={({ q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' })[p]}
              onClick={() => { const pr = promo; setPromo(null); finish(pr.from, pr.to, p); }}>
              {(promo.color === 'white' ? { q: '♕', r: '♖', b: '♗', n: '♘' } : { q: '♛', r: '♜', b: '♝', n: '♞' })[p]}
            </button>
          ))}
          <button className="promo-cancel" onClick={() => { setPromo(null); api.current?.set(config()); }}>Cancel</button>
        </div>
      )}
    </div>
  );
}
