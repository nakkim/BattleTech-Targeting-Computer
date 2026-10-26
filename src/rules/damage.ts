import { explosionDamage } from './ammo'
import { hasLocation, isLocationDestroyed, isMechDestroyed } from './destruction'
import { LOCATIONS } from './tables'
import type { ArmorFacing, Attacker, Location } from './types'

/** Internal structure per location by tonnage: head, center torso, side torso, arm, leg (Internal Structure Table, p. 50). */
const INTERNAL_STRUCTURE: Record<number, [hd: number, ct: number, side: number, arm: number, leg: number]> = {
  20: [3, 6, 5, 3, 4],
  25: [3, 8, 6, 4, 6],
  30: [3, 10, 7, 5, 7],
  35: [3, 11, 8, 6, 8],
  40: [3, 12, 10, 6, 10],
  45: [3, 14, 11, 7, 11],
  50: [3, 16, 12, 8, 12],
  55: [3, 18, 13, 9, 13],
  60: [3, 20, 14, 10, 14],
  65: [3, 21, 15, 10, 15],
  70: [3, 22, 15, 11, 15],
  75: [3, 23, 16, 12, 16],
  80: [3, 25, 17, 13, 17],
  85: [3, 27, 18, 14, 18],
  90: [3, 29, 19, 15, 19],
  95: [3, 30, 20, 16, 20],
  100: [3, 31, 21, 17, 21],
}

const STRUCTURE_COLUMN: Record<Location, number> = { HD: 0, CT: 1, LT: 2, RT: 2, LA: 3, RA: 3, LL: 4, RL: 4 }

/** Internal structure circles of a location. 'Mechs come in 5-ton steps; other tonnages round down. */
export const structureOf = (tonnage: number, location: Location): number => {
  const step = Math.min(100, Math.max(20, Math.floor(tonnage / 5) * 5))
  return INTERNAL_STRUCTURE[step][STRUCTURE_COLUMN[location]]
}

/** Rear armor facing of each torso location. */
export const REAR_FACING: Partial<Record<Location, ArmorFacing>> = { CT: 'CTR', LT: 'LTR', RT: 'RTR' }

/** Armor facings in record sheet order. */
export const ARMOR_FACINGS: ArmorFacing[] = ['HD', 'CT', 'CTR', 'LT', 'LTR', 'RT', 'RTR', 'LA', 'RA', 'LL', 'RL']

/** Location an armor facing belongs to. */
export const facingLocation = (facing: ArmorFacing): Location => {
  return LOCATIONS.find((l) => l === facing || REAR_FACING[l] === facing)!
}

/**
 * Most armor a location can carry: twice its internal structure, front and rear
 * together, but never more than 9 on the head (p. 51).
 */
export const maxArmor = (tonnage: number, location: Location): number => {
  return location === 'HD' ? 9 : 2 * structureOf(tonnage, location)
}

/** Every facing at its maximum, with torsos split about 3:1 front to rear. */
export const maxArmorFacings = (tonnage: number): Record<ArmorFacing, number> => {
  const armor = {} as Record<ArmorFacing, number>
  for (const location of LOCATIONS) {
    const max = maxArmor(tonnage, location)
    const rear = REAR_FACING[location]
    if (rear) {
      armor[rear] = Math.floor(max / 4)
      armor[location] = max - armor[rear]
    } else {
      armor[location] = max
    }
  }
  return armor
}

type DamageState = Pick<Attacker, 'tonnage' | 'armor' | 'armorDamage' | 'structureDamage' | 'destroyedLocations' | 'leftArm' | 'rightArm'>

export const armorLeft = (attacker: DamageState, facing: ArmorFacing): number => {
  return Math.max(0, attacker.armor[facing] - (attacker.armorDamage[facing] ?? 0))
}

export const structureLeft = (attacker: DamageState, location: Location): number => {
  return Math.max(0, structureOf(attacker.tonnage, location) - (attacker.structureDamage[location] ?? 0))
}

/** Where damage goes once a location is destroyed (Damage Transfer Diagram, p. 34). Head and center torso never transfer. */
export const TRANSFER: Partial<Record<Location, Location>> = { LA: 'LT', LL: 'LT', RA: 'RT', RL: 'RT', LT: 'CT', RT: 'CT' }

export interface DamageOptions {
  /** Hit from the rear: torsos take it on their rear armor, also after transferring inward. */
  rear?: boolean
  /** Ammunition explosion: goes straight to internal structure, also after transferring inward. */
  explosion?: boolean
}

/** What one location took from a hit. */
export interface DamageStep {
  location: Location
  /** Armor facing that was damaged, null when the damage bypassed armor. */
  facing: ArmorFacing | null
  armor: number
  structure: number
  /** The location's internal structure ran out. */
  destroyed: boolean
}

export interface DamageResult<T> {
  attacker: T
  steps: DamageStep[]
  /** Damage left over after the head or center torso was destroyed. */
  lost: number
}

/**
 * Apply damage to a location: armor first, then internal structure. A location
 * at zero internal structure is destroyed and the rest transfers inward (p. 34).
 */
export const applyDamage = <T extends DamageState>(attacker: T, location: Location, amount: number, { rear = false, explosion = false }: DamageOptions = {}): DamageResult<T> => {
  const state = {
    ...attacker,
    armorDamage: { ...attacker.armorDamage },
    structureDamage: { ...attacker.structureDamage },
    destroyedLocations: [...attacker.destroyedLocations],
  }
  const steps: DamageStep[] = []
  let left = amount
  let at: Location | undefined = location
  while (left > 0 && at && !isMechDestroyed(state)) {
    if (!isLocationDestroyed(state, at)) {
      const facing = explosion ? null : rear ? (REAR_FACING[at] ?? at) : at
      const armor = facing ? Math.min(left, armorLeft(state, facing)) : 0
      if (facing && armor > 0) state.armorDamage[facing] = (state.armorDamage[facing] ?? 0) + armor
      left -= armor
      const structure = Math.min(left, structureLeft(state, at))
      if (structure > 0) state.structureDamage[at] = (state.structureDamage[at] ?? 0) + structure
      left -= structure
      const destroyed = structureLeft(state, at) === 0
      if (destroyed) state.destroyedLocations.push(at)
      steps.push({ location: at, facing, armor, structure, destroyed })
    }
    at = TRANSFER[at]
  }
  return { attacker: state, steps, lost: left }
}

/**
 * Explode one ammo bin: its shots times their Damage Value go to the internal
 * structure of its location, and the bin is empty afterwards (p. 32).
 */
export const explodeAmmo = <T extends DamageState & Pick<Attacker, 'ammoBins'>>(attacker: T, binId: string): DamageResult<T> => {
  const bin = attacker.ammoBins.find((b) => b.id === binId)
  if (!bin) return { attacker, steps: [], lost: 0 }
  const emptied = { ...attacker, ammoBins: attacker.ammoBins.map((b) => (b.id === binId ? { ...b, shots: 0 } : b)) }
  return applyDamage(emptied, bin.location, explosionDamage(bin), { explosion: true })
}

/** Total armor and internal structure left, and their starting values, over the locations the 'Mech was built with. */
export const damageTotals = (attacker: DamageState) => {
  const facings = ARMOR_FACINGS.filter((f) => hasLocation(attacker, facingLocation(f)))
  const locations = LOCATIONS.filter((l) => hasLocation(attacker, l))
  const intact = (l: Location) => !isLocationDestroyed(attacker, l)
  return {
    armor: facings.reduce((sum, f) => sum + (intact(facingLocation(f)) ? armorLeft(attacker, f) : 0), 0),
    armorMax: facings.reduce((sum, f) => sum + attacker.armor[f], 0),
    structure: locations.reduce((sum, l) => sum + (intact(l) ? structureLeft(attacker, l) : 0), 0),
    structureMax: locations.reduce((sum, l) => sum + structureOf(attacker.tonnage, l), 0),
  }
}
