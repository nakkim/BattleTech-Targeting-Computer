import { checkHits, itemName, itemsIn, slotCount, type CritCheck, type CritHitState, type CritItem } from '../rules/crits'
import { LOCATION_NAMES, WEAPONS_BY_KEY } from '../rules/tables'
import type { Attacker, Location, MountedWeapon } from '../rules/types'
import { HitReport } from './DamagePanel'
import { CollapsiblePanel } from './fields'
import { RollInput, RollStep } from './Rolls'

/** What the player does with critical hits: enter dice results, pick slots off the record sheet, apply and undo. */
export interface CritActions {
  onRoll: (id: string, value: number | null) => void
  onDie: (id: string, index: number, attempt: number, die: 'block' | 'slot', value: number | null) => void
  onPick: (id: string, index: number, item: CritItem | null) => void
  onApply: (id: string, index: number) => void
  onUndo: (id: string, index: number) => void
  onBlowOff: (id: string) => void
  onUndoBlowOff: (id: string) => void
}

interface Props {
  attacker: Attacker
  weapons: MountedWeapon[]
  checks: CritCheck[]
  /** Where each critical hit stands (see critHitState). */
  hitState: (check: CritCheck, index: number) => CritHitState
  /** Steps still to do, shown while the card is collapsed. */
  pending: number
  actions: CritActions
}

const ROLL_1D6 = [1, 2, 3, 4, 5, 6]

const KIND_TEXT: Record<CritCheck['kind'], string> = {
  structure: 'internal structure damaged',
  'through-armor': 'through-armor critical (location roll of 2)',
  destroyed: 'destroyed: only ammo can explode',
}

const slotName = (location: Location, slot: number): string =>
  slotCount(location) === 12 ? `slot ${(slot % 6) + 1} of the ${slot < 6 ? '1–3' : '4–6'} block` : `slot ${slot + 1}`

/** A slot as the record sheet prints it, e.g. "Medium Laser (R)" or "Ammo (LRM 20)". */
const slotLabel = (slot: string | null): string => {
  if (slot === null) return 'Roll Again'
  if (slot.startsWith('Ammo ')) return `Ammo (${WEAPONS_BY_KEY[slot.slice(5)]?.name ?? slot.slice(5)})`
  const rear = slot.endsWith(' (R)')
  const spec = WEAPONS_BY_KEY[rear ? slot.slice(0, -4) : slot]
  if (spec) return `${spec.name}${rear ? ' (R)' : ''}`
  return ['Shoulder', 'Hip', 'Engine', 'Gyro', 'Sensors', 'Cockpit', 'Life Support', 'Heat Sink', 'Jump Jet', 'CASE'].includes(slot) ? (slot === 'Engine' ? 'Fusion Engine' : slot) : `${slot} Actuator`
}

/** The location's Critical Hit Table, slots hit struck out and the rolled slot marked. */
const SlotTable = ({ attacker, location, marked }: { attacker: Attacker; location: Location; marked: number | null }) => {
  const slots = attacker.criticalSlots?.[location]
  if (!slots) return null
  const hit = attacker.critHits[location] ?? []
  const block = (from: number) => (
    <div>
      {slots.length > 6 && <span className="crit-block">{from === 0 ? '1–3' : '4–6'}</span>}
      <ol className="crit-table">
        {slots.slice(from, from + 6).map((s, i) => (
          <li key={i} className={`${hit.includes(from + i) ? 'crit-hit' : ''} ${marked === from + i ? 'crit-marked' : ''} ${s === null ? 'crit-empty' : ''}`}>
            {slotLabel(s)}
          </li>
        ))}
      </ol>
    </div>
  )
  return (
    <div className="crit-tables">
      {block(0)}
      {slots.length > 6 && block(6)}
    </div>
  )
}

const ItemPicker = ({ attacker, weapons, location, onPick }: { attacker: Attacker; weapons: MountedWeapon[]; location: Location; onPick: (item: CritItem | null) => void }) => {
  const options = [...itemsIn(attacker, weapons, location), { label: 'Nothing (Roll Again slot)', item: { kind: 'none' } as CritItem }]
  return (
    <select defaultValue="" aria-label="What the slot holds" onChange={(e) => onPick(e.target.value === '' ? null : options[Number(e.target.value)].item)}>
      <option value="">Pick what the slot holds…</option>
      {options.map((o, i) => (
        <option key={i} value={i}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

const CritHit = ({ check, index, state, props }: { check: CritCheck; index: number; state: CritHitState; props: Props }) => {
  const { attacker, weapons, actions } = props
  const hit = check.hits[index]
  const title = `Critical hit ${index + 1}`
  if (state.kind === 'applied' && hit.applied) {
    const { applied } = hit
    return (
      <div className="crit-hit-roll">
        {applied.explosion ? (
          <HitReport label={`${title}: ${applied.name} (${LOCATION_NAMES[applied.location]})`} groups={[applied.explosion]} explosion attacker={attacker} onUndo={() => actions.onUndo(check.id, index)} />
        ) : (
          <div className="hit-report-header">
            <strong>
              {title}: {applied.name} ({LOCATION_NAMES[applied.location]})
            </strong>
            <button type="button" className="small ghost" onClick={() => actions.onUndo(check.id, index)}>
              Undo
            </button>
          </div>
        )}
        <p className="msg-warn">{applied.effect}</p>
      </div>
    )
  }
  if (state.kind === 'lost') return <p className="muted">{title}: nothing left to hit, so it is lost.</p>
  const moved = 'location' in state && state.location !== check.location
  return (
    <div className="crit-hit-roll">
      <p>
        <strong>{title}</strong>
        {moved && ` transfers to the ${LOCATION_NAMES[state.location].toLowerCase()}: nothing left to hit in the ${LOCATION_NAMES[check.location].toLowerCase()}.`}
      </p>
      {state.kind === 'pick' && (
        <>
          <p className="muted">Roll on the {LOCATION_NAMES[state.location].toLowerCase()} of your record sheet’s Critical Hit Table, then pick what the slot holds.</p>
          <ItemPicker attacker={attacker} weapons={weapons} location={state.location} onPick={(item) => actions.onPick(check.id, index, item)} />
        </>
      )}
      {(state.kind === 'roll' || state.kind === 'ready') &&
        state.tries.map((t, i) => (
          <p key={i} className="muted">
            {slotName(state.location, t.slot)[0].toUpperCase() + slotName(state.location, t.slot).slice(1)} is {t.reason}: roll again.
          </p>
        ))}
      {state.kind === 'roll' && (
        <>
          <SlotTable attacker={attacker} location={state.location} marked={null} />
          {state.needsBlock && (
            <>
              <p>Roll 1D6 for the block: 1–3 the upper six slots, 4–6 the lower six.</p>
              <RollInput label={`${title}: block`} results={ROLL_1D6} value={hit.attempts[state.attempt]?.block ?? null} onChange={(v) => actions.onDie(check.id, index, state.attempt, 'block', v)} />
            </>
          )}
          <p>Roll 1D6 for the slot{state.needsBlock ? ' in that block' : ''}.</p>
          <RollInput label={`${title}: slot`} results={ROLL_1D6} value={hit.attempts[state.attempt]?.slot ?? null} onChange={(v) => actions.onDie(check.id, index, state.attempt, 'slot', v)} />
        </>
      )}
      {state.kind === 'ready' && (
        <>
          {state.slot !== null && <SlotTable attacker={attacker} location={state.location} marked={state.slot} />}
          <div className="explode-ammo">
            <span>
              {state.slot !== null && `${slotName(state.location, state.slot)[0].toUpperCase()}${slotName(state.location, state.slot).slice(1)}: `}
              <strong>{itemName(state.item)}</strong>
            </span>
            <button type="button" className="danger" onClick={() => actions.onApply(check.id, index)}>
              Apply critical hit
            </button>
            {state.slot === null && (
              <button type="button" className="small ghost" onClick={() => actions.onPick(check.id, index, null)}>
                Change
              </button>
            )}
            {state.slot !== null && (
              <button type="button" className="small ghost" onClick={() => actions.onDie(check.id, index, hit.attempts.length - 1, 'slot', null)}>
                Change roll
              </button>
            )}
          </div>
        </>
      )}
      {state.kind === 'discarded' && (
        <p className="muted">
          {slotName(state.location, state.slot)[0].toUpperCase() + slotName(state.location, state.slot).slice(1)}: {itemName(state.item)}. Not ammo that can explode, so the hit is discarded.
        </p>
      )}
    </div>
  )
}

const Check = ({ check, props }: { check: CritCheck; props: Props }) => {
  const { actions } = props
  const { hits, blownOff } = checkHits(check)
  const limb = check.location === 'HD' ? 'head' : LOCATION_NAMES[check.location].toLowerCase()
  return (
    <RollStep
      title={`${LOCATION_NAMES[check.location]} · ${KIND_TEXT[check.kind]}`}
      actions={<span className="dice-roll-meta muted">{check.source ? 'from the hit' : 'from damage'}</span>}
    >
      <p>
        Roll 2D6 on the Determining Critical Hits Table: <strong>8+</strong> for a critical hit.
      </p>
      <RollInput label={`${LOCATION_NAMES[check.location]}: Determining Critical Hits roll`} value={check.roll} onChange={(v) => actions.onRoll(check.id, v)} />
      {check.roll !== null && hits === 0 && !blownOff && <p className="msg-ok">No critical hit.</p>}
      {hits > 0 && <p className="msg-warn">{hits === 1 ? 'One critical hit.' : `${hits} critical hits.`} Resolve each one in turn.</p>}
      {blownOff &&
        (check.blownOff ? (
          <div className="hit-report-header">
            <strong className="msg-error-text">The {limb} is blown off.</strong>
            <button type="button" className="small ghost" onClick={() => actions.onUndoBlowOff(check.id)}>
              Undo
            </button>
          </div>
        ) : (
          <div className="explode-ammo">
            <span>
              12: the {limb} is blown off{check.location === 'HD' ? ', killing the MechWarrior' : ''}. Its armor and internal structure are not lost, and ammo in it does not explode.
            </span>
            <button type="button" className="danger" onClick={() => actions.onBlowOff(check.id)}>
              Blow off
            </button>
          </div>
        ))}
      {check.hits.slice(0, hits).map((_, i) => (
        <CritHit key={i} check={check} index={i} state={props.hitState(check, i)} props={props} />
      ))}
    </RollStep>
  )
}

/** Critical hit checks of the turn, made with physical dice against the 'Mech's Critical Hit Table. */
export const CritPanel = (props: Props) => {
  const { checks, pending } = props
  return (
    <CollapsiblePanel
      id="crits"
      title="Critical hits"
      className="crit-panel"
      summary={pending > 0 ? <span className="hot">{pending} to resolve</span> : checks.length ? `${checks.length} this turn` : 'None this turn'}
    >
      {checks.length === 0 ? (
        <p className="muted">No critical hit checks this turn. Internal structure damage and hit location rolls of 2 add them.</p>
      ) : (
        <div className="psr-list">
          {checks.map((c) => (
            <Check key={c.id} check={c} props={props} />
          ))}
        </div>
      )}
    </CollapsiblePanel>
  )
}
