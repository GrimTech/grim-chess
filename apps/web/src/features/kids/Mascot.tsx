// "Rookie": the kids-track guide. An original character, a small round rook-tower with a sprout on top. Pure SVG.
export type Mood = 'happy' | 'cheer' | 'think' | 'oops' | 'sleep';

export function Mascot({ mood = 'happy', size = 96, className = '' }: { mood?: Mood; size?: number; className?: string }) {
  const eyes = mood === 'sleep'
    ? <g stroke="#3a2a12" strokeWidth="3.5" strokeLinecap="round" fill="none"><path d="M40 57 q5 4 10 0" /><path d="M70 57 q5 4 10 0" /></g>
    : mood === 'cheer'
      ? <g stroke="#3a2a12" strokeWidth="4" strokeLinecap="round" fill="none"><path d="M40 59 q5 -7 10 0" /><path d="M70 59 q5 -7 10 0" /></g>
      : <g fill="#3a2a12"><ellipse cx="45" cy="57" rx="5" ry={mood === 'oops' ? 6.5 : 6} /><ellipse cx="75" cy="57" rx="5" ry={mood === 'oops' ? 6.5 : 6} />
        <circle cx="47" cy="54.5" r="1.8" fill="#fff" /><circle cx="77" cy="54.5" r="1.8" fill="#fff" /></g>;
  const mouth = mood === 'oops'
    ? <ellipse cx="60" cy="73" rx="5" ry="4" fill="#7a3b1d" />
    : mood === 'think'
      ? <path d="M53 74 h14" stroke="#7a3b1d" strokeWidth="3.5" strokeLinecap="round" />
      : mood === 'sleep'
        ? <path d="M55 73 q5 3 10 0" stroke="#7a3b1d" strokeWidth="3" strokeLinecap="round" fill="none" />
        : <path d={mood === 'cheer' ? 'M48 69 q12 14 24 0 z' : 'M50 70 q10 9 20 0'} stroke="#7a3b1d" strokeWidth="3.5" strokeLinecap="round" fill={mood === 'cheer' ? '#c2410c' : 'none'} />;
  const armL = mood === 'cheer' ? 'M24 70 q-12 -10 -10 -26' : mood === 'think' ? 'M24 74 q-8 -2 -2 -14' : 'M24 74 q-12 6 -12 16';
  const armR = mood === 'cheer' ? 'M96 70 q12 -10 10 -26' : 'M96 74 q12 6 12 16';
  return (
    <svg className={`kid-mascot kid-mascot--${mood} ${className}`} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Rookie, your chess buddy">
      {/* sprout */}
      <path d="M60 14 v10" stroke="#2f8a57" strokeWidth="4" strokeLinecap="round" />
      <path d="M60 18 q-12 -10 -18 -2 q10 6 18 2z" fill="#46a96f" />
      <path d="M60 15 q10 -12 18 -4 q-8 8 -18 4z" fill="#5bb98b" />
      {/* shadow */}
      <ellipse cx="60" cy="112" rx="34" ry="5" fill="rgb(0 0 0 / .12)" />
      {/* battlements */}
      <path d="M26 30 h14 v8 h7 v-8 h26 v8 h7 v-8 h14 v22 h-68z" fill="#f2b52c" stroke="#a46a07" strokeWidth="3" strokeLinejoin="round" />
      {/* body */}
      <path d="M28 48 h64 l-4 52 q0 8 -8 8 h-40 q-8 0 -8 -8z" fill="#ffc94a" stroke="#a46a07" strokeWidth="3" strokeLinejoin="round" />
      <path d="M36 92 h48" stroke="#e7a91f" strokeWidth="3" strokeLinecap="round" />
      {/* arms */}
      <path d={armL} stroke="#a46a07" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d={armR} stroke="#a46a07" strokeWidth="5" strokeLinecap="round" fill="none" />
      {/* cheeks */}
      <circle cx="37" cy="68" r="5" fill="#ff8f6b" opacity=".55" />
      <circle cx="83" cy="68" r="5" fill="#ff8f6b" opacity=".55" />
      {eyes}
      {mouth}
      {mood === 'think' && <g fill="#7ce2fe" stroke="#1d6e8a" strokeWidth="2"><circle cx="100" cy="30" r="4" /><circle cx="108" cy="18" r="6" /></g>}
      {mood === 'sleep' && <text x="92" y="30" fontSize="16" fontWeight="700" fill="#1d6e8a">z</text>}
    </svg>
  );
}

/** Mascot with a speech bubble. */
export function Buddy({ mood, children, size = 84 }: { mood?: Mood; children: React.ReactNode; size?: number }) {
  return (
    <div className="kid-buddy">
      <Mascot mood={mood} size={size} />
      <div className="kid-bubble">{children}</div>
    </div>
  );
}
