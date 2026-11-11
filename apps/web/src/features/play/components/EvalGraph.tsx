// Eval graph (SVG area chart of White's win%), clickable to jump to a ply. Mistakes are marked.
import { useRef } from 'react';
import { winPercentFromCp, type MoveClass } from '@grim/core';

export function EvalGraph({ evals, current, onSelect, classes, height = 96 }: {
  /** White-POV centipawns per position, index 0 = start */ evals: (number | null)[];
  current: number; onSelect: (ply: number) => void;
  /** class per ply (index i = move leading to position i+1) */ classes?: (MoveClass | null | undefined)[];
  height?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const W = 600, H = height;
  const n = Math.max(1, evals.length - 1);
  const x = (i: number) => (i / n) * W;
  const y = (cp: number | null) => H - (winPercentFromCp(cp ?? 0) / 100) * H;
  const pts = evals.map((e, i) => `${x(i).toFixed(1)},${y(e).toFixed(1)}`);
  const area = `M0,${H} L${pts.join(' L')} L${W},${H} Z`;
  const pick = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    onSelect(Math.max(0, Math.min(evals.length - 1, Math.round(((clientX - r.left) / r.width) * n))));
  };
  return (
    <svg ref={ref} className="play-evalgraph" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
      aria-label="Evaluation graph. Click to jump to a move." onClick={(e) => pick(e.clientX)}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') onSelect(Math.max(0, current - 1)); if (e.key === 'ArrowRight') onSelect(Math.min(evals.length - 1, current + 1)); }}
      tabIndex={0}>
      <rect x="0" y="0" width={W} height={H} className="play-evalgraph__bg" />
      <path d={area} className="play-evalgraph__area" />
      <line x1="0" x2={W} y1={H / 2} y2={H / 2} className="play-evalgraph__mid" />
      {classes?.map((c, i) => (c === 'mistake' || c === 'blunder' || c === 'inaccuracy') ? (
        <circle key={i} cx={x(i + 1)} cy={y(evals[i + 1] ?? 0)} r={c === 'blunder' ? 5 : 4} className={`play-evalgraph__dot is-${c}`}>
          <title>{`Move ${Math.floor(i / 2) + 1}: ${c}`}</title>
        </circle>
      ) : null)}
      <line x1={x(current)} x2={x(current)} y1="0" y2={H} className="play-evalgraph__cursor" />
    </svg>
  );
}
