import type { Target } from '../../rules/types'

/** Height of one level in pixels. A standing 'Mech is 2 levels tall, a prone one 1 level. */
const L = 34
const PANEL_W = 150
const GROUND = L * 2.6

interface Depth {
  depth: number
  title: string
  standing: string
  prone: string
}

const DEPTHS: Depth[] = [
  { depth: 0, title: 'No water', standing: 'No effect.', prone: 'No effect.' },
  {
    depth: 1,
    title: 'Depth 1',
    standing: 'Legs underwater: partial cover, +1 to hit. Leg hits strike the water. Applies even against attackers firing from higher ground.',
    prone: 'Fully submerged: blocks LOS to and from attackers that are not underwater.',
  },
  {
    depth: 2,
    title: 'Depth 2+',
    standing: 'Fully submerged: blocks LOS to and from attackers that are not underwater.',
    prone: 'Fully submerged: blocks LOS to and from attackers that are not underwater.',
  },
]

/** Simple side-view 'Mech silhouette standing on (or lying at) the given floor line. */
function Mech({ x, floor, prone }: { x: number; floor: number; prone: boolean }) {
  if (prone) {
    const h = L * 0.8
    return (
      <g className="mech-silhouette">
        <rect x={x - 46} y={floor - h} width={70} height={h * 0.7} rx={4} />
        <rect x={x + 24} y={floor - h * 0.9} width={16} height={h * 0.55} rx={3} />
        <rect x={x - 50} y={floor - h * 0.35} width={40} height={h * 0.35} rx={3} />
      </g>
    )
  }
  const top = floor - 2 * L
  return (
    <g className="mech-silhouette">
      <rect x={x - 6} y={top} width={12} height={10} rx={2} />
      <rect x={x - 16} y={top + 10} width={32} height={L * 0.85} rx={4} />
      <rect x={x - 24} y={top + 13} width={8} height={L * 0.8} rx={3} />
      <rect x={x + 16} y={top + 13} width={8} height={L * 0.8} rx={3} />
      <rect x={x - 14} y={top + 10 + L * 0.85} width={11} height={floor - (top + 10 + L * 0.85)} rx={3} />
      <rect x={x + 3} y={top + 10 + L * 0.85} width={11} height={floor - (top + 10 + L * 0.85)} rx={3} />
    </g>
  )
}

function Panel({ d, prone, selected, index }: { d: Depth; prone: boolean; selected: boolean; index: number }) {
  const x0 = index * PANEL_W
  const cx = x0 + PANEL_W / 2
  const floor = GROUND + d.depth * L
  const poolL = x0 + 18
  const poolR = x0 + PANEL_W - 18
  const submerged = d.depth >= 2 || (prone && d.depth >= 1)
  return (
    <g className={selected ? 'water-panel selected' : 'water-panel dimmed-panel'}>
      {/* Ground with the water basin cut into it. */}
      <path
        d={`M${x0} ${GROUND} H${poolL} V${floor} H${poolR} V${GROUND} H${x0 + PANEL_W} V${GROUND + 2 * L + 14} H${x0} Z`}
        className="ground"
      />
      {d.depth > 0 && <rect x={poolL} y={GROUND} width={poolR - poolL} height={floor - GROUND} className="water" />}
      <Mech x={cx} floor={floor} prone={prone} />
      {d.depth > 0 && <rect x={poolL} y={GROUND} width={poolR - poolL} height={floor - GROUND} className="water-overlay" />}
      {d.depth > 0 && <line x1={poolL} x2={poolR} y1={GROUND} y2={GROUND} className="water-surface" />}
      <text x={cx} y={16} className="water-title">
        {d.title.toUpperCase()}
      </text>
      <text x={cx} y={GROUND + 2 * L + 34} className={`water-effect ${submerged ? 'text-bad' : d.depth === 1 && !prone ? 'text-warn' : ''}`}>
        {submerged ? 'SUBMERGED' : d.depth === 1 ? 'PARTIAL COVER' : 'NO EFFECT'}
      </text>
    </g>
  )
}

/** Target 'Mech in water, side view: how deep water affects cover and line of sight (p. 14, 17). */
export function WaterDiagram({ target }: { target: Target }) {
  const selected = Math.min(target.waterDepth, 2)
  const info = DEPTHS[selected]
  return (
    <div className="diagram">
      <div className="range-scroll">
        <svg viewBox={`0 0 ${PANEL_W * 3} ${GROUND + 2 * L + 44}`} className="range-svg water-svg" style={{ minWidth: '420px' }} role="img" aria-label={`Target ${target.prone ? 'prone' : 'standing'} in ${info.title}`}>
          {DEPTHS.map((d, i) => (
            <Panel key={d.depth} d={d} index={i} prone={target.prone} selected={i === selected} />
          ))}
        </svg>
      </div>
      <p className="diagram-caption">
        <strong>
          {target.name}, {target.prone ? 'prone' : 'standing'}, {info.title.toLowerCase()}:
        </strong>{' '}
        {target.prone ? info.prone : info.standing}
      </p>
      <p className="diagram-caption">
        A standing &apos;Mech is 2 levels tall and a prone one 1 level. Water gives no terrain modifier itself. Toggle <em>Prone</em> on the target to compare.
      </p>
    </div>
  )
}
