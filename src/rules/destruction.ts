import { LOCATION_NAMES } from './tables'
import type { Attacker, Location, MountedWeapon } from './types'

/** Destroying the head or center torso, a third engine hit or a cockpit hit destroys the whole 'Mech (pp. 32, 34). */
export const isMechDestroyed = (attacker: Pick<Attacker, 'destroyedLocations'> & Partial<Pick<Attacker, 'engineHits' | 'cockpitHit'>>): boolean => {
  const lost = attacker.destroyedLocations
  return lost.includes('HD') || lost.includes('CT') || (attacker.engineHits ?? 0) >= 3 || attacker.cockpitHit === true
}

/** Fields that decide whether a location is still there. */
type LocationState = Pick<Attacker, 'destroyedLocations' | 'leftArm' | 'rightArm'>

/** Whether the 'Mech was built with the location. Arms are optional; every other location is always there. */
export const hasLocation = (attacker: Pick<Attacker, 'leftArm' | 'rightArm'>, location: Location): boolean => {
  if (location === 'LA') return attacker.leftArm.present
  if (location === 'RA') return attacker.rightArm.present
  return true
}

/** The location that takes an arm with it when destroyed. */
const ARM_TORSO: Partial<Record<Location, Location>> = { LA: 'LT', RA: 'RT' }

/**
 * Whether a location is gone: never built, destroyed itself, blown off with
 * its side torso, or the whole 'Mech is destroyed.
 */
export const isLocationDestroyed = (attacker: LocationState, location: Location): boolean => {
  if (isMechDestroyed(attacker) || !hasLocation(attacker, location)) return true
  const lost = attacker.destroyedLocations
  if (lost.includes(location)) return true
  const torso = ARM_TORSO[location]
  return torso !== undefined && lost.includes(torso)
}

/** Human-readable reason a location is unusable, or null when it is intact. */
export const destroyedReason = (attacker: LocationState, location: Location): string | null => {
  if (isMechDestroyed(attacker)) return '’Mech destroyed'
  if (!hasLocation(attacker, location)) return `No ${LOCATION_NAMES[location].toLowerCase()}`
  if (attacker.destroyedLocations.includes(location)) return `${LOCATION_NAMES[location]} destroyed`
  const torso = ARM_TORSO[location]
  if (torso && attacker.destroyedLocations.includes(torso)) return `${LOCATION_NAMES[location]} lost with the ${LOCATION_NAMES[torso].toLowerCase()}`
  return null
}

/** Weapons that are declared to fire and still have an intact location. An immobile 'Mech fires nothing. */
export const declaredWeapons = (attacker: LocationState & Partial<Pick<Attacker, 'shutdown' | 'unconscious' | 'pilotHits'>>, weapons: MountedWeapon[]): MountedWeapon[] => {
  if (attacker.shutdown || attacker.unconscious || (attacker.pilotHits ?? 0) >= 6) return []
  return weapons.filter((w) => w.fire && !w.destroyed && !isLocationDestroyed(attacker, w.location))
}

