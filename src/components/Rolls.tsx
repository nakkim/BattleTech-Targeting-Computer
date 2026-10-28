import type { ReactNode } from 'react'
import { fallDamage, fallHitLocation, fallSide, fiveGroups, type FallOptions, type FallRolls } from '../rules/psr'
import { LOCATION_NAMES } from '../rules/tables'
import type { Arc, Attacker } from '../rules/types'
import { HitReport } from './DamagePanel'

const ROLL_2D6 = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const ROLL_1D6 = [1, 2, 3, 4, 5, 6]

interface RollInputProps {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  /** Possible results, 2D6 by default. */
  results?: number[]
}

/** Buttons for entering a physical dice result. Clicking the chosen result again clears it. */
export const RollInput = ({ label, value, onChange, results = ROLL_2D6 }: RollInputProps) => (
  <div className="segmented roll-input" role="radiogroup" aria-label={label}>
    {results.map((n) => (
      <button key={n} type="button" role="radio" aria-checked={n === value} className={n === value ? 'active' : ''} onClick={() => onChange(n === value ? null : n)}>
        {n}
      </button>
    ))}
  </div>
)

/** One roll: what to roll, the result, and what follows. */
export const RollStep = ({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) => (
  <div className="dice-roll">
    <div className="dice-roll-header">
      <h4>{title}</h4>
      {actions}
    </div>
    {children}
  </div>
)

const SIDE_TEXT: Record<Arc, string> = {
  front: 'its front: use the Front column',
  right: 'its right side: use the Right Side column',
  left: 'its left side: use the Left Side column',
  rear: 'its back: use the Front column, on the rear armor',
}

const SIDE_NAMES: Record<Arc, string> = { front: 'its front', right: 'its right side', left: 'its left side', rear: 'its back' }

interface FallDamageProps extends FallOptions {
  fall: FallRolls
  attacker: Attacker
  /** Facing After Fall roll ('facing') or the Hit Location roll of a group. */
  onRoll: (roll: 'facing' | number, value: number | null) => void
  onApply: () => void
  onUndo: () => void
}

/** Falling damage: the side the 'Mech lands on, then a hit location for each 5-point group, then apply. */
export const FallDamage = ({ fall, attacker, levels = 0, rear = false, onRoll, onApply, onUndo }: FallDamageProps) => {
  const applied = fall.applied
  if (applied) {
    const damage = applied.hits.reduce((sum, h) => sum + h.damage, 0)
    return (
      <HitReport
        label={`Falling damage ${damage}, ${rear ? 'on the rear' : `landed on ${SIDE_NAMES[applied.side]}`}`}
        groups={applied.hits.map((h) => ({ ...h, label: applied.hits.length > 1 ? `${h.damage} to the ${LOCATION_NAMES[h.location].toLowerCase()}` : undefined }))}
        explosion={false}
        attacker={attacker}
        onUndo={onUndo}
      />
    )
  }
  const damage = fallDamage(attacker, levels)
  const groups = fiveGroups(damage)
  const side = fall.facingRoll === null ? null : rear ? 'rear' : fallSide(fall.facingRoll)
  const ready = side !== null && groups.every((_, i) => fall.locationRolls[i] != null)
  return (
    <>
      <p>
        Falling damage <strong>{damage}</strong>
        {levels > 0 && ` (${levels} levels)`}
        {attacker.waterDepth > 0 && ' (halved in water)'}: {groups.length === 1 ? 'one hit' : `${groups.length} hits of ${groups.join(', ')}`}.
      </p>
      <p>Roll 1D6 on the Facing After Fall Table for {rear ? 'its new facing' : 'the side it lands on'}.</p>
      <RollInput label="Facing After Fall roll" results={ROLL_1D6} value={fall.facingRoll} onChange={(v) => onRoll('facing', v)} />
      {side && (
        <>
          <p className="muted">{rear ? 'The damage hits the rear: use the Front column, on the rear armor' : `Lands on ${SIDE_TEXT[side]}`} of the Hit Location Table.</p>
          {groups.map((g, i) => {
            const roll = fall.locationRolls[i] ?? null
            return (
              <div key={i} className="fall-hit">
                <p>
                  {groups.length > 1 ? `Hit ${i + 1}, ${g} damage` : `${g} damage`}: roll 2D6 for the location
                  {roll !== null && (
                    <>
                      {' '}
                      — <strong>{LOCATION_NAMES[fallHitLocation(side, roll)]}</strong>
                    </>
                  )}
                </p>
                <RollInput label={`Hit location roll ${i + 1}`} value={roll} onChange={(v) => onRoll(i, v)} />
              </div>
            )
          })}
          <div>
            <button type="button" className="danger" disabled={!ready} onClick={onApply} title="Armor first, then internal structure; each hit is applied on its own">
              Apply falling damage
            </button>
          </div>
        </>
      )}
    </>
  )
}
