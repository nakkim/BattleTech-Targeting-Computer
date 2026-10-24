import type { Target, Terrain } from '../../rules/types'
import { woodsModifier } from '../../rules/weaponAttack'
import { hexPoints, type Point } from './hex'

const SIZE = 24
const W = SIZE * Math.sqrt(3)
/** Most clear hexes drawn between attacker and target; longer gaps are shortened. */
const MAX_CLEAR = 4

/** Trees in a hex: light woods are a few scattered trees, heavy woods a dense canopy. */
function Trees({ c, kind }: { c: Point; kind: Exclude<Terrain, 'clear'> }) {
  const spots: [number, number, number][] =
    kind === 'light'
      ? [
          [-8, -6, 6],
          [7, -3, 5.5],
          [-1, 8, 5],
        ]
      : [
          [-9, -8, 6.5],
          [2, -11, 6],
          [10, -3, 6.5],
          [-11, 3, 6],
          [0, 0, 7],
          [9, 9, 6],
          [-4, 11, 6],
        ]
  return (
    <g className={`trees trees-${kind}`}>
      {spots.map(([dx, dy, r], i) => (
        <circle key={i} cx={c.x + dx} cy={c.y + dy} r={r} />
      ))}
    </g>
  )
}

interface Cell {
  kind: 'attacker' | 'target' | 'clear' | 'gap' | Exclude<Terrain, 'clear'>
  modifier: number
  /** Woods modifier accumulated up to and including this hex. */
  total?: number
}

function buildCells(target: Target): Cell[] {
  const woods: Cell[] = [
    ...Array.from({ length: target.interveningHeavy }, () => ({ kind: 'heavy' as const, modifier: 2 })),
    ...Array.from({ length: target.interveningLight }, () => ({ kind: 'light' as const, modifier: 1 })),
  ]
  const between = Math.max(0, target.range - 1)
  const clear = Math.max(0, between - woods.length)
  const clearCells: Cell[] = Array.from({ length: Math.min(clear, MAX_CLEAR) }, () => ({ kind: 'clear', modifier: 0 }))
  if (clear > MAX_CLEAR) clearCells.splice(1, 0, { kind: 'gap', modifier: 0 })
  const targetMod = target.terrain === 'light' ? 1 : target.terrain === 'heavy' ? 2 : 0
  const cells: Cell[] = [{ kind: 'attacker', modifier: 0 }, ...clearCells.slice(0, 1), ...woods, ...clearCells.slice(1), { kind: 'target', modifier: targetMod }]
  let total = 0
  return cells.map((cell) => {
    total += cell.modifier
    return { ...cell, total }
  })
}

/** Line of fire through woods, styled like the rulebook's Line of Sight Diagram (p. 14). */
export function WoodsDiagram({ target }: { target: Target }) {
  const cells = buildCells(target)
  const total = woodsModifier(target)
  const blocked = total > 2
  const cy = SIZE + 10
  const xOf = (i: number) => 4 + W / 2 + i * W
  const width = xOf(cells.length - 1) + W / 2 + 4
  const height = cy + SIZE + 30
  const woodsCount = target.interveningLight + target.interveningHeavy

  return (
    <div className="diagram">
      <div className="range-scroll">
        <svg viewBox={`0 0 ${width} ${height}`} className="range-svg woods-svg" style={{ minWidth: `${cells.length * 34}px`, maxWidth: `${cells.length * 56}px` }} role="img" aria-label={`Line of fire through woods, total +${total}`}>
          {cells.map((cell, i) => {
            const c = { x: xOf(i), y: cy }
            if (cell.kind === 'gap') {
              return (
                <text key={i} x={c.x} y={cy + SIZE + 14} className="gap-dots">
                  …
                </text>
              )
            }
            const terrain = cell.kind === 'target' ? target.terrain : cell.kind
            return (
              <g key={i}>
                <polygon points={hexPoints(c, SIZE - 1)} className={`hex terrain-hex ${cell.kind === 'attacker' ? 'hex-self' : ''} ${cell.kind === 'target' ? 'terrain-target' : ''}`} />
                {(terrain === 'light' || terrain === 'heavy') && <Trees c={c} kind={terrain} />}
                {cell.kind === 'attacker' && <polygon points={`${c.x},${c.y - 9} ${c.x + 7},${c.y + 6} ${c.x},${c.y + 2} ${c.x - 7},${c.y + 6}`} className="facing-arrow" transform={`rotate(90 ${c.x} ${c.y})`} />}
                {cell.kind === 'target' && <circle cx={c.x} cy={c.y} r={5} className="target-dot" />}
                {cell.modifier > 0 && (
                  <text x={c.x} y={cy + SIZE + 14} className={`woods-mod ${blocked && (cell.total ?? 0) > 2 ? 'woods-mod-blocked' : ''}`}>
                    +{cell.modifier}
                  </text>
                )}
                {cell.kind === 'attacker' && (
                  <text x={c.x} y={cy + SIZE + 14} className="woods-caption">
                    ATTACKER
                  </text>
                )}
                {cell.kind === 'target' && cell.modifier === 0 && (
                  <text x={c.x} y={cy + SIZE + 14} className="woods-caption">
                    TARGET
                  </text>
                )}
              </g>
            )
          })}
          <line x1={xOf(0)} y1={cy} x2={xOf(cells.length - 1)} y2={cy} className={`los-line ${blocked ? 'los-blocked' : ''}`} />
        </svg>
      </div>
      <ul className="arc-legend">
        <li>
          <span className="swatch swatch-light" />
          <span className="arc-legend-name">Light woods</span>
          <span className="arc-legend-weapons">+1 per intervening hex, +1 if the target stands in it</span>
        </li>
        <li>
          <span className="swatch swatch-heavy" />
          <span className="arc-legend-name">Heavy woods</span>
          <span className="arc-legend-weapons">+2 per intervening hex, +2 if the target stands in it</span>
        </li>
      </ul>
      <p className="diagram-caption">
        {woodsCount > 0 ? `${woodsCount} intervening woods hex${woodsCount === 1 ? '' : 'es'}` : 'No intervening woods'}
        {target.terrain !== 'clear' ? `, target in ${target.terrain} woods` : ', target in the clear'}: woods modifier <strong>+{total}</strong>.{' '}
        {blocked ? (
          <strong className="text-bad">More than +2: LOS is blocked.</strong>
        ) : (
          'LOS is blocked once woods add more than +2 (three points of intervening woods).'
        )}{' '}
        The hex order along the line does not matter. Woods only count where they are high enough to intervene (see LOS, p. 13).
      </p>
    </div>
  )
}
