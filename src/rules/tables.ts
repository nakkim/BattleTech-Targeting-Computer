import { probability2d6 } from './dice'
import type { Arc, Location, MovementMode, WeaponSpec } from './types'

/** Weapons and Equipment Table, rulebook p. 55. */
export const WEAPONS: WeaponSpec[] = [
  { key: 'LL', name: 'Large Laser', category: 'energy', heat: 8, damage: 8, minRange: 0, short: 5, medium: 10, long: 15 },
  { key: 'ML', name: 'Medium Laser', category: 'energy', heat: 3, damage: 5, minRange: 0, short: 3, medium: 6, long: 9 },
  { key: 'SL', name: 'Small Laser', category: 'energy', heat: 1, damage: 3, minRange: 0, short: 1, medium: 2, long: 3 },
  { key: 'FL', name: 'Flamer', category: 'energy', heat: 3, damage: 2, minRange: 0, short: 1, medium: 2, long: 3 },
  { key: 'PPC', name: 'PPC', category: 'energy', heat: 10, damage: 10, minRange: 3, short: 6, medium: 12, long: 18 },
  { key: 'AC2', name: 'Autocannon/2', category: 'ballistic', heat: 1, damage: 2, minRange: 4, short: 8, medium: 16, long: 24, ammoPerTon: 45 },
  { key: 'AC5', name: 'Autocannon/5', category: 'ballistic', heat: 1, damage: 5, minRange: 3, short: 6, medium: 12, long: 18, ammoPerTon: 20 },
  { key: 'AC10', name: 'Autocannon/10', category: 'ballistic', heat: 3, damage: 10, minRange: 0, short: 5, medium: 10, long: 15, ammoPerTon: 10 },
  { key: 'AC20', name: 'Autocannon/20', category: 'ballistic', heat: 7, damage: 20, minRange: 0, short: 3, medium: 6, long: 9, ammoPerTon: 5 },
  { key: 'MG', name: 'Machine Gun', category: 'ballistic', heat: 0, damage: 2, minRange: 0, short: 1, medium: 2, long: 3, ammoPerTon: 200 },
  { key: 'LRM5', name: 'LRM 5', category: 'missile', heat: 2, damage: 1, missiles: 5, minRange: 6, short: 7, medium: 14, long: 21, ammoPerTon: 24 },
  { key: 'LRM10', name: 'LRM 10', category: 'missile', heat: 4, damage: 1, missiles: 10, minRange: 6, short: 7, medium: 14, long: 21, ammoPerTon: 12 },
  { key: 'LRM15', name: 'LRM 15', category: 'missile', heat: 5, damage: 1, missiles: 15, minRange: 6, short: 7, medium: 14, long: 21, ammoPerTon: 8 },
  { key: 'LRM20', name: 'LRM 20', category: 'missile', heat: 6, damage: 1, missiles: 20, minRange: 6, short: 7, medium: 14, long: 21, ammoPerTon: 6 },
  { key: 'SRM2', name: 'SRM 2', category: 'missile', heat: 2, damage: 2, missiles: 2, minRange: 0, short: 3, medium: 6, long: 9, ammoPerTon: 50 },
  { key: 'SRM4', name: 'SRM 4', category: 'missile', heat: 3, damage: 2, missiles: 4, minRange: 0, short: 3, medium: 6, long: 9, ammoPerTon: 25 },
  { key: 'SRM6', name: 'SRM 6', category: 'missile', heat: 4, damage: 2, missiles: 6, minRange: 0, short: 3, medium: 6, long: 9, ammoPerTon: 15 },
]

export const WEAPONS_BY_KEY: Record<string, WeaponSpec> = Object.fromEntries(WEAPONS.map((w) => [w.key, w]))

export function isLrm(spec: WeaponSpec): boolean {
  return spec.key.startsWith('LRM')
}

export const LOCATION_NAMES: Record<Location, string> = {
  HD: 'Head',
  CT: 'Center Torso',
  LT: 'Left Torso',
  RT: 'Right Torso',
  LA: 'Left Arm',
  RA: 'Right Arm',
  LL: 'Left Leg',
  RL: 'Right Leg',
}

export const LOCATIONS: Location[] = ['HD', 'CT', 'LT', 'RT', 'LA', 'RA', 'LL', 'RL']

export const ARC_NAMES: Record<Arc, string> = {
  front: 'Front',
  left: 'Left side',
  right: 'Right side',
  rear: 'Rear',
}

/** Attacker movement modifier, Attack Modifiers Table p. 19. */
export const ATTACKER_MOVEMENT_MODIFIER: Record<MovementMode, number> = {
  stationary: 0,
  walked: 1,
  ran: 2,
  jumped: 3,
}

export const MOVEMENT_NAMES: Record<MovementMode, string> = {
  stationary: 'Stationary',
  walked: 'Walked',
  ran: 'Ran',
  jumped: 'Jumped',
}

/** Target movement modifier (TMM) by hexes moved, Attack Modifiers Table p. 19. */
export function targetMovementModifier(hexes: number): number {
  if (hexes <= 2) return 0
  if (hexes <= 4) return 1
  if (hexes <= 6) return 2
  if (hexes <= 9) return 3
  if (hexes <= 17) return 4
  if (hexes <= 24) return 5
  return 6
}

/** Heat modifier to weapon attacks, Heat Data p. 37-38. */
export function heatToHitModifier(heat: number): number {
  if (heat >= 24) return 4
  if (heat >= 17) return 3
  if (heat >= 13) return 2
  if (heat >= 8) return 1
  return 0
}

export function heatMovementPenalty(heat: number): number {
  if (heat >= 25) return 5
  if (heat >= 20) return 4
  if (heat >= 15) return 3
  if (heat >= 10) return 2
  if (heat >= 5) return 1
  return 0
}

/** Shutdown avoid number; null when no check is needed, Infinity when shutdown is automatic. */
export function shutdownAvoid(heat: number): number | null {
  if (heat >= 30) return Infinity
  if (heat >= 26) return 10
  if (heat >= 22) return 8
  if (heat >= 18) return 6
  if (heat >= 14) return 4
  return null
}

export function ammoExplosionAvoid(heat: number): number | null {
  if (heat >= 28) return 8
  if (heat >= 23) return 6
  if (heat >= 19) return 4
  return null
}

export type HitTable = 'standard' | 'punch' | 'kick'

/** Hit Location Table (2D6), p. 23. Index = roll - 2. */
export const HIT_LOCATION_TABLE: Record<'left' | 'front' | 'right', Location[]> = {
  left: ['LT', 'LL', 'LA', 'LA', 'LL', 'LT', 'CT', 'RT', 'RA', 'RL', 'HD'],
  front: ['CT', 'RA', 'RA', 'RL', 'RT', 'CT', 'LT', 'LL', 'LA', 'LA', 'HD'],
  right: ['RT', 'RL', 'RA', 'RA', 'RL', 'RT', 'CT', 'LT', 'LA', 'LL', 'HD'],
}

/** Punch Location Table (1D6), p. 28. Index = roll - 1. */
export const PUNCH_LOCATION_TABLE: Record<'left' | 'front' | 'right', Location[]> = {
  left: ['LT', 'LT', 'CT', 'LA', 'LA', 'HD'],
  front: ['LA', 'LT', 'CT', 'RT', 'RA', 'HD'],
  right: ['RT', 'RT', 'CT', 'RA', 'RA', 'HD'],
}

/** Kick Location Table (1D6), p. 28. Index = roll - 1. */
export const KICK_LOCATION_TABLE: Record<'left' | 'front' | 'right', Location[]> = {
  left: ['LL', 'LL', 'LL', 'LL', 'LL', 'LL'],
  front: ['RL', 'RL', 'RL', 'LL', 'LL', 'LL'],
  right: ['RL', 'RL', 'RL', 'RL', 'RL', 'RL'],
}

export function tableColumn(direction: Arc): 'left' | 'front' | 'right' {
  return direction === 'rear' ? 'front' : direction
}

export interface LocationChance {
  location: Location
  rear: boolean
  probability: number
  /** Dice results producing this location, e.g. "2, 7". */
  rolls: number[]
}

/** Probability of each hit location for an attack from the given direction. */
export function hitLocationChances(table: HitTable, direction: Arc): LocationChance[] {
  const column = tableColumn(direction)
  const rear = direction === 'rear'
  const result = new Map<Location, LocationChance>()
  const add = (location: Location, roll: number, p: number) => {
    const entry = result.get(location) ?? { location, rear, probability: 0, rolls: [] }
    entry.probability += p
    entry.rolls.push(roll)
    result.set(location, entry)
  }
  if (table === 'standard') {
    HIT_LOCATION_TABLE[column].forEach((loc, i) => add(loc, i + 2, probability2d6(i + 2)))
  } else {
    const t = table === 'punch' ? PUNCH_LOCATION_TABLE : KICK_LOCATION_TABLE
    t[column].forEach((loc, i) => add(loc, i + 1, 1 / 6))
  }
  return LOCATIONS.filter((l) => result.has(l)).map((l) => result.get(l)!)
}

/** Cluster Hits Table, p. 23. Index = roll - 2. */
export const CLUSTER_HITS_TABLE: Record<number, number[]> = {
  2: [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2],
  4: [1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
  5: [1, 2, 2, 3, 3, 3, 3, 4, 4, 5, 5],
  6: [2, 2, 3, 3, 4, 4, 4, 5, 5, 6, 6],
  10: [3, 3, 4, 6, 6, 6, 6, 8, 8, 10, 10],
  15: [5, 5, 6, 9, 9, 9, 9, 12, 12, 15, 15],
  20: [6, 6, 9, 12, 12, 12, 12, 16, 16, 20, 20],
}

export const CLUSTER_SIZES = [2, 4, 5, 6, 10, 15, 20]

export function averageClusterHits(size: number): number {
  const row = CLUSTER_HITS_TABLE[size]
  if (!row) return size
  return row.reduce((sum, hits, i) => sum + hits * probability2d6(i + 2), 0)
}

/** Split damage into 5-point groupings, leftover becomes its own grouping (p. 24, 26). */
export function fivePointGroups(damage: number): number[] {
  const groups: number[] = []
  let left = damage
  while (left > 0) {
    groups.push(Math.min(5, left))
    left -= 5
  }
  return groups
}
