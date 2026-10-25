import { LOCATION_NAMES } from './tables'
import type { Attacker, Location, MountedWeapon } from './types'

/** Destroying the head or center torso destroys the whole 'Mech (p. 34). */
export const isMechDestroyed = (attacker: Pick<Attacker, 'destroyedLocations'>): boolean => {
  const lost = attacker.destroyedLocations
  return lost.includes('HD') || lost.includes('CT')
}

/** The location that takes an arm with it when destroyed. */
const ARM_TORSO: Partial<Record<Location, Location>> = { LA: 'LT', RA: 'RT' }

/**
 * Whether a location is gone: destroyed itself, blown off with its side torso,
 * or the whole 'Mech is destroyed.
 */
export const isLocationDestroyed = (attacker: Pick<Attacker, 'destroyedLocations'>, location: Location): boolean => {
  if (isMechDestroyed(attacker)) return true
  const lost = attacker.destroyedLocations
  if (lost.includes(location)) return true
  const torso = ARM_TORSO[location]
  return torso !== undefined && lost.includes(torso)
}

/** Human-readable reason a location is unusable, or null when it is intact. */
export const destroyedReason = (attacker: Pick<Attacker, 'destroyedLocations'>, location: Location): string | null => {
  if (isMechDestroyed(attacker)) return '’Mech destroyed'
  if (attacker.destroyedLocations.includes(location)) return `${LOCATION_NAMES[location]} destroyed`
  const torso = ARM_TORSO[location]
  if (torso && attacker.destroyedLocations.includes(torso)) return `${LOCATION_NAMES[location]} lost with the ${LOCATION_NAMES[torso].toLowerCase()}`
  return null
}

/** Weapons that are declared to fire and still have an intact location. */
export const firingWeapons = (attacker: Pick<Attacker, 'destroyedLocations'>, weapons: MountedWeapon[]): MountedWeapon[] => {
  return weapons.filter((w) => w.fire && !isLocationDestroyed(attacker, w.location))
}
