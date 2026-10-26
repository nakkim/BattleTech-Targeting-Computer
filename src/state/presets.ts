import type { Target } from '../rules/types'
import type { AttackerOptions, Loadout } from './defaults'

/** Record sheet data per MegaMek unit files (mm-data) and Sarna.net. */

export interface MechPreset {
  attacker: AttackerOptions
  weapons: Loadout
}

/** HGN-732 Highlander: 90 tons, walk 3 / jump 3, 12 single heat sinks. */
export const HIGHLANDER_HGN_732: MechPreset = {
  attacker: {
    name: 'Highlander HGN-732',
    tonnage: 90,
    heatSinks: 12,
    // The right arm carries the Gauss Rifle and has no hand actuator.
    rightArm: { hasHand: false },
  },
  weapons: [
    ['GAUSS', 'RA'],
    ['SRM6', 'LA'],
    ['LRM20', 'LT'],
    ['ML', 'RT'],
    ['ML', 'RT'],
  ],
}

/** HBK-4G Hunchback: 50 tons, walk 4. AC/20 (RT), medium lasers (LA, RA), small laser (HD). */
export const HUNCHBACK_HBK_4G: Partial<Target> = { name: 'Hunchback HBK-4G', tonnage: 50 }

/** LCT-1V Locust: 20 tons, walk 8. Medium laser (CT), machine guns (LA, RA). */
export const LOCUST_LCT_1V: Partial<Target> = { name: 'Locust LCT-1V', tonnage: 20 }
