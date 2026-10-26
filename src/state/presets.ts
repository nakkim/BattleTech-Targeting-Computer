import type { Target } from '../rules/types'
import type { AttackerOptions, Loadout } from './defaults'

/** Record sheet data per MegaMek unit files (mm-data) and Sarna.net. */

export interface MechPreset {
  attacker: AttackerOptions
  weapons: Loadout
  /** One entry per ton of ammunition and the location of its critical slot. */
  ammo?: Loadout
}

/** HGN-732 Highlander: 90 tons, walk 3 / jump 3, 12 single heat sinks. */
export const HIGHLANDER_HGN_732: MechPreset = {
  attacker: {
    name: 'Highlander HGN-732',
    tonnage: 90,
    heatSinks: 12,
    armor: { HD: 9, CT: 40, CTR: 16, LT: 28, LTR: 10, RT: 28, RTR: 10, LA: 30, RA: 30, LL: 38, RL: 38 },
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
  // Both torsos are protected by CASE (not used by these rules).
  ammo: [
    ['SRM6', 'LT'],
    ['SRM6', 'LT'],
    ['LRM20', 'LT'],
    ['LRM20', 'LT'],
    ['GAUSS', 'RT'],
    ['GAUSS', 'RT'],
  ],
}

/** HBK-4G Hunchback: 50 tons, walk 4. AC/20 (RT), medium lasers (LA, RA), small laser (HD). */
export const HUNCHBACK_HBK_4G: Partial<Target> = { name: 'Hunchback HBK-4G', tonnage: 50 }

/** LCT-1V Locust: 20 tons, walk 8. Medium laser (CT), machine guns (LA, RA). */
export const LOCUST_LCT_1V: Partial<Target> = { name: 'Locust LCT-1V', tonnage: 20 }
