import { declaredWeapons, isLocationDestroyed } from './destruction'
import { WEAPONS_BY_KEY } from './tables'
import type { AmmoBin, Attacker, MountedWeapon } from './types'

/** Every shot of an ammunition weapon uses one shot from an ammo bin of the exact same weapon type (p. 21). */
export const usesAmmo = (weaponKey: string): boolean => {
  return WEAPONS_BY_KEY[weaponKey].ammoPerTon !== undefined
}

/** Shots in one ton (one ammo bin), e.g. 6 for LRM 20. */
export const shotsPerBin = (weaponKey: string): number => {
  return WEAPONS_BY_KEY[weaponKey].ammoPerTon ?? 0
}

/** Ammunition weapon types in the loadout, in the order they first appear. */
export const ammoTypes = (weapons: MountedWeapon[]): string[] => {
  return [...new Set(weapons.map((w) => w.weaponKey).filter(usesAmmo))]
}

/**
 * Gauss rifle ammo is inert slugs and does not explode (Total Warfare).
 * All other ammo explodes when its slot takes a critical hit or from heat.
 */
export const isExplosive = (weaponKey: string): boolean => {
  return weaponKey !== 'GAUSS'
}

/** Damage Value of one shot: missiles × damage for launchers (MG 2, LRM 15 15, SRM 6 12). */
export const damagePerShot = (weaponKey: string): number => {
  const spec = WEAPONS_BY_KEY[weaponKey]
  return spec.damage * (spec.missiles ?? 1)
}

/** Damage an exploding bin deals to the internal structure of its location (p. 32). */
export const explosionDamage = (bin: AmmoBin): number => {
  return isExplosive(bin.weaponKey) ? bin.shots * damagePerShot(bin.weaponKey) : 0
}

type AmmoState = Pick<Attacker, 'ammoBins' | 'destroyedLocations' | 'leftArm' | 'rightArm'>

/** Bins whose location is intact. Ammo in a destroyed location is lost. */
export const availableBins = (attacker: AmmoState): AmmoBin[] => {
  return attacker.ammoBins.filter((b) => !isLocationDestroyed(attacker, b.location))
}

/** Ammo types are tracked once the 'Mech has at least one bin for them. */
const isTracked = (attacker: AmmoState, weaponKey: string): boolean => {
  return attacker.ammoBins.some((b) => b.weaponKey === weaponKey)
}

export interface AmmoDraw {
  /** Ids of declared weapons with no shot left. */
  empty: Set<string>
  /** Shots drawn this turn per bin id. */
  drawn: Map<string, number>
}

/**
 * Assign a shot to every declared ammunition weapon. Weapons earlier in the list
 * draw first, and each shot comes from the bin of that type with the fewest shots
 * left, so bins empty early and fewer full bins can explode.
 */
export const drawAmmo = (attacker: AmmoState, declared: MountedWeapon[]): AmmoDraw => {
  const empty = new Set<string>()
  const drawn = new Map<string, number>()
  const bins = availableBins(attacker)
  const left = (b: AmmoBin) => b.shots - (drawn.get(b.id) ?? 0)
  for (const w of declared) {
    if (!usesAmmo(w.weaponKey) || !isTracked(attacker, w.weaponKey)) continue
    const candidates = bins.filter((b) => b.weaponKey === w.weaponKey && left(b) > 0)
    if (candidates.length === 0) {
      empty.add(w.id)
      continue
    }
    const bin = candidates.reduce((a, b) => (left(b) < left(a) ? b : a))
    drawn.set(bin.id, (drawn.get(bin.id) ?? 0) + 1)
  }
  return { empty, drawn }
}

/** Declared weapons that can fire: intact location and a shot of ammo left. */
export const firingWeapons = (attacker: AmmoState, weapons: MountedWeapon[]): MountedWeapon[] => {
  const declared = declaredWeapons(attacker, weapons)
  const { empty } = drawAmmo(attacker, declared)
  return declared.filter((w) => !empty.has(w.id))
}

/** Ammo bins after this turn's shots are marked off. */
export const spendAmmo = (attacker: AmmoState, weapons: MountedWeapon[]): AmmoBin[] => {
  const { drawn } = drawAmmo(attacker, declaredWeapons(attacker, weapons))
  return attacker.ammoBins.map((b) => ({ ...b, shots: b.shots - (drawn.get(b.id) ?? 0) }))
}

/**
 * Bins that explode first when the heat explosion roll fails: the intact, unemptied
 * explosive bins with the most destructive ammo per shot. With several, the
 * controller chooses (Heat Scale, Ammunition).
 */
export const heatExplosionCandidates = (attacker: AmmoState): AmmoBin[] => {
  const live = availableBins(attacker).filter((b) => b.shots > 0 && isExplosive(b.weaponKey))
  const worst = Math.max(0, ...live.map((b) => damagePerShot(b.weaponKey)))
  return live.filter((b) => damagePerShot(b.weaponKey) === worst)
}
