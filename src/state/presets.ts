import type { Attacker, Location, MountedWeapon, Target } from '../rules/types'
import { defaultArm, defaultAttacker, defaultTarget, newWeapon } from './defaults'

/** Record sheet data per MegaMek unit files (mm-data) and Sarna.net. */

/** HGN-732 Highlander: 90 tons, walk 3 / jump 3, 12 single heat sinks. */
export function highlanderAttacker(name = 'Highlander HGN-732'): Attacker {
  return {
    ...defaultAttacker(),
    name,
    tonnage: 90,
    heatSinks: 12,
    leftArm: defaultArm(),
    // The right arm carries the Gauss Rifle and has no hand actuator.
    rightArm: { ...defaultArm(), hasHand: false },
  }
}

const HIGHLANDER_WEAPONS: [string, Location][] = [
  ['GAUSS', 'RA'],
  ['SRM6', 'LA'],
  ['LRM20', 'LT'],
  ['ML', 'RT'],
  ['ML', 'RT'],
]

export function highlanderWeapons(targetId: string): MountedWeapon[] {
  return HIGHLANDER_WEAPONS.map(([key, loc]) => newWeapon(key, loc, targetId))
}

/** HBK-4G Hunchback: 50 tons, walk 4. AC/20 (RT), medium lasers (LA, RA), small laser (HD). */
export function hunchbackTarget(): Target {
  return { ...defaultTarget('Hunchback HBK-4G', true), tonnage: 50, range: 5 }
}

/** LCT-1V Locust: 20 tons, walk 8. Medium laser (CT), machine guns (LA, RA). */
export function locustTarget(): Target {
  return { ...defaultTarget('Locust LCT-1V', false), tonnage: 20, range: 8 }
}
