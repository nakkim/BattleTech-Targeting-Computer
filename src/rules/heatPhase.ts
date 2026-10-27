import { heatExplosionCandidates } from './ammo'
import { isLocationDestroyed } from './destruction'
import { applyDamage, type DamageStep } from './damage'
import { ammoExplosionAvoid, HIT_LOCATION_TABLE, shutdownAvoid, tableColumn } from './tables'
import type { Arc, Attacker, LegState, Location } from './types'

/** Fields an ammo explosion changes, kept so it can be undone. */
export type ExplosionFields = Pick<Attacker, 'armorDamage' | 'structureDamage' | 'destroyedLocations' | 'ammoBins'>

/** An ammo explosion applied after a failed heat roll. */
export interface HeatExplosion {
  /** E.g. "LRM 20 ammo explodes for 120". */
  label: string
  steps: DamageStep[]
  lost: number
  before: ExplosionFields
}

/** One 5-point group of falling damage, applied to the location its 2D6 roll gave. */
export interface FallHit {
  location: Location
  damage: number
  steps: DamageStep[]
  lost: number
}

/** Falling damage applied after a failed PSR. */
export interface AppliedFall {
  side: Arc
  hits: FallHit[]
  before: ExplosionFields
}

/**
 * The rolls of one Heat Phase, made with physical dice. The app works out what
 * must be rolled from the heat after the phase, and the player enters each 2D6 result.
 */
export interface HeatPhase {
  /** Heat Scale after the Heat Phase. */
  heat: number
  /** The 'Mech was shut down before the phase began, so it may try to restart (p. 38). */
  wasShutdown: boolean
  /** The 'Mech was already prone, so shutting down cannot make it fall. */
  wasProne: boolean
  /** Ammo explosion Avoid number, null when no roll is needed. */
  ammoTarget: number | null
  /** Entered 2D6 results, null until rolled. */
  powerRoll: number | null
  ammoRoll: number | null
  psrRoll: number | null
  /** The explosion applied after a failed ammo roll. */
  explosion: HeatExplosion | null
  /** Facing After Fall roll (1D6), null until rolled. */
  fallFacingRoll: number | null
  /** Hit Location roll (2D6) of each 5-point group of falling damage. */
  fallRolls: (number | null)[]
  /** The falling damage applied. */
  fall: AppliedFall | null
}

/** What happens to the power plant in this Heat Phase. */
export type PowerCheck =
  | { kind: 'none' }
  | { kind: 'auto-shutdown' }
  | { kind: 'shutdown'; target: number }
  | { kind: 'auto-restart' }
  | { kind: 'no-restart' }
  | { kind: 'restart'; target: number }

/**
 * Shutdown at 14+ heat, avoided by rolling the highest Avoid number reached and
 * automatic at 30+. A 'Mech that spent the whole turn shut down restarts on the
 * same roll, automatically below 14 heat, and never at 30+ (p. 38).
 */
export const powerCheck = ({ heat, wasShutdown }: Pick<HeatPhase, 'heat' | 'wasShutdown'>): PowerCheck => {
  const avoid = shutdownAvoid(heat)
  if (wasShutdown) {
    if (avoid === null) return { kind: 'auto-restart' }
    return avoid === Infinity ? { kind: 'no-restart' } : { kind: 'restart', target: avoid }
  }
  if (avoid === null) return { kind: 'none' }
  return avoid === Infinity ? { kind: 'auto-shutdown' } : { kind: 'shutdown', target: avoid }
}

/** Whether the power plant is shut down after the Heat Phase, or null while a roll is still missing. */
export const shutdownAfter = (phase: HeatPhase): boolean | null => {
  const check = powerCheck(phase)
  switch (check.kind) {
    case 'none':
    case 'auto-restart':
      return false
    case 'auto-shutdown':
    case 'no-restart':
      return true
    case 'shutdown':
    case 'restart':
      return phase.powerRoll === null ? null : phase.powerRoll < check.target
  }
}

/** Ammo explosion Avoid number, or null when no roll is needed: too little heat, or no unemptied explosive ammo (p. 38). */
export const ammoCheck = (heat: number, attacker: Attacker): number | null => {
  const avoid = ammoExplosionAvoid(heat)
  return avoid !== null && heatExplosionCandidates(attacker).length > 0 ? avoid : null
}

/** Whether the ammo explosion roll failed, so a bin must explode. */
export const ammoExplodes = (phase: HeatPhase): boolean => {
  return phase.ammoTarget !== null && phase.ammoRoll !== null && phase.ammoRoll < phase.ammoTarget
}

export interface PsrModifier {
  label: string
  value: number
}

const LEG_NAMES: [Location, 'leftLeg' | 'rightLeg'][] = [
  ['LL', 'leftLeg'],
  ['RL', 'rightLeg'],
]

/**
 * Preexisting damage modifiers to a Piloting Skill Roll (p. 41): +5 for a destroyed
 * leg, else +2 for a destroyed hip (ignoring the leg's other actuators), else +1
 * per leg or foot actuator. Gyro hits are not tracked.
 */
export const psrDamageModifiers = (attacker: Attacker): PsrModifier[] => {
  const modifiers: PsrModifier[] = []
  for (const [location, key] of LEG_NAMES) {
    const leg: LegState = attacker[key]
    const side = location === 'LL' ? 'Left' : 'Right'
    if (isLocationDestroyed(attacker, location)) modifiers.push({ label: `${side} leg destroyed`, value: 5 })
    else if (leg.hipHit) modifiers.push({ label: `${side} hip damaged`, value: 2 })
    else {
      const actuators = [leg.upperLegHit, leg.lowerLegHit, leg.footHit].filter(Boolean).length
      if (actuators > 0) modifiers.push({ label: `${side} leg actuators damaged (${actuators})`, value: actuators })
    }
  }
  return modifiers
}

/** Piloting Skill Roll when the power plant shuts down: Piloting +3 plus preexisting damage (p. 38). */
export const shutdownPsr = (attacker: Attacker): { modifiers: PsrModifier[]; target: number } => {
  const modifiers = [{ label: 'Piloting skill', value: attacker.piloting }, { label: 'Reactor shuts down', value: 3 }, ...psrDamageModifiers(attacker)]
  return { modifiers, target: modifiers.reduce((sum, m) => sum + m.value, 0) }
}

/** The power plant shut down in this phase, and the 'Mech is standing, so it must roll not to fall. */
export const needsShutdownPsr = (phase: HeatPhase): boolean => {
  return !phase.wasShutdown && !phase.wasProne && shutdownAfter(phase) === true
}

/** Whether the 'Mech falls after shutting down, or null while the PSR is missing. A Target Number above 12 always fails. */
export const fallsOnShutdown = (phase: HeatPhase, attacker: Attacker): boolean | null => {
  if (!needsShutdownPsr(phase)) return false
  const { target } = shutdownPsr(attacker)
  if (target > 12) return true
  return phase.psrRoll === null ? null : phase.psrRoll < target
}

/** Falling damage: 1 per 10 tons, rounded up, for a 0-level fall; halved, rounded down, in Depth 1+ water (p. 43). */
export const fallDamage = (attacker: Pick<Attacker, 'tonnage' | 'waterDepth'>): number => {
  const damage = Math.ceil(attacker.tonnage / 10)
  return attacker.waterDepth > 0 ? Math.floor(damage / 2) : damage
}

/** Falling damage split into 5-point groups, each rolled as a separate hit, e.g. 9 is [5, 4]. */
export const fiveGroups = (damage: number): number[] => {
  const groups: number[] = []
  for (let left = damage; left > 0; left -= 5) groups.push(Math.min(5, left))
  return groups
}

/** Facing After Fall Table (1D6, p. 43): the side the 'Mech lands on, which picks the Hit Location Table column. */
export const fallSide = (roll: number): Arc => {
  if (roll === 1) return 'front'
  if (roll <= 3) return 'right'
  if (roll === 4) return 'rear'
  return 'left'
}

/** Where a 5-point group of falling damage lands: the 2D6 roll on the column of the side the 'Mech fell on. */
export const fallHitLocation = (side: Arc, roll: number): Location => {
  return HIT_LOCATION_TABLE[tableColumn(side)][roll - 2]
}

/** Apply falling damage group by group: one 2D6 location roll per group, on the rear armor after a fall on the back. */
export const applyFall = (attacker: Attacker, facingRoll: number, rolls: number[]): { attacker: Attacker; fall: AppliedFall } => {
  const side = fallSide(facingRoll)
  const { armorDamage, structureDamage, destroyedLocations, ammoBins } = attacker
  const groups = fiveGroups(fallDamage(attacker))
  const hits: FallHit[] = []
  let state = attacker
  groups.forEach((damage, i) => {
    const location = fallHitLocation(side, rolls[i])
    const result = applyDamage(state, location, damage, { rear: side === 'rear' })
    state = result.attacker
    hits.push({ location, damage, steps: result.steps, lost: result.lost })
  })
  return { attacker: state, fall: { side, hits, before: { armorDamage, structureDamage, destroyedLocations, ammoBins } } }
}

/** Steps of the Heat Phase still to do: rolls without a result, and an explosion not yet applied. */
export const pendingSteps = (phase: HeatPhase, attacker: Attacker): number => {
  let pending = 0
  if (shutdownAfter(phase) === null) pending++
  if (phase.ammoTarget !== null && phase.ammoRoll === null) pending++
  if (ammoExplodes(phase) && !phase.explosion) pending++
  const falls = fallsOnShutdown(phase, attacker)
  if (falls === null) pending++
  if (falls === true && !phase.fall) pending++
  return pending
}
