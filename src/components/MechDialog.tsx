import { useState } from 'react'
import { ammoTypes, shotsPerBin } from '../rules/ammo'
import { hasLocation } from '../rules/destruction'
import { LOCATION_NAMES, LOCATIONS, WEAPONS_BY_KEY } from '../rules/tables'
import { facingLocation, maxArmor, maxArmorFacings, REAR_FACING, structureOf } from '../rules/damage'
import type { AmmoBin, ArmorFacing, ArmState, Attacker, Location, MountedWeapon } from '../rules/types'
import { newAmmoBin, newWeapon } from '../state/defaults'
import { useTracking } from '../state/mode'
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

/** Armor facings laid out like the record sheet's armor diagram: torsos, rear torsos, arms and head, legs. */
const ARMOR_GRID: (ArmorFacing | null)[] = ['LT', 'CT', 'RT', 'LTR', 'CTR', 'RTR', 'LA', 'HD', 'RA', 'LL', null, 'RL']

/** Armor points per facing as on the record sheet. Torsos split their maximum between front and rear. */
const ArmorEditor = ({ attacker, onChange }: { attacker: Attacker; onChange: (armor: Record<ArmorFacing, number>) => void }) => {
  const { armor, tonnage } = attacker
  const set = (facing: ArmorFacing, value: number) => onChange({ ...armor, [facing]: value })
  const total = (l: Location) => armor[l] + (REAR_FACING[l] ? armor[REAR_FACING[l]] : 0)
  const over = LOCATIONS.filter((l) => hasLocation(attacker, l) && total(l) > maxArmor(tonnage, l))
  return (
    <fieldset className="limb armor-editor">
      <legend>Armor</legend>
      <div className="grid-3">
        {ARMOR_GRID.map((facing, i) => {
          const l = facing && facingLocation(facing)
          if (!facing || !l || !hasLocation(attacker, l)) return <span key={i} />
          const max = maxArmor(tonnage, l)
          const rear = facing !== l
          const other = rear ? armor[l] : REAR_FACING[l] ? armor[REAR_FACING[l]] : 0
          const hint = rear ? `Front + rear max ${max}` : `IS ${structureOf(tonnage, l)} · max ${max}`
          return (
            <NumberField key={facing} label={rear ? `${LOCATION_NAMES[l]} rear` : LOCATION_NAMES[l]} value={armor[facing]} onChange={(v) => set(facing, v)} max={max - other} hint={hint} />
          )
        })}
      </div>
      {over.length > 0 && <p className="msg-warn-text">Over the maximum for {tonnage} tons: {over.map((l) => LOCATION_NAMES[l]).join(', ')}.</p>}
      <button type="button" className="small ghost" onClick={() => onChange(maxArmorFacings(tonnage))} title="Every location at its maximum, torsos split about 3:1 front to rear">
        Fill to maximum
      </button>
    </fieldset>
  )
}

/** One row per ton of ammunition, with the location of its critical slot. */
const AmmoBinEditor = ({ bins, types, locations, onChange }: { bins: AmmoBin[]; types: string[]; locations: Location[]; onChange: (bins: AmmoBin[]) => void }) => {
  const [weaponKey, setWeaponKey] = useState(types[0] ?? '')
  const [location, setLocation] = useState<Location>('LT')
  const addKey = types.includes(weaponKey) ? weaponKey : types[0]
  const addAt = locations.includes(location) ? location : locations[0]
  const set = (bin: AmmoBin) => onChange(bins.map((b) => (b.id === bin.id ? bin : b)))

  return (
    <fieldset className="limb">
      <legend>Ammunition (one bin per ton)</legend>
      {bins.length === 0 ? (
        <p className="muted">No ammo bins: ammunition weapons fire without limit.</p>
      ) : (
        <ul className="loadout">
          {bins.map((bin) => {
            const missing = !locations.includes(bin.location)
            const unused = !types.includes(bin.weaponKey)
            return (
              <li key={bin.id} className={missing ? 'loadout-missing' : ''} title={missing ? `Not carried: this 'Mech has no ${LOCATION_NAMES[bin.location].toLowerCase()}` : undefined}>
                <strong>{WEAPONS_BY_KEY[bin.weaponKey].name}</strong>
                <select
                  className="loadout-location"
                  value={bin.location}
                  onChange={(e) => set({ ...bin, location: e.target.value as Location })}
                  aria-label="Ammo bin location"
                  title="Location of the ammo's critical slot"
                >
                  {(missing ? [bin.location, ...locations] : locations).map((l) => (
                    <option key={l} value={l}>
                      {LOCATION_NAMES[l]}
                    </option>
                  ))}
                </select>
                <span className="muted">
                  {bin.shots}/{shotsPerBin(bin.weaponKey)} shots{unused ? ' · no weapon uses it' : ''}
                </span>
                <button type="button" className="small ghost" aria-label="Remove ammo bin" title="Remove ammo bin" onClick={() => onChange(bins.filter((b) => b.id !== bin.id))}>
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {types.length > 0 && (
        <div className="add-weapon">
          <select value={addKey} onChange={(e) => setWeaponKey(e.target.value)} aria-label="Ammo type" title="Weapon the ammo is for">
            {types.map((key) => (
              <option key={key} value={key}>
                {WEAPONS_BY_KEY[key].name} ({shotsPerBin(key)} shots)
              </option>
            ))}
          </select>
          <select value={addAt} onChange={(e) => setLocation(e.target.value as Location)} aria-label="Ammo location" title="Location of the ammo's critical slot">
            {locations.map((l) => (
              <option key={l} value={l}>
                {LOCATION_NAMES[l]}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => onChange([...bins, newAmmoBin(addKey, addAt)])} title="Add one full ton of ammunition">
            + Add ton
          </button>
        </div>
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
  const tracking = useTracking()
  const set = (patch: Partial<Attacker>) => setAttacker({ ...attacker, ...patch })

  const mounted = weapons.filter((w) => hasLocation(attacker, w.location))
  const locations = LOCATIONS.filter((l) => hasLocation(attacker, l))

  const submit = () => {
    // Weapons and ammo in an arm the 'Mech no longer has are dropped.
    const ammoBins = attacker.ammoBins.filter((b) => hasLocation(attacker, b.location))
    onSave({ ...attacker, name: attacker.name.trim() || initial.attacker.name, ammoBins }, mounted)
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
        {tracking && <ArmorEditor attacker={attacker} onChange={(armor) => set({ armor })} />}
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
        {tracking && <AmmoBinEditor bins={attacker.ammoBins} types={ammoTypes(mounted)} locations={locations} onChange={(ammoBins) => set({ ammoBins })} />}
      </form>
    </Dialog>
  )
}
