import { useState } from 'react'
import { hasLocation } from '../rules/destruction'
import { LOCATION_NAMES, LOCATIONS, WEAPONS_BY_KEY } from '../rules/tables'
import type { ArmState, Attacker, MountedWeapon } from '../rules/types'
import { newWeapon } from '../state/defaults'
import { Dialog } from './InfoDialog'
import { NumberField, Toggle } from './fields'
import { WeaponPicker } from './WeaponPicker'

const ArmDesign = ({ title, arm, onChange }: { title: string; arm: ArmState; onChange: (arm: ArmState) => void }) => {
  const set = (patch: Partial<ArmState>) => onChange({ ...arm, ...patch })
  return (
    <fieldset className="limb">
      <legend>{title}</legend>
      <Toggle label="Has this arm" checked={arm.present} onChange={(v) => set({ present: v })} title="Uncheck for a 'Mech built without this arm" />
      {arm.present && (
        <>
          <Toggle label="Lower arm actuator" checked={arm.hasLowerArm} onChange={(v) => set({ hasLowerArm: v, hasHand: v && arm.hasHand })} />
          <Toggle label="Hand actuator" checked={arm.hasHand} onChange={(v) => set({ hasHand: v })} />
          <Toggle label="Hatchet" checked={arm.hasHatchet} onChange={(v) => set({ hasHatchet: v })} />
        </>
      )}
    </fieldset>
  )
}

interface Props {
  title: string
  submitLabel: string
  attacker: Attacker
  weapons: MountedWeapon[]
  /** Target that newly mounted weapons aim at. */
  targetId: string
  onSave: (attacker: Attacker, weapons: MountedWeapon[]) => void
  onClose: () => void
}

/** Record sheet data of a 'Mech: name, skills, tonnage, heat sinks, arms and weapons. */
export const MechDialog = ({ title, submitLabel, targetId, onSave, onClose, ...initial }: Props) => {
  const [attacker, setAttacker] = useState(initial.attacker)
  const [weapons, setWeapons] = useState(initial.weapons)
  const set = (patch: Partial<Attacker>) => setAttacker({ ...attacker, ...patch })

  const submit = () => {
    // Weapons in an arm the 'Mech no longer has are dropped.
    onSave({ ...attacker, name: attacker.name.trim() || initial.attacker.name }, weapons.filter((w) => hasLocation(attacker, w.location)))
    onClose()
  }

  return (
    <Dialog
      title={title}
      open
      onClose={onClose}
      className="mech-dialog"
      footer={
        <>
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={submit}>
            {submitLabel}
          </button>
        </>
      }
    >
      <form
        className="mech-form"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <label className="field name-field">
          <span className="field-label">Name</span>
          <input value={attacker.name} autoFocus onChange={(e) => set({ name: e.target.value })} />
        </label>
        <div className="grid-3">
          <NumberField label="Gunnery" value={attacker.gunnery} onChange={(gunnery) => set({ gunnery })} max={8} />
          <NumberField label="Piloting" value={attacker.piloting} onChange={(piloting) => set({ piloting })} max={8} />
          <NumberField label="Tonnage" value={attacker.tonnage} onChange={(tonnage) => set({ tonnage })} min={20} max={100} />
        </div>
        <div className="grid-3">
          <NumberField label="Heat sinks" value={attacker.heatSinks} onChange={(heatSinks) => set({ heatSinks })} max={60} />
        </div>
        <div className="limbs">
          <ArmDesign title="Left arm" arm={attacker.leftArm} onChange={(leftArm) => set({ leftArm })} />
          <ArmDesign title="Right arm" arm={attacker.rightArm} onChange={(rightArm) => set({ rightArm })} />
        </div>
        <fieldset className="limb">
          <legend>Weapons</legend>
          {weapons.length === 0 ? (
            <p className="muted">No weapons mounted.</p>
          ) : (
            <ul className="loadout">
              {weapons.map((w) => {
                const name = WEAPONS_BY_KEY[w.weaponKey].name
                const missing = !hasLocation(attacker, w.location)
                return (
                  <li key={w.id} className={missing ? 'loadout-missing' : ''} title={missing ? `Not mounted: this 'Mech has no ${LOCATION_NAMES[w.location].toLowerCase()}` : undefined}>
                    <strong>{name}</strong>
                    <span className="muted">
                      {LOCATION_NAMES[w.location]}
                      {w.rear ? ' (rear)' : ''}
                    </span>
                    <button
                      type="button"
                      className="small ghost"
                      aria-label={`Remove ${name}`}
                      title="Remove weapon"
                      onClick={() => setWeapons(weapons.filter((x) => x.id !== w.id))}
                    >
                      ×
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <WeaponPicker
            locations={LOCATIONS.filter((l) => hasLocation(attacker, l))}
            onMount={(key, location) => setWeapons([...weapons, newWeapon(key, location, targetId)])}
            title="Add the weapon to the 'Mech's loadout"
          />
        </fieldset>
      </form>
    </Dialog>
  )
}
