import { useState } from 'react'
import { WEAPONS_BY_KEY } from '../../rules/tables'
import type { MountedWeapon, Target, WeaponSpec } from '../../rules/types'
import { minimumRangeModifier, RANGE_MODIFIER, rangeBracket } from '../../rules/weaponAttack'
import { hexPoints } from './hex'

const SIZE = 17
const W = SIZE * Math.sqrt(3)

interface Props {
  gunnery: number
  target: Target
  weapons: MountedWeapon[]
}

/** Weapon types in the loadout, those aimed at this target first. */
const weaponChoices = (weapons: MountedWeapon[], target: Target): WeaponSpec[] => {
  const sorted = [...weapons].sort((a, b) => Number(b.targetId === target.id) - Number(a.targetId === target.id))
  const keys = [...new Set(sorted.map((w) => w.weaponKey))]
  return keys.map((k) => WEAPONS_BY_KEY[k])
}

/** Range bracket strip like the Minimum Range Diagram (p. 19): one hex per range, numbered with the base Target Number. */
export const RangeDiagram = ({ gunnery, target, weapons }: Props) => {
  const choices = weaponChoices(weapons, target)
  const [key, setKey] = useState(choices[0]?.key ?? 'ML')
  const spec = WEAPONS_BY_KEY[choices.some((c) => c.key === key) ? key : (choices[0]?.key ?? 'ML')]

  const count = Math.max(spec.long, target.range)
  const width = W * (count + 1) + 4
  const height = SIZE * 2 + 52
  const cy = 30 + SIZE
  const xOf = (i: number) => 2 + W / 2 + i * W

  const bracketSpan = (b: 'short' | 'medium' | 'long') => {
    const from = b === 'short' ? 1 : b === 'medium' ? spec.short + 1 : spec.medium + 1
    const to = spec[b]
    return { from, to, mid: (xOf(from) + xOf(to)) / 2 }
  }

  const bracket = rangeBracket(spec, target.range)
  const tn = gunnery + (bracket === 'out' ? 0 : RANGE_MODIFIER[bracket]) + minimumRangeModifier(spec, target.range)

  return (
    <div className="diagram">
      {choices.length > 1 && (
        <div className="segmented diagram-weapons" role="radiogroup" aria-label="Weapon">
          {choices.map((c) => (
            <button key={c.key} type="button" role="radio" aria-checked={c.key === spec.key} className={c.key === spec.key ? 'active' : ''} onClick={() => setKey(c.key)}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      <div className="range-scroll">
        <svg viewBox={`0 0 ${width} ${height}`} className="range-svg" style={{ minWidth: `${(count + 1) * 26}px` }} role="img" aria-label={`${spec.name} range brackets`}>
          {(['short', 'medium', 'long'] as const).map((b) => {
            const { from, to, mid } = bracketSpan(b)
            if (to < from) return null
            return (
              <text key={b} x={mid} y={16} className="range-label">
                {b.toUpperCase()} RANGE
              </text>
            )
          })}
          {Array.from({ length: count + 1 }, (_, i) => {
            const c = { x: xOf(i), y: cy }
            if (i === 0) {
              return (
                <g key={i}>
                  <polygon points={hexPoints(c, SIZE - 0.8)} className="hex hex-self" />
                  <polygon points={`${c.x},${c.y - 9} ${c.x + 7},${c.y + 6} ${c.x},${c.y + 2} ${c.x - 7},${c.y + 6}`} className="facing-arrow" transform={`rotate(90 ${c.x} ${c.y})`} />
                </g>
              )
            }
            const b = rangeBracket(spec, i)
            const min = minimumRangeModifier(spec, i)
            const cls = b === 'out' ? 'range-out' : min > 0 ? 'range-min' : `range-${b}`
            const value = b === 'out' ? '' : gunnery + RANGE_MODIFIER[b] + min
            return (
              <g key={i}>
                <polygon points={hexPoints(c, SIZE - 0.8)} className={`hex ${cls}`} />
                <text x={c.x} y={c.y + 5} className="hex-number">
                  {value}
                </text>
              </g>
            )
          })}
          {spec.minRange > 0 && (
            <text x={(xOf(1) + xOf(spec.minRange)) / 2} y={cy + SIZE + 15} className="range-label range-label-min">
              MINIMUM RANGE
            </text>
          )}
        </svg>
      </div>
      <p className="diagram-caption">
        Numbers show gunnery ({gunnery}) + range modifier{spec.minRange > 0 ? ' + minimum range modifier' : ''} for the {spec.name}
        {spec.minRange > 0 ? ` (min ${spec.minRange})` : ''}. Target at <strong>{target.range}</strong> hex{target.range === 1 ? '' : 'es'}:{' '}
        {bracket === 'out' ? (
          <strong>out of range</strong>
        ) : (
          <>
            <strong>{bracket} range</strong>, base <strong>{tn}</strong>
          </>
        )}
        . Movement, terrain and other modifiers are added on top (see the weapon breakdown).
      </p>
    </div>
  )
}
