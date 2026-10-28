import { useState } from 'react'
import { checkPsrs, PSR_CAUSES, PSR_PHASE_NAMES, type PsrCause, type PsrCheck, type PsrModifier, type PsrPhase, type PsrQueue } from '../rules/psr'
import type { Attacker } from '../rules/types'
import { Panel } from './fields'
import { FallDamage, RollInput, RollStep } from './Rolls'

/** What the player does with Piloting Skill Rolls: add one, enter dice results, and apply or undo falling damage. */
export interface PsrActions {
  onAdd: (cause: PsrCause, phase: PsrPhase) => void
  onRemove: (id: string) => void
  onRoll: (id: string, roll: 'roll' | 'pilotRoll', value: number | null) => void
  onFallRoll: (id: string, roll: 'facing' | number, value: number | null) => void
  onApplyFall: (id: string) => void
  onUndoFall: (id: string) => void
}

interface Props {
  psrs: PsrQueue
  attacker: Attacker
  actions: PsrActions
}

/** Causes the player adds by hand; the shutdown roll comes from the Heat Phase. */
const ADDABLE = (Object.keys(PSR_CAUSES) as PsrCause[]).filter((c) => c !== 'shutdown')
const PHASES = Object.keys(PSR_PHASE_NAMES) as PsrPhase[]
/** Short phase names for the narrow select. */
const PHASE_OPTIONS: Record<PsrPhase, string> = { movement: 'Movement', weapon: 'Weapon attacks', physical: 'Physical attacks', heat: 'Heat' }

/** E.g. "Piloting skill 5 · Reactor shut down +3 · Entered Depth 1 water −1". */
const formatModifiers = (modifiers: PsrModifier[]): string =>
  modifiers.map((m, i) => `${m.label} ${i === 0 ? m.value : m.value < 0 ? `−${-m.value}` : `+${m.value}`}`).join(' · ')

const AddPsr = ({ onAdd }: Pick<PsrActions, 'onAdd'>) => {
  const [cause, setCause] = useState<PsrCause>('kicked')
  const [phase, setPhase] = useState<PsrPhase>(PSR_CAUSES.kicked.phase)
  return (
    <div className="add-psr">
      <select
        value={cause}
        aria-label="Event calling for a Piloting Skill Roll"
        onChange={(e) => {
          const next = e.target.value as PsrCause
          setCause(next)
          setPhase(PSR_CAUSES[next].phase)
        }}
      >
        {ADDABLE.map((c) => (
          <option key={c} value={c}>
            {PSR_CAUSES[c].label}
          </option>
        ))}
      </select>
      <select value={phase} aria-label="Phase of the roll" title="Rolls in the same phase add up each other's modifiers" onChange={(e) => setPhase(e.target.value as PsrPhase)}>
        {PHASES.map((p) => (
          <option key={p} value={p}>
            {PHASE_OPTIONS[p]}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => onAdd(cause, phase)}>
        Add roll
      </button>
    </div>
  )
}

const PsrRoll = ({ check, attacker, actions }: { check: PsrCheck; attacker: Attacker; actions: PsrActions }) => {
  const { psr, modifiers, target, automatic, outcome } = check
  const spec = PSR_CAUSES[psr.cause]
  const stand = psr.cause === 'stand'
  return (
    <RollStep
      title={spec.label}
      actions={
        <span className="dice-roll-meta">
          <span className="muted">{PSR_PHASE_NAMES[psr.phase]}</span>
          {psr.cause !== 'shutdown' && (
            <button type="button" className="small ghost" onClick={() => actions.onRemove(psr.id)} title="Remove this roll and take back its falling damage">
              Remove
            </button>
          )}
        </span>
      }
    >
      {outcome === 'skipped' && <p className="muted">Not needed. {check.skipped}</p>}
      {outcome !== 'skipped' && automatic && <p className="msg-error">Falls automatically. {automatic}</p>}
      {outcome !== 'skipped' && !automatic && (
        <>
          <p>
            Roll 2D6: <strong>{target}+</strong> {stand ? 'to stand up' : 'to stay standing'}.
          </p>
          <p className="muted">{formatModifiers(modifiers)}</p>
          {spec.note && <p className="muted">{spec.note}</p>}
          <RollInput label={`${spec.label}: Piloting Skill Roll`} value={psr.roll} onChange={(v) => actions.onRoll(psr.id, 'roll', v)} />
          {outcome === 'stands' && <p className="msg-ok">{stand ? 'The ’Mech stands up.' : 'The ’Mech stays standing.'}</p>}
        </>
      )}
      {outcome === 'falls' && (
        <>
          <ul className="messages">
            <li className="msg-error">{stand ? 'The ’Mech falls again and stays prone.' : 'The ’Mech falls and is now prone, face down.'}</li>
            {check.pilotAutomatic && <li className="msg-warn">The MechWarrior takes 1 damage without a roll. {check.pilotAutomatic}</li>}
          </ul>
          {!check.pilotAutomatic && (
            <>
              <p>
                MechWarrior: roll 2D6: <strong>{check.pilotTarget}+</strong> to avoid 1 damage, before the falling damage.
              </p>
              <RollInput label={`${spec.label}: MechWarrior damage roll`} value={psr.pilotRoll} onChange={(v) => actions.onRoll(psr.id, 'pilotRoll', v)} />
              {check.pilotHurt === false && <p className="msg-ok">The MechWarrior is unhurt.</p>}
              {check.pilotHurt === true && <p className="msg-error">The MechWarrior takes 1 damage.</p>}
            </>
          )}
          <FallDamage
            fall={psr.fall}
            attacker={attacker}
            levels={spec.levels}
            rear={spec.rear}
            onRoll={(roll, value) => actions.onFallRoll(psr.id, roll, value)}
            onApply={() => actions.onApplyFall(psr.id)}
            onUndo={() => actions.onUndoFall(psr.id)}
          />
        </>
      )}
    </RollStep>
  )
}

/** Piloting Skill Rolls of the turn, made with physical dice: what to roll, the result, and the fall that follows. */
export const PsrPanel = ({ psrs, attacker, actions }: Props) => {
  const checks = checkPsrs(psrs, attacker)
  return (
    <Panel title="Piloting Skill Rolls" className="psr-panel">
      <AddPsr onAdd={actions.onAdd} />
      {checks.length === 0 ? (
        <p className="muted">No Piloting Skill Rolls this turn. Add one when an event calls for it.</p>
      ) : (
        <div className="psr-list">
          {checks.map((c) => (
            <PsrRoll key={c.psr.id} check={c} attacker={attacker} actions={actions} />
          ))}
        </div>
      )}
    </Panel>
  )
}
