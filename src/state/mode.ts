import { createContext, useContext } from 'react'
import type { Attacker } from '../rules/types'

/**
 * 'tracking' follows ammo, armor and internal structure from turn to turn.
 * 'plain' only works out hit or miss on 2D6: ammo never runs out and the
 * tracking cards are hidden. Tracked values are kept for switching back.
 */
export type AppMode = 'tracking' | 'plain'

export const ModeContext = createContext<AppMode>('tracking')

/** Whether ammo, armor and internal structure are tracked. */
export const useTracking = (): boolean => useContext(ModeContext) === 'tracking'

/** The attacker as the rules see it: without ammo bins, ammo is not tracked and never runs out. */
export const rulesAttacker = (attacker: Attacker, tracking: boolean): Attacker => {
  return tracking ? attacker : { ...attacker, ammoBins: [] }
}
