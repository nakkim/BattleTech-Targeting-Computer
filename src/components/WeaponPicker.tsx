import { useState } from 'react'
import { LOCATION_NAMES, WEAPONS } from '../rules/tables'
import type { Location } from '../rules/types'

interface Props {
  /** Locations the weapon can be mounted in. */
  locations: Location[]
  onMount: (weaponKey: string, location: Location) => void
  /** Tooltip of the mount button. */
  title: string
}

/** Weapon and location selects with a button that mounts the chosen weapon. */
export const WeaponPicker = ({ locations, onMount, title }: Props) => {
  const [weaponKey, setWeaponKey] = useState('ML')
  const [location, setLocation] = useState<Location>('RA')
  const mountAt = locations.includes(location) ? location : locations[0]

  return (
    <div className="add-weapon">
      <select value={weaponKey} onChange={(e) => setWeaponKey(e.target.value)} aria-label="Weapon" title="Weapon to mount">
        {(['energy', 'ballistic', 'missile'] as const).map((cat) => (
          <optgroup key={cat} label={cat[0].toUpperCase() + cat.slice(1)}>
            {WEAPONS.filter((w) => w.category === cat).map((w) => (
              <option key={w.key} value={w.key}>
                {w.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <select value={mountAt} onChange={(e) => setLocation(e.target.value as Location)} aria-label="Location" title="Location the weapon is mounted in (sets its firing arcs)">
        {locations.map((l) => (
          <option key={l} value={l}>
            {LOCATION_NAMES[l]}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => onMount(weaponKey, mountAt)} title={title}>
        + Mount weapon
      </button>
    </div>
  )
}
