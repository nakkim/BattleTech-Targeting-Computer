import { useState } from 'react'
import { checkPilot, consciousnessTarget, KILLING_HITS, type ConsciousnessCheck, type PilotTurn } from '../rules/pilot'
import { CollapsiblePanel } from './fields'
import { RollInput, RollStep } from './Rolls'

/** What the player does with MechWarrior damage: add or remove it, and enter Consciousness Rolls. */
export interface PilotActions {
  onAdd: (reason: string, amount: number) => void
  onRemove: (id: string) => void
  onRoll: (damageId: string, index: number, value: number | null) => void
  onWake: (value: number | null) => void
  onHeal: () => void
}

interface Props {
  pilot: PilotTurn
  /** Steps still to do, shown while the card is collapsed. */
  pending: number
  actions: PilotActions
}

/** Damage the player adds by hand. Head hits, ammo explosions and falls in tracked play are added by the app. */
const REASONS = ['Head hit', 'Ammo explosion', 'Fall', 'Heat (damaged life support)', 'Other']

/** The record sheet's Warrior Data track: damage taken and the consciousness number for each. */
const DamageTrack = ({ hits }: { hits: number }) => (
  <table className="pilot-track">
    <tbody>
      <tr>
        <th>Hits taken</th>
        {Array.from({ length: KILLING_HITS }, (_, i) => (
          <td key={i} className={i < hits ? 'pilot-hit' : ''}>
            {i + 1}
          </td>
        ))}
      </tr>
      <tr>
        <th>Consciousness #</th>
        {Array.from({ length: KILLING_HITS }, (_, i) => (
          <td key={i}>{consciousnessTarget(i + 1) ?? 'Dead'}</td>
        ))}
      </tr>
    </tbody>
  </table>
)

const AddDamage = ({ onAdd }: Pick<PilotActions, 'onAdd'>) => {
  const [reason, setReason] = useState(REASONS[0])
  const [amount, setAmount] = useState(1)
  return (
    <div className="add-psr">
      <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Cause of MechWarrior damage">
        {REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <select value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-label="Damage">
        {[1, 2, 3].map((n) => (
          <option key={n} value={n}>
            {n} damage
          </option>
        ))}
      </select>
      <button type="button" onClick={() => onAdd(reason, amount)}>
        Add damage
      </button>
    </div>
  )
}

const ConsciousnessRoll = ({ check, roll, onRoll }: { check: ConsciousnessCheck; roll: number | null; onRoll: (value: number | null) => void }) => {
  if (check.outcome === 'killed') return <p className="msg-error">Damage {check.hits}: the MechWarrior is killed.</p>
  if (check.outcome === 'skipped') return <p className="muted">Damage {check.hits}: no roll, the MechWarrior is already unconscious.</p>
  return (
    <>
      <p>
        Damage {check.hits}: roll 2D6: <strong>{check.target}+</strong> to stay conscious.
      </p>
      <RollInput label={`Consciousness Roll at damage ${check.hits}`} value={roll} onChange={onRoll} />
      {check.outcome === 'conscious' && <p className="msg-ok">Stays conscious.</p>}
      {check.outcome === 'unconscious' && <p className="msg-error">Knocked unconscious: the ’Mech is immobile and fails every Piloting Skill Roll.</p>}
    </>
  )
}

/** The MechWarrior: damage taken, Consciousness Rolls made with physical dice, and waking up. */
export const PilotPanel = ({ pilot, pending, actions }: Props) => {
  const { checks, hits, unconscious, killed } = checkPilot(pilot)
  const wake = pilot.wake
  return (
    <CollapsiblePanel
      id="pilot"
      title="MechWarrior"
      className="pilot-panel"
      summary={
        <>
          {killed ? 'Killed' : unconscious ? 'Unconscious' : `${hits} damage`}
          {pending > 0 && <span className="hot"> · {pending} to resolve</span>}
        </>
      }
      actions={
        <button type="button" className="small ghost" onClick={actions.onHeal} title="Clear all MechWarrior damage">
          Heal
        </button>
      }
    >
      <DamageTrack hits={hits} />
      <p className={killed || unconscious ? 'msg-error pilot-status' : 'msg-ok pilot-status'}>
        {killed ? 'Killed.' : unconscious ? 'Unconscious: the ’Mech cannot move or attack.' : `Conscious, ${hits} damage.`}
      </p>
      {wake && pilot.hitsBefore < KILLING_HITS && (
        <RollStep title="Regain consciousness">
          <p>
            End Phase: roll 2D6: <strong>{wake.target}+</strong> to wake up.
          </p>
          <RollInput label="Wake-up roll" value={wake.roll} onChange={actions.onWake} />
          {wake.roll !== null && (wake.roll >= wake.target ? <p className="msg-ok">The MechWarrior wakes up.</p> : <p className="msg-error">Still unconscious. Try again next End Phase.</p>)}
        </RollStep>
      )}
      <AddDamage onAdd={actions.onAdd} />
      {pilot.damage.length === 0 ? (
        <p className="muted">No MechWarrior damage this turn. Head hits, ammo explosions and falls add theirs.</p>
      ) : (
        <div className="psr-list">
          {pilot.damage.map((d) => (
            <RollStep
              key={d.id}
              title={`${d.reason} · ${d.amount} damage`}
              actions={
                <span className="dice-roll-meta">
                  {d.source ? (
                    <span className="muted">from the hit</span>
                  ) : (
                    <button type="button" className="small ghost" onClick={() => actions.onRemove(d.id)}>
                      Remove
                    </button>
                  )}
                </span>
              }
            >
              {checks
                .filter((c) => c.damageId === d.id)
                .map((c) => (
                  <ConsciousnessRoll key={c.index} check={c} roll={d.rolls[c.index] ?? null} onRoll={(v) => actions.onRoll(d.id, c.index, v)} />
                ))}
            </RollStep>
          ))}
        </div>
      )}
    </CollapsiblePanel>
  )
}
