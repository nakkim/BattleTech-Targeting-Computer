import { useState } from 'react'
import { explosionDamage, heatExplosionCandidates } from '../rules/ammo'
import { ammoExplodes, powerCheck, shutdownAfter, shutsDownStanding, type HeatPhase } from '../rules/heatPhase'
import { LOCATION_NAMES, WEAPONS_BY_KEY } from '../rules/tables'
import type { Attacker } from '../rules/types'
import type { HeatRoll } from '../state/unit'
import { HitReport } from './DamagePanel'
import { RollInput, RollStep } from './Rolls'

/** What the player does in the Heat Phase: enter rolls, and apply or undo an explosion. */
export interface HeatPhaseActions {
  onRoll: (roll: HeatRoll, value: number | null) => void
  onExplode: (binId: string) => void
  onUndoExplosion: () => void
}

interface Props extends HeatPhaseActions {
  phase: HeatPhase
  attacker: Attacker
  /** Stats are tracked: rolls are entered and applied. Plain mode only lists what to roll. */
  tracking: boolean
}

/** Shutting down while standing calls for a Piloting Skill Roll, made on its own card. */
const ShutdownPsrNote = ({ phase }: { phase: HeatPhase }) =>
  shutsDownStanding(phase) ? <p className="muted">The ’Mech shut down standing: make the Piloting Skill Roll on the Piloting Skill Rolls card.</p> : null

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
          <ShutdownPsrNote phase={phase} />
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
          <ShutdownPsrNote phase={phase} />
        </RollStep>
      )
    }
  }
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
      <AmmoStep {...props} />
    </section>
  )
}
