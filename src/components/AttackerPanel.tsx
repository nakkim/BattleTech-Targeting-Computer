import { destroyedReason, hasLocation, isLocationDestroyed, isMechDestroyed } from '../rules/destruction'
import { workingHeatSinks } from '../rules/heat'
import { LOCATION_NAMES, MOVEMENT_NAMES } from '../rules/tables'
import type { ArmState, Attacker, LegState, Location, MovementMode } from '../rules/types'
import { WATER_OPTIONS } from './options'
import { CollapsiblePanel, NumberField, Panel, Segmented, Toggle } from './fields'

interface Props {
  attacker: Attacker
  onChange: (attacker: Attacker) => void
}

const MOVEMENT_OPTIONS = (Object.keys(MOVEMENT_NAMES) as MovementMode[]).map((m) => ({ value: m, label: MOVEMENT_NAMES[m] }))

/** Actuators and hatchet of an arm as text, e.g. "Lower arm, hand". */
const armSummary = (arm: ArmState): string => {
  if (!arm.present) return 'None'
  const parts = [arm.hasLowerArm && 'lower arm', arm.hasHand && 'hand', arm.hasHatchet && 'hatchet'].filter(Boolean).join(', ')
  return parts ? parts[0].toUpperCase() + parts.slice(1) : 'Upper arm only'
}

/** Record sheet data that stays fixed during a game. Edited in the 'Mech dialog. */
export const MechDataPanel = ({ attacker, onEdit }: { attacker: Attacker; onEdit: () => void }) => {
  const hatchets = [attacker.leftArm.present && attacker.leftArm.hasHatchet && 'LA', attacker.rightArm.present && attacker.rightArm.hasHatchet && 'RA'].filter(Boolean)
  const missingArms = [!attacker.leftArm.present && 'LA', !attacker.rightArm.present && 'RA'].filter(Boolean)
  const rows: [string, string | number][] = [
    ['Name', attacker.name || 'Unnamed'],
    ['Gunnery', attacker.gunnery],
    ['Piloting', attacker.piloting],
    ['Tonnage', `${attacker.tonnage} t`],
    ['Heat sinks', attacker.heatSinkHits > 0 ? `${attacker.heatSinks} (${attacker.heatSinkHits} destroyed)` : attacker.heatSinks],
    ['Left arm', armSummary(attacker.leftArm)],
    ['Right arm', armSummary(attacker.rightArm)],
  ]
  return (
    <CollapsiblePanel
      id="mech-data"
      title="'Mech data"
      className="mech-data"
      actions={
        <button type="button" className="small" onClick={onEdit} title="Edit name, skills, tonnage, heat sinks, arms and weapons">
          Edit
        </button>
      }
      summary={
        <>
          G{attacker.gunnery} P{attacker.piloting} · {attacker.tonnage}t · {attacker.heatSinkHits > 0 ? `${workingHeatSinks(attacker)}/${attacker.heatSinks}` : attacker.heatSinks} HS
          {hatchets.length > 0 && ` · hatchet ${hatchets.join('/')}`}
          {missingArms.length === 2 ? ' · no arms' : missingArms.length === 1 && ` · no ${missingArms[0]}`}
        </>
      }
    >
      <dl className="spec-list">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </CollapsiblePanel>
  )
}

/** Why a limb's damage boxes are unavailable: the 'Mech has no such limb, or it is destroyed. */
interface LimbLoss {
  /** Shown after the legend, e.g. "none" or "destroyed". */
  status: string
  /** Tooltip, e.g. "Left arm lost with the left torso". */
  reason: string
}

const limbLoss = (attacker: Attacker, location: Location): LimbLoss | null => {
  const reason = destroyedReason(attacker, location)
  if (!reason) return null
  return { status: hasLocation(attacker, location) ? 'destroyed' : 'none', reason }
}

type DamageBox = [label: string, checked: boolean, set: (v: boolean) => void]

/** Damage boxes of one limb, greyed out and empty when the limb is missing or destroyed. */
const LimbDamage = ({ title, loss, boxes }: { title: string; loss: LimbLoss | null; boxes: DamageBox[] }) => {
  return (
    <fieldset className={`limb ${loss ? 'limb-absent' : ''}`} disabled={!!loss} title={loss?.reason}>
      <legend>
        {title}
        {loss && ` (${loss.status})`}
      </legend>
      {boxes.map(([label, checked, set]) => (
        <Toggle key={label} label={label} checked={checked && !loss} onChange={set} disabled={!!loss} />
      ))}
    </fieldset>
  )
}

const ArmDamage = ({ title, arm, loss, onChange }: { title: string; arm: ArmState; loss: LimbLoss | null; onChange: (arm: ArmState) => void }) => {
  const set = (patch: Partial<ArmState>) => onChange({ ...arm, ...patch })
  const boxes: DamageBox[] = [
    ['Shoulder damaged', arm.shoulderHit, (v) => set({ shoulderHit: v })],
    ['Upper arm damaged', arm.upperArmHit, (v) => set({ upperArmHit: v })],
  ]
  // Actuators the 'Mech was built without cannot be damaged.
  if (arm.hasLowerArm) boxes.push(['Lower arm damaged', arm.lowerArmHit, (v) => set({ lowerArmHit: v })])
  if (arm.hasHand) boxes.push(['Hand damaged', arm.handHit, (v) => set({ handHit: v })])
  return <LimbDamage title={title} loss={loss} boxes={boxes} />
}

const LegDamage = ({ title, leg, loss, onChange }: { title: string; leg: LegState; loss: LimbLoss | null; onChange: (leg: LegState) => void }) => {
  const set = (patch: Partial<LegState>) => onChange({ ...leg, ...patch })
  return (
    <LimbDamage
      title={title}
      loss={loss}
      boxes={[
        ['Hip damaged', leg.hipHit, (v) => set({ hipHit: v })],
        ['Upper leg damaged', leg.upperLegHit, (v) => set({ upperLegHit: v })],
        ['Lower leg damaged', leg.lowerLegHit, (v) => set({ lowerLegHit: v })],
        ['Foot damaged', leg.footHit, (v) => set({ footHit: v })],
      ]}
    />
  )
}

/** Rows laid out like the record sheet's armor diagram (left side on the left). */
const LOCATION_GRID: (Location | null)[][] = [
  [null, null, 'HD', null, null],
  ['LA', 'LT', 'CT', 'RT', 'RA'],
  [null, 'LL', null, 'RL', null],
]

const DestroyedLocations = ({ attacker, onChange }: { attacker: Attacker; onChange: (locations: Location[]) => void }) => {
  const lost = attacker.destroyedLocations
  const toggle = (loc: Location) => onChange(lost.includes(loc) ? lost.filter((l) => l !== loc) : [...lost, loc])
  return (
    <fieldset className="limb destroyed-locations">
      <legend>Destroyed locations</legend>
      <div className="location-grid">
        {LOCATION_GRID.flat().map((loc, i) => {
          if (!loc) return <span key={i} />
          if (!hasLocation(attacker, loc))
            return (
              <button key={loc} type="button" className="location-toggle absent" disabled title={`This 'Mech has no ${LOCATION_NAMES[loc].toLowerCase()}`}>
                {loc}
              </button>
            )
          const direct = lost.includes(loc)
          const implied = !direct && isLocationDestroyed(attacker, loc)
          return (
            <button
              key={loc}
              type="button"
              aria-pressed={direct}
              className={`location-toggle ${direct ? 'destroyed' : ''} ${implied ? 'implied' : ''}`}
              onClick={() => toggle(loc)}
              title={
                direct
                  ? `${LOCATION_NAMES[loc]} destroyed: click to restore`
                  : implied
                    ? `${LOCATION_NAMES[loc]} is lost with another location`
                    : `Mark ${LOCATION_NAMES[loc].toLowerCase()} destroyed${loc === 'HD' || loc === 'CT' ? ' (destroys the \u2019Mech)' : loc === 'LT' || loc === 'RT' ? ' (also blows off the arm)' : ''}`
              }
            >
              {loc}
            </button>
          )
        })}
      </div>
      <span className="field-hint">Laid out as on the record sheet. Weapons in destroyed locations cannot fire. A side torso takes its arm with it.</span>
    </fieldset>
  )
}

/** Values that change from turn to turn: movement, heat, position and damage. */
export const AttackerPanel = ({ attacker, onChange }: Props) => {
  const set = (patch: Partial<Attacker>) => onChange({ ...attacker, ...patch })
  const { leftArm, rightArm } = attacker
  const anyArm = leftArm.present || rightArm.present
  return (
    <Panel title="This turn" className="attacker">
      {isMechDestroyed(attacker) && (
        <ul className="messages">
          <li className="msg-error">
            {attacker.destroyedLocations.includes('HD') ? 'Head' : 'Center torso'} destroyed: {attacker.name || 'this \u2019Mech'} is out of action.
          </li>
        </ul>
      )}
      <Segmented label="Movement" value={attacker.movement} options={MOVEMENT_OPTIONS} onChange={(v) => set({ movement: v })} />
      <div className="grid-3">
        <NumberField
          label="Hexes moved"
          value={attacker.hexesMoved}
          onChange={(v) => set({ hexesMoved: v })}
          hint="Charge damage, jump heat"
        />
        <NumberField label="Current heat" value={attacker.heat} onChange={(v) => set({ heat: v })} max={50} />
        <Segmented
          label="Sensor hits"
          value={attacker.sensorHits}
          options={[0, 1, 2].map((n) => ({ value: n, label: String(n) }))}
          onChange={(v) => set({ sensorHits: v })}
        />
      </div>
      <div className="toggles">
        <Toggle label="Prone" checked={attacker.prone} onChange={(v) => set({ prone: v, torsoTwisted: v ? false : attacker.torsoTwisted, armsFlipped: v ? false : attacker.armsFlipped })} />
        <Toggle label="Torso twisted" checked={attacker.torsoTwisted} onChange={(v) => set({ torsoTwisted: v, armsFlipped: v ? false : attacker.armsFlipped, prone: v ? false : attacker.prone })} />
        <Toggle label="Arms flipped" checked={attacker.armsFlipped && anyArm} disabled={!anyArm} title={anyArm ? undefined : 'This ’Mech has no arms'} onChange={(v) => set({ armsFlipped: v, torsoTwisted: v ? false : attacker.torsoTwisted, prone: v ? false : attacker.prone })} />
        <Toggle label="Holding club" checked={attacker.hasClub} onChange={(v) => set({ hasClub: v })} />
        <Toggle label="Shut down" checked={attacker.shutdown} onChange={(v) => set({ shutdown: v })} title="Power plant shut down by heat or by choice: the ’Mech cannot move or attack" />
      </div>
      {attacker.prone && leftArm.present && rightArm.present && (
        <Segmented
          label="Arm propping up the 'Mech (cannot fire)"
          value={attacker.proneBracingArm}
          options={[
            { value: 'LA', label: 'Left arm' },
            { value: 'RA', label: 'Right arm' },
          ]}
          onChange={(v) => set({ proneBracingArm: v })}
        />
      )}
      <Segmented
        label="Water"
        value={attacker.waterDepth}
        options={WATER_OPTIONS}
        onChange={(v) => set({ waterDepth: v })}
      />
      {attacker.waterDepth > 0 && (
        <NumberField
          label="Submerged heat sinks"
          value={attacker.submergedHeatSinks}
          onChange={(v) => set({ submergedHeatSinks: v })}
          max={workingHeatSinks(attacker)}
          hint="Extra –1 heat each, max 6"
        />
      )}
      <details className="damage">
        <summary>
          Critical damage
          {attacker.destroyedLocations.length > 0 && (
            <span className="summary-badge">
              {isMechDestroyed(attacker) ? '\u2019Mech destroyed' : `${attacker.destroyedLocations.length} destroyed`}
            </span>
          )}
        </summary>
        <DestroyedLocations attacker={attacker} onChange={(destroyedLocations) => set({ destroyedLocations })} />
        <div className="limbs">
          <ArmDamage title="Left arm" arm={leftArm} loss={limbLoss(attacker, 'LA')} onChange={(leftArm) => set({ leftArm })} />
          <ArmDamage title="Right arm" arm={rightArm} loss={limbLoss(attacker, 'RA')} onChange={(rightArm) => set({ rightArm })} />
          <LegDamage title="Left leg" leg={attacker.leftLeg} loss={limbLoss(attacker, 'LL')} onChange={(leftLeg) => set({ leftLeg })} />
          <LegDamage title="Right leg" leg={attacker.rightLeg} loss={limbLoss(attacker, 'RL')} onChange={(rightLeg) => set({ rightLeg })} />
        </div>
        <NumberField
          label="Heat sinks destroyed"
          value={Math.min(attacker.heatSinkHits, attacker.heatSinks)}
          onChange={(heatSinkHits) => set({ heatSinkHits, submergedHeatSinks: Math.min(attacker.submergedHeatSinks, attacker.heatSinks - heatSinkHits) })}
          max={attacker.heatSinks}
          hint={`${workingHeatSinks(attacker)} of ${attacker.heatSinks} working: each one destroyed dissipates 1 less heat`}
        />
        <Segmented
          label="Engine hits"
          value={attacker.engineHits}
          options={[
            { value: 0, label: '0' },
            { value: 1, label: '1' },
            { value: 2, label: '2' },
            { value: 3, label: '3 (destroyed)' },
          ]}
          onChange={(v) => set({ engineHits: v })}
        />
        <Segmented
          label="Gyro hits"
          value={attacker.gyroHits}
          options={[
            { value: 0, label: '0' },
            { value: 1, label: '1 (damaged)' },
            { value: 2, label: '2 (destroyed)' },
          ]}
          onChange={(v) => set({ gyroHits: v })}
          title="Damaged: +3 to Piloting Skill Rolls. Destroyed: +3 more, and the ’Mech falls and cannot stand"
        />
        <div className="toggles">
          <Toggle label="Life support damaged" checked={attacker.lifeSupportHit} onChange={(v) => set({ lifeSupportHit: v })} title="The MechWarrior takes 1 damage in the Heat Phase at 15–25 heat, 2 at 26+" />
          <Toggle label="Cockpit destroyed" checked={attacker.cockpitHit} onChange={(v) => set({ cockpitHit: v })} title="The MechWarrior is killed and the ’Mech destroyed" />
        </div>
      </details>
    </Panel>
  )
}
