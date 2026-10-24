import { ARC_NAMES, WEAPONS_BY_KEY } from '../../rules/tables'
import type { Arc, Attacker, MountedWeapon, Target } from '../../rules/types'
import { isLeg, weaponArcs } from '../../rules/weaponAttack'
import { bearing, hexCenter, hexesWithin, hexPoints, type Point } from './hex'

const SIZE = 26
const RADIUS = 3
const EPS = 1e-6

/** Arc of a hex by its bearing: 120° front, 60° per side, 120° rear (as in the Firing Arcs Diagram, p. 15). */
function arcOf(p: Point): Arc | null {
  if (p.x === 0 && p.y === 0) return null
  const a = bearing(p)
  if (Math.abs(a) <= 60 + EPS) return 'front'
  if (Math.abs(a) <= 120 + EPS) return a > 0 ? 'right' : 'left'
  return 'rear'
}

const ARC_BEARING: Record<Arc, number> = { front: 0, right: 90, left: -90, rear: 180 }


function arcLabel(arc: Arc, armsFlipped: boolean): string[] {
  if (armsFlipped) {
    if (arc === 'rear') return ['REAR ARC', 'ARMS FLIPPED']
    return [`${ARC_NAMES[arc].toUpperCase()} ARC`, arc === 'front' ? 'TORSO & HEAD' : '']
  }
  switch (arc) {
    case 'front':
      return ['FRONT ARC', 'LEFT ARM &', 'RIGHT ARM ARC']
    case 'left':
      return ['LEFT ARM &', 'LEFT SIDE', 'ARC']
    case 'right':
      return ['RIGHT ARM &', 'RIGHT SIDE', 'ARC']
    default:
      return ['REAR ARC']
  }
}

interface Props {
  attacker: Attacker
  target: Target
  weapons: MountedWeapon[]
}

export function ArcDiagram({ attacker, target, weapons }: Props) {
  const hexes = hexesWithin(RADIUS)
  const span = SIZE * Math.sqrt(3) * (RADIUS + 0.5) + 4
  const vspan = SIZE * (1.5 * RADIUS + 1) + 4
  const labelDist = SIZE * Math.sqrt(3) * 2.6

  const armsFlipped = attacker.armsFlipped && !attacker.prone
  const arcs: Arc[] = ['front', 'left', 'right', 'rear']
  const weaponsByArc = Object.fromEntries(
    arcs.map((arc) => [
      arc,
      // Leg weapons follow the feet, so they are not shown on a twisted torso's arcs.
      weapons.filter((w) => !(isLeg(w.location) && attacker.torsoTwisted) && weaponArcs(w.location, w.rear, armsFlipped).includes(arc)),
    ]),
  ) as Record<Arc, MountedWeapon[]>

  return (
    <div className="diagram">
      <svg
        viewBox={`${-span} ${-vspan} ${span * 2} ${vspan * 2}`}
        className="arc-svg"
        role="img"
        aria-label={`Firing arcs. Target is in the ${ARC_NAMES[target.arc].toLowerCase()} arc.`}
      >
        {hexes.map(({ q, r }) => {
          const c = hexCenter(q, r, SIZE)
          const arc = arcOf(c)
          const cls = arc ? `hex arc-${arc} ${arc === target.arc ? 'selected' : 'dimmed'}` : 'hex hex-self'
          return <polygon key={`${q},${r}`} points={hexPoints(c, SIZE - 1)} className={cls} />
        })}
        {/* Attacker in the center, facing up. */}
        <polygon points="0,-14 9,8 0,3 -9,8" className="facing-arrow" />
        {arcs.map((arc) => {
          const rad = (ARC_BEARING[arc] * Math.PI) / 180
          const x = Math.sin(rad) * labelDist
          const y = -Math.cos(rad) * labelDist
          const lines = arcLabel(arc, armsFlipped).filter(Boolean)
          return (
            <text key={arc} x={x} y={y - ((lines.length - 1) * 11) / 2} className={`arc-label ${arc === target.arc ? '' : 'dimmed-label'}`}>
              {lines.map((line, i) => (
                <tspan key={i} x={x} dy={i === 0 ? 0 : 11}>
                  {line}
                </tspan>
              ))}
            </text>
          )
        })}
      </svg>
      <p className="diagram-caption">
        <strong>{target.name}</strong> is in the <strong>{ARC_NAMES[target.arc].toLowerCase()} arc</strong>
        , {target.range} hex{target.range === 1 ? '' : 'es'} away.
        {attacker.torsoTwisted && ' Torso is twisted: arcs follow the torso, leg weapons follow the feet.'}
      </p>
      <ul className="arc-legend">
        {arcs.map((arc) => (
          <li key={arc} className={arc === target.arc ? 'selected' : ''}>
            <span className={`swatch arc-${arc}`} />
            <span className="arc-legend-name">{ARC_NAMES[arc]}</span>
            <span className="arc-legend-weapons">
              {weaponsByArc[arc].length
                ? weaponsByArc[arc].map((w) => `${WEAPONS_BY_KEY[w.weaponKey].name} [${w.location}${w.rear ? ' R' : ''}]`).join(', ')
                : 'no weapons'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
