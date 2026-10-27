import { useState, type ReactNode } from 'react'
import { explosionDamage, heatExplosionCandidates } from '../rules/ammo'
import { ammoExplodes, fallDamage, fallHitLocation, fallSide, fallsOnShutdown, fiveGroups, needsShutdownPsr, powerCheck, shutdownAfter, shutdownPsr, type HeatPhase } from '../rules/heatPhase'
import { LOCATION_NAMES, WEAPONS_BY_KEY } from '../rules/tables'
import type { Arc, Attacker } from '../rules/types'
import type { HeatRoll } from '../state/unit'
import { HitReport } from './DamagePanel'

/** What the player does in the Heat Phase: enter rolls, and apply or undo damage. */
export interface HeatPhaseActions {
  onRoll: (roll: HeatRoll, value: number | null) => void
  onExplode: (binId: string) => void
  onUndoExplosion: () => void
  /** Facing After Fall roll ('facing') or the Hit Location roll of a group of falling damage. */
  onFallRoll: (roll: 'facing' | number, value: number | null) => void
  onApplyFall: () => void
  onUndoFall: () => void
}

interface Props extends HeatPhaseActions {
  phase: HeatPhase
  attacker: Attacker
  /** Stats are tracked: rolls are entered and applied. Plain mode only lists what to roll. */
  tracking: boolean
}

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
const RollInput = ({ label, value, onChange, results = ROLL_2D6 }: RollInputProps) => (
  <div className="segmented roll-input" role="radiogroup" aria-label={label}>
    {results.map((n) => (
      <button key={n} type="button" role="radio" aria-checked={n === value} className={n === value ? 'active' : ''} onClick={() => onChange(n === value ? null : n)}>
        {n}
      </button>
    ))}
  </div>
)

/** One roll: what to roll, the result, and what follows. */
const RollStep = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="heat-roll">
    <h4>{title}</h4>
    {children}
  </div>
)

const PowerStep = ({ phase, onRoll }: Pick<Props, 'phase' | 'onRoll'>) => {
  const check = powerCheck(phase)
  const shutdown = shutdownAfter(phase)
  switch (check.kind) {
    case 'none':
      return null
    case 'auto-shutdown':
      return (
        <RollStep title="Shutdown">
          <p className="msg-error">Heat {phase.heat}: the power plant shuts down automatically. No roll can avoid it.</p>
        </RollStep>
      )
    case 'auto-restart':
      return (
        <RollStep title="Restart">
          <p className="msg-ok">Heat below 14: the power plant restarts automatically. The ’Mech can move and fire this turn.</p>
        </RollStep>
      )
    case 'no-restart':
      return (
        <RollStep title="Restart">
          <p className="msg-error">Heat {phase.heat}: the power plant cannot restart until heat is below 30.</p>
        </RollStep>
      )
    case 'shutdown':
    case 'restart': {
      const restart = check.kind === 'restart'
      return (
        <RollStep title={restart ? 'Restart' : 'Shutdown'}>
          <p>
            Roll 2D6: <strong>{check.target}+</strong> {restart ? 'restarts the power plant' : 'avoids shutdown'}.
          </p>
          <RollInput label={restart ? 'Restart roll' : 'Shutdown roll'} value={phase.powerRoll} onChange={(v) => onRoll('powerRoll', v)} />
          {shutdown === false && (
            <p className="msg-ok">{restart ? 'Restarted: the ’Mech can move and fire this turn.' : 'Shutdown avoided.'}</p>
          )}
          {shutdown === true && (
            <p className="msg-error">
              {restart
                ? 'Still shut down. Try again in the next Heat Phase.'
                : 'The power plant shuts down. The ’Mech is immobile and cannot move or attack; its heat sinks keep working. It can try to restart after one full turn.'}
            </p>
          )}
        </RollStep>
      )
    }
  }
}

const SIDE_TEXT: Record<Arc, string> = {
  front: 'its front: use the Front column',
  right: 'its right side: use the Right Side column',
  left: 'its left side: use the Left Side column',
  rear: 'its back: use the Front column, on the rear armor',
}

/** Falling damage: the side the 'Mech lands on, then a hit location for each 5-point group. */
const FallDamage = ({ phase, attacker, onFallRoll, onApplyFall, onUndoFall }: Pick<Props, 'phase' | 'attacker' | 'onFallRoll' | 'onApplyFall' | 'onUndoFall'>) => {
  const fall = phase.fall
  if (fall) {
    const damage = fall.hits.reduce((sum, h) => sum + h.damage, 0)
    return (
      <HitReport
        label={`Falling damage ${damage}, landed on ${fall.side === 'rear' ? 'its back' : fall.side === 'front' ? 'its front' : `its ${fall.side} side`}`}
        groups={fall.hits.map((h) => ({ ...h, label: fall.hits.length > 1 ? `${h.damage} to the ${LOCATION_NAMES[h.location].toLowerCase()}` : undefined }))}
        explosion={false}
        attacker={attacker}
        onUndo={onUndoFall}
      />
    )
  }
  const damage = fallDamage(attacker)
  const groups = fiveGroups(damage)
  const side = phase.fallFacingRoll === null ? null : fallSide(phase.fallFacingRoll)
  const ready = side !== null && groups.every((_, i) => phase.fallRolls[i] != null)
  return (
    <>
      <p>
        Falling damage <strong>{damage}</strong>
        {attacker.waterDepth > 0 && ' (halved in water)'}: {groups.length === 1 ? 'one hit' : `${groups.length} hits of ${groups.join(', ')}`}.
      </p>
      <p>Roll 1D6 on the Facing After Fall Table for the side it lands on.</p>
      <RollInput label="Facing After Fall roll" results={ROLL_1D6} value={phase.fallFacingRoll} onChange={(v) => onFallRoll('facing', v)} />
      {side && (
        <>
          <p className="muted">Lands on {SIDE_TEXT[side]} of the Hit Location Table.</p>
          {groups.map((g, i) => {
            const roll = phase.fallRolls[i] ?? null
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
                <RollInput label={`Hit location roll ${i + 1}`} value={roll} onChange={(v) => onFallRoll(i, v)} />
              </div>
            )
          })}
          <div>
            <button type="button" className="danger" disabled={!ready} onClick={onApplyFall} title="Armor first, then internal structure; each hit is applied on its own">
              Apply falling damage
            </button>
          </div>
        </>
      )}
    </>
  )
}

const FallStep = ({ phase, attacker, onRoll, ...fallProps }: Pick<Props, 'phase' | 'attacker' | 'onRoll' | 'onFallRoll' | 'onApplyFall' | 'onUndoFall'>) => {
  if (!needsShutdownPsr(phase)) return null
  const { modifiers, target } = shutdownPsr(attacker)
  const falls = fallsOnShutdown(phase, attacker)
  return (
    <RollStep title="Piloting Skill Roll">
      <p>
        The ’Mech shuts down standing. {target > 12 ? 'Target Number' : 'Roll 2D6:'} <strong>{target}+</strong> {target > 12 ? 'is above 12, so it falls.' : 'to stay standing.'}
      </p>
      <p className="muted">{modifiers.map((m, i) => `${m.label} ${i > 0 ? '+' : ''}${m.value}`).join(' · ')}</p>
      {target <= 12 && <RollInput label="Piloting Skill Roll" value={phase.psrRoll} onChange={(v) => onRoll('psrRoll', v)} />}
      {falls === false && <p className="msg-ok">The ’Mech stays standing.</p>}
      {falls === true && (
        <>
          <ul className="messages">
            <li className="msg-error">The ’Mech falls and is now prone, face down.</li>
            <li className="msg-warn">The MechWarrior takes 1 damage: the ’Mech is immobile, so there is no roll to avoid it.</li>
          </ul>
          <FallDamage phase={phase} attacker={attacker} {...fallProps} />
        </>
      )}
    </RollStep>
  )
}

const AmmoStep = ({ phase, attacker, onRoll, onExplode, onUndoExplosion }: Props) => {
  const [binId, setBinId] = useState('')
  if (phase.ammoTarget === null) return null
  const explodes = ammoExplodes(phase)
  const bins = heatExplosionCandidates(attacker)
  const bin = bins.find((b) => b.id === binId) ?? bins[0]
  return (
    <RollStep title="Ammo explosion">
      <p>
        Roll 2D6: <strong>{phase.ammoTarget}+</strong> avoids an ammo explosion.
      </p>
      <RollInput label="Ammo explosion roll" value={phase.ammoRoll} onChange={(v) => onRoll('ammoRoll', v)} />
      {phase.ammoRoll !== null && !explodes && <p className="msg-ok">No explosion.</p>}
      {explodes && phase.explosion && (
        <HitReport label={phase.explosion.label} groups={[phase.explosion]} explosion attacker={attacker} onUndo={onUndoExplosion} />
      )}
      {explodes && !phase.explosion && bin && (
        <div className="explode-ammo">
          {bins.length > 1 ? (
            <select value={bin.id} onChange={(e) => setBinId(e.target.value)} aria-label="Ammo bin that explodes" title="Bins with equal damage per shot: you choose">
              {bins.map((b) => (
                <option key={b.id} value={b.id}>
                  {WEAPONS_BY_KEY[b.weaponKey].name} · {b.location} · {b.shots} shots ({explosionDamage(b)})
                </option>
              ))}
            </select>
          ) : (
            <span>
              {WEAPONS_BY_KEY[bin.weaponKey].name} ammo in the {LOCATION_NAMES[bin.location].toLowerCase()}: {bin.shots} shots, <strong>{explosionDamage(bin)}</strong> damage
            </span>
          )}
          <button type="button" className="danger" onClick={() => onExplode(bin.id)} title="Damage goes to internal structure, bypassing armor, and transfers inward">
            Explode ammo
          </button>
        </div>
      )}
      {explodes && !phase.explosion && !bin && <p className="muted">No unemptied explosive ammo is left.</p>}
    </RollStep>
  )
}

/** Plain mode: what the last Heat Phase called for, resolved on the record sheet. */
const HeatPhaseNotice = ({ phase }: { phase: HeatPhase }) => {
  const check = powerCheck(phase)
  const notes: string[] = []
  if (check.kind === 'auto-shutdown') notes.push('The power plant shuts down automatically.')
  if (check.kind === 'shutdown') notes.push(`Roll 2D6: ${check.target}+ avoids shutdown. A standing ’Mech that shuts down makes a Piloting Skill Roll at +3.`)
  if (check.kind === 'auto-restart') notes.push('Heat below 14: a shut down power plant restarts automatically.')
  if (check.kind === 'no-restart') notes.push('Heat 30 or more: a shut down power plant cannot restart.')
  if (check.kind === 'restart') notes.push(`Roll 2D6: ${check.target}+ restarts the power plant.`)
  if (phase.ammoTarget !== null) notes.push(`Roll 2D6: ${phase.ammoTarget}+ avoids an ammo explosion. On a failure the ammo with the most damage per shot explodes.`)
  return (
    <section className="heat-phase" aria-label="Heat Phase">
      <h3>Heat Phase · heat {phase.heat}</h3>
      <ul className="messages">
        {notes.map((n) => (
          <li key={n} className="msg-warn">
            {n}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The rolls of the last Heat Phase: what to roll on the table, the entered result and its effect. */
export const HeatPhaseRolls = (props: Props) => {
  const { phase } = props
  if (powerCheck(phase).kind === 'none' && phase.ammoTarget === null) return null
  if (!props.tracking) return <HeatPhaseNotice phase={phase} />
  return (
    <section className="heat-phase" aria-label="Heat Phase rolls">
      <h3>Heat Phase rolls · heat {phase.heat}</h3>
      <PowerStep {...props} />
      <FallStep {...props} />
      <AmmoStep {...props} />
    </section>
  )
}
