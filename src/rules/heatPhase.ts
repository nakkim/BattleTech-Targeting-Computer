import { heatExplosionCandidates } from './ammo'
import type { DamageFields, DamageStep } from './damage'
import { ammoExplosionAvoid, shutdownAvoid } from './tables'
import type { Attacker } from './types'

/** An ammo explosion applied after a failed heat roll. */
export interface HeatExplosion {
  /** E.g. "LRM 20 ammo explodes for 120". */
  label: string
  steps: DamageStep[]
  lost: number
  before: DamageFields
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
  /** The explosion applied after a failed ammo roll. */
  explosion: HeatExplosion | null
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

/** Whether the power plant shut down in this phase with the 'Mech standing, so it must roll not to fall (p. 38). */
export const shutsDownStanding = (phase: HeatPhase): boolean => {
  return !phase.wasShutdown && !phase.wasProne && shutdownAfter(phase) === true
}

/** Steps of the Heat Phase still to do: rolls without a result, and an explosion not yet applied. */
export const pendingHeatSteps = (phase: HeatPhase): number => {
  let pending = 0
  if (shutdownAfter(phase) === null) pending++
  if (phase.ammoTarget !== null && phase.ammoRoll === null) pending++
  if (ammoExplodes(phase) && !phase.explosion) pending++
  return pending
}
