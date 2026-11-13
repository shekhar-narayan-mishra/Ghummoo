/* Shared vector parts for Ghumo's original illustrated scenes. All scenes use a 1600×900
   viewBox. Animated layers are plain <g> elements tagged with data attributes that the motion
   hook reads (see motion/useSceneMotion.js):

     data-depth="0..1"  parallax depth (0 = sky, 1 = nearest foreground)
     data-drift         slow horizontal drift (clouds, kites, mist)
     data-wave          gentle horizontal water movement
     data-bob           boats bobbing
     data-draw          a path that draws itself with scroll (roads)
     data-sun           a light overlay whose opacity follows scroll (changing sunlight)
     data-rise          sun/moon that rises with scroll
   Without JavaScript or with reduced motion, every scene is a complete still image. */

export const W = 1600;
export const H = 900;

export function Sky({ id, top, bottom, mid }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          {mid && <stop offset="0.55" stopColor={mid} />}
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id})`} />
    </>
  );
}

export function Sun({ x, y, r = 80, fill = '#FFF4E6', glow = '#FFE0C2' }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 1.9} fill={glow} opacity="0.35" />
      <circle cx={x} cy={y} r={r} fill={fill} />
    </g>
  );
}

export function Cloud({ x, y, s = 1, fill = '#FFFFFF', o = 0.9 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} opacity={o}>
      <ellipse cx="0" cy="0" rx="78" ry="24" />
      <ellipse cx="-44" cy="6" rx="50" ry="20" />
      <ellipse cx="50" cy="4" rx="56" ry="21" />
      <ellipse cx="6" cy="-18" rx="44" ry="26" />
    </g>
  );
}

export function Birds({ x, y, s = 1, stroke = '#5A3E32' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" opacity="0.7">
      <path d="M0 0 q10 -10 20 0 q10 -10 20 0" />
      <path d="M50 -24 q8 -8 16 0 q8 -8 16 0" />
      <path d="M-34 -30 q7 -7 14 0 q7 -7 14 0" />
    </g>
  );
}

export function Pine({ x, y, h = 120, fill = '#3E3129' }) {
  const w = h * 0.36;
  return (
    <g fill={fill}>
      <rect x={x - 4} y={y - h * 0.14} width="8" height={h * 0.16} />
      <path d={`M${x} ${y - h} L${x + w * 0.62} ${y - h * 0.55} L${x - w * 0.62} ${y - h * 0.55} Z`} />
      <path d={`M${x} ${y - h * 0.78} L${x + w * 0.85} ${y - h * 0.3} L${x - w * 0.85} ${y - h * 0.3} Z`} />
      <path d={`M${x} ${y - h * 0.55} L${x + w} ${y - h * 0.1} L${x - w} ${y - h * 0.1} Z`} />
    </g>
  );
}

export function Palm({ x, y, h = 260, lean = 1, trunk = '#6B4A32', leaf = '#2F6B4F' }) {
  const tx = x + 40 * lean;
  const ty = y - h;
  return (
    <g>
      <path d={`M${x} ${y} Q${x + 10 * lean} ${y - h * 0.5} ${tx} ${ty}`} stroke={trunk} strokeWidth="14" fill="none" strokeLinecap="round" />
      <g fill={leaf}>
        <path d={`M${tx} ${ty} q-90 -20 -150 40 q70 -30 150 -40`} />
        <path d={`M${tx} ${ty} q90 -20 150 40 q-70 -30 -150 -40`} />
        <path d={`M${tx} ${ty} q-60 -70 -120 -60 q60 0 120 60`} />
        <path d={`M${tx} ${ty} q60 -70 120 -60 q-60 0 -120 60`} />
        <path d={`M${tx} ${ty} q-10 -80 10 -110 q0 50 -10 110`} />
      </g>
    </g>
  );
}

export function Boat({ x, y, s = 1, hull = '#5A3B2A', sail, figure = '#3A2A22' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {sail && <path d="M10 -6 L10 -96 L64 -14 Z" fill={sail} />}
      <path d="M-70 -8 L80 -8 Q72 22 40 26 L-40 26 Q-66 20 -70 -8 Z" fill={hull} />
      {figure && !sail && <g fill={figure}><circle cx="-20" cy="-34" r="9" /><rect x="-28" y="-26" width="16" height="20" rx="5" /><path d="M30 -8 L52 -66" stroke={figure} strokeWidth="4" /></g>}
    </g>
  );
}

/* Arched window used in Rajasthani and Mughal façades. */
// eslint-disable-next-line react-refresh/only-export-components
export const archPath = (x, y, w, h) => `M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z`;

/* Scene frame: decorative by default; pass `title` to expose it as an image. */
export function Frame({ title, children, className, preserve = 'xMidYMax slice' }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio={preserve}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {children}
    </svg>
  );
}
