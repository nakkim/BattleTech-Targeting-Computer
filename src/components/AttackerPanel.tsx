import { isLocationDestroyed, isMechDestroyed } from '../rules/destruction'
import { LOCATION_NAMES, MOVEMENT_NAMES } from '../rules/tables'
import type { ArmState, Attacker, LegState, Location, MovementMode } from '../rules/types'
import { WATER_OPTIONS } from './options'
import { CollapsiblePanel, NumberField, Panel, Segmented, Toggle } from './fields'

interface Props {
  attacker: Attacker
  onChange: (attacker: Attacker) => void
}

const MOVEMENT_OPTIONS = (Object.keys(MOVEMENT_NAMES) as MovementMode[]).map((m) => ({ value: m, label: MOVEMENT_NAMES[m] }))

function ArmDesign({ title, arm, onChange }: { title: string; arm: ArmState; onChange: (arm: ArmState) => void }) {
  const set = (patch: Partial<ArmState>) => onChange({ ...arm, ...patch })
  return (
    <fieldset className="limb">
      <legend>{title}</legend>
      <Toggle label="Lower arm actuator" checked={arm.hasLowerArm} onChange={(v) => set({ hasLowerArm: v, hasHand: v && arm.hasHand })} />
      <Toggle label="Hand actuator" checked={arm.hasHand} onChange={(v) => set({ hasHand: v })} />
      <Toggle label="Hatchet" checked={arm.hasHatchet} onChange={(v) => set({ hasHatchet: v })} />
    </fieldset>
  )
}

/** Record sheet data that stays fixed during a game. */
export function MechDataPanel({ attacker, onChange }: Props) {
  const set = (patch: Partial<Attacker>) => onChange({ ...attacker, ...patch })
  const hatchets = [attacker.leftArm.hasHatchet && 'LA', attacker.rightArm.hasHatchet && 'RA'].filter(Boolean)
  return (
    <CollapsiblePanel
      id="mech-data"
      title="'Mech data"
      className="mech-data"
      summary={
        <>
          G{attacker.gunnery} P{attacker.piloting} · {attacker.tonnage}t · {attacker.heatSinks} HS
          {hatchets.length > 0 && ` · hatchet ${hatchets.join('/')}`}
        </>
      }
    >
      <label className="field name-field">
        <span className="field-label">Name</span>
        <input value={attacker.name} onChange={(e) => set({ name: e.target.value })} />
      </label>
      <div className="grid-3">
        <NumberField label="Gunnery" value={attacker.gunnery} onChange={(v) => set({ gunnery: v })} max={8} />
        <NumberField label="Piloting" value={attacker.piloting} onChange={(v) => set({ piloting: v })} max={8} />
        <NumberField label="Tonnage" value={attacker.tonnage} onChange={(v) => set({ tonnage: v })} min={20} max={100} />
      </div>
      <div className="grid-3">
        <NumberField label="Heat sinks" value={attacker.heatSinks} onChange={(v) => set({ heatSinks: v })} max={60} />
      </div>
      <div className="limbs">
        <ArmDesign title="Left arm" arm={attacker.leftArm} onChange={(leftArm) => set({ leftArm })} />
        <ArmDesign title="Right arm" arm={attacker.rightArm} onChange={(rightArm) => set({ rightArm })} />
      </div>
    </CollapsiblePanel>
  )
}

function ArmDamage({ title, arm, onChange }: { title: string; arm: ArmState; onChange: (arm: ArmState) => void }) {
  const set = (patch: Partial<ArmState>) => onChange({ ...arm, ...patch })
  return (
    <fieldset className="limb">
      <legend>{title}</legend>
      <Toggle label="Shoulder hit" checked={arm.shoulderHit} onChange={(v) => set({ shoulderHit: v })} />
      <Toggle label="Upper arm hit" checked={arm.upperArmHit} onChange={(v) => set({ upperArmHit: v })} />
      {arm.hasLowerArm && <Toggle label="Lower arm hit" checked={arm.lowerArmHit} onChange={(v) => set({ lowerArmHit: v })} />}
      {arm.hasHand && <Toggle label="Hand hit" checked={arm.handHit} onChange={(v) => set({ handHit: v })} />}
    </fieldset>
  )
}

function LegDamage({ title, leg, onChange }: { title: string; leg: LegState; onChange: (leg: LegState) => void }) {
  const set = (patch: Partial<LegState>) => onChange({ ...leg, ...patch })
  return (
    <fieldset className="limb">
      <legend>{title}</legend>
      <Toggle label="Hip hit" checked={leg.hipHit} onChange={(v) => set({ hipHit: v })} />
      <Toggle label="Upper leg hit" checked={leg.upperLegHit} onChange={(v) => set({ upperLegHit: v })} />
      <Toggle label="Lower leg hit" checked={leg.lowerLegHit} onChange={(v) => set({ lowerLegHit: v })} />
      <Toggle label="Foot hit" checked={leg.footHit} onChange={(v) => set({ footHit: v })} />
    </fieldset>
  )
}

/** Rows laid out like the record sheet's armor diagram (left side on the left). */
const LOCATION_GRID: (Location | null)[][] = [
  [null, null, 'HD', null, null],
  ['LA', 'LT', 'CT', 'RT', 'RA'],
  [null, 'LL', null, 'RL', null],
]

function DestroyedLocations({ attacker, onChange }: { attacker: Attacker; onChange: (locations: Location[]) => void }) {
  const lost = attacker.destroyedLocations
  const toggle = (loc: Location) => onChange(lost.includes(loc) ? lost.filter((l) => l !== loc) : [...lost, loc])
  return (
    <fieldset className="limb destroyed-locations">
      <legend>Destroyed locations</legend>
      <div className="location-grid">
        {LOCATION_GRID.flat().map((loc, i) => {
          if (!loc) return <span key={i} />
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
export function AttackerPanel({ attacker, onChange }: Props) {
  const set = (patch: Partial<Attacker>) => onChange({ ...attacker, ...patch })
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
        <Toggle label="Arms flipped" checked={attacker.armsFlipped} onChange={(v) => set({ armsFlipped: v, torsoTwisted: v ? false : attacker.torsoTwisted, prone: v ? false : attacker.prone })} />
        <Toggle label="Holding club" checked={attacker.hasClub} onChange={(v) => set({ hasClub: v })} />
      </div>
      {attacker.prone && (
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
          max={attacker.heatSinks}
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
          <ArmDamage title="Left arm" arm={attacker.leftArm} onChange={(leftArm) => set({ leftArm })} />
          <ArmDamage title="Right arm" arm={attacker.rightArm} onChange={(rightArm) => set({ rightArm })} />
          <LegDamage title="Left leg" leg={attacker.leftLeg} onChange={(leftLeg) => set({ leftLeg })} />
          <LegDamage title="Right leg" leg={attacker.rightLeg} onChange={(rightLeg) => set({ rightLeg })} />
        </div>
        <Segmented
          label="Engine hits"
          value={attacker.engineHits}
          options={[0, 1, 2].map((n) => ({ value: n, label: String(n) }))}
          onChange={(v) => set({ engineHits: v })}
        />
      </details>
    </Panel>
  )
}
