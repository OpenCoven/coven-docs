import s from './home.module.css';

/*
 * The Boundary Sigil — a summoning circle that is literally the architecture
 * diagram. Each ring is a real runtime layer (outermost = closest to the user),
 * read from the same stack the StackDiagram lists: surfaces, cast codes, the
 * local API, the daemon, the ledger + harnesses, and the familiar at center.
 * The dashed outer circle is the coven boundary itself.
 *
 * Decorative duplicate of information presented in the Runtime Stack section,
 * so it is aria-hidden. All motion is disabled under prefers-reduced-motion.
 */

const CX = 280;
const CY = 280;

// Content rings, outermost first. `offset` scatters labels around the top arc.
const RINGS = [
  { r: 208, label: 'surfaces', offset: '3%', delay: 0.15 },
  { r: 174, label: 'cast codes', offset: '86%', delay: 0.3 },
  { r: 140, label: 'local api', offset: '8%', delay: 0.45 },
  { r: 106, label: 'daemon', offset: '78%', delay: 0.6 },
  { r: 72, label: 'ledger · harnesses', offset: '2%', delay: 0.75 },
];

// Session nodes resting on their orbits — [ring radius, angle in degrees].
const NODES: Array<[number, number]> = [
  [208, 130],
  [174, 305],
  [140, 75],
  [106, 210],
];

function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

export function BoundarySigil() {
  return (
    <svg
      className={s.sigil}
      viewBox="0 0 560 560"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        {RINGS.map(({ r }) => (
          <path
            key={r}
            id={`sigil-tp-${r}`}
            d={`M ${CX} ${CY - r} a ${r} ${r} 0 1 1 -0.01 0`}
            fill="none"
          />
        ))}
      </defs>

      {/* The boundary: dashed outer circle + cardinal ticks, rotating slowly */}
      <g className={s.sigilBoundary}>
        <circle cx={CX} cy={CY} r={240} className={s.sigilDashed} />
        <line x1={CX} y1={32} x2={CX} y2={48} className={s.sigilTick} />
        <line x1={CX} y1={512} x2={CX} y2={528} className={s.sigilTick} />
        <line x1={32} y1={CY} x2={48} y2={CY} className={s.sigilTick} />
        <line x1={512} y1={CY} x2={528} y2={CY} className={s.sigilTick} />
      </g>

      {/* Layer rings, drawn in from the outside toward the familiar */}
      {RINGS.map(({ r, delay }) => (
        <circle
          key={r}
          cx={CX}
          cy={CY}
          r={r}
          pathLength={1}
          className={s.sigilRing}
          style={{ animationDelay: `${delay}s` }}
        />
      ))}

      {/* Ring labels — mono, knocked out of the ring line beneath them */}
      {RINGS.map(({ r, label, offset }) => (
        <text key={label} className={s.sigilLabel}>
          <textPath href={`#sigil-tp-${r}`} startOffset={offset}>
            {label}
          </textPath>
        </text>
      ))}

      {/* Sessions resting on their orbits */}
      {NODES.map(([r, deg]) => {
        const [x, y] = polar(r, deg);
        return <circle key={`${r}-${deg}`} cx={x} cy={y} r={3.2} className={s.sigilNode} />;
      })}

      {/* The familiar: the one ember-gold mark on the page */}
      <circle cx={CX} cy={CY} r={26} className={s.sigilPulse} />
      <circle cx={CX} cy={CY} r={4.5} className={s.sigilCore} />
      <text x={CX} y={CY + 24} className={s.sigilCenterLabel} textAnchor="middle">
        familiar
      </text>
    </svg>
  );
}
