import type { Attacker } from './types'

/** Consciousness number by damage (wounds) taken, from the Warrior Data table (p. 44). The 6th point kills. */
const CONSCIOUSNESS = [0, 3, 5, 7, 10, 11]

export const KILLING_HITS = 6

/** Roll needed to stay (or wake up) conscious with this much damage; null once the MechWarrior is dead. */
export const consciousnessTarget = (hits: number): number | null => {
  return hits >= KILLING_HITS ? null : CONSCIOUSNESS[Math.max(1, hits)]
}

export const isPilotKilled = (attacker: Pick<Attacker, 'pilotHits'>): boolean => attacker.pilotHits >= KILLING_HITS

/** The 'Mech cannot move or act: shut down, or its MechWarrior unconscious or dead (p. 11). */
export const isImmobile = (attacker: Pick<Attacker, 'shutdown' | 'unconscious' | 'pilotHits'>): boolean => {
  return attacker.shutdown || attacker.unconscious || isPilotKilled(attacker)
}

/** Damage (wounds) the MechWarrior took from one event, with a Consciousness Roll per point. */
export interface PilotDamage {
  id: string
  /** Set when the app added the damage for a tracked event, e.g. "fall:p-1"; it goes away with that event. */
  source?: string
  /** E.g. "Head hit". */
  reason: string
  amount: number
  /** 2D6 Consciousness Roll per point, null until rolled. */
  rolls: (number | null)[]
}

/** The MechWarrior's damage this turn, made with physical dice. */
export interface PilotTurn {
  /** Damage before this turn. */
  hitsBefore: number
  /** The MechWarrior was unconscious when the turn began. */
  wasUnconscious: boolean
  /** End Phase roll to regain consciousness after a full turn out (p. 44); null when none is due. */
  wake: { target: number; roll: number | null } | null
  damage: PilotDamage[]
}

export const newPilotTurn = (attacker: Pick<Attacker, 'pilotHits' | 'unconscious'>, wake: PilotTurn['wake'] = null): PilotTurn => ({
  hitsBefore: attacker.pilotHits,
  wasUnconscious: attacker.unconscious,
  wake,
  damage: [],
})

export type ConsciousnessOutcome = 'pending' | 'conscious' | 'unconscious' | 'skipped' | 'killed'

export interface ConsciousnessCheck {
  damageId: string
  /** Point of damage within the event. */
  index: number
  /** Damage after this point. */
  hits: number
  target: number | null
  outcome: ConsciousnessOutcome
}

export interface PilotState {
  checks: ConsciousnessCheck[]
  hits: number
  unconscious: boolean
  killed: boolean
}

/** Whether the End Phase roll woke the MechWarrior up. */
const wokeUp = (pilot: PilotTurn): boolean => pilot.wake !== null && pilot.wake.roll !== null && pilot.wake.roll >= pilot.wake.target

/**
 * Work out every Consciousness Roll in order: one per point of damage against the
 * number for the damage so far. Once unconscious, no more rolls that turn; the 6th point kills.
 */
export const checkPilot = (pilot: PilotTurn): PilotState => {
  let hits = pilot.hitsBefore
  let unconscious = pilot.wasUnconscious && !wokeUp(pilot)
  const checks: ConsciousnessCheck[] = []
  for (const d of pilot.damage) {
    for (let index = 0; index < d.amount; index++) {
      hits++
      const target = consciousnessTarget(hits)
      const roll = d.rolls[index] ?? null
      let outcome: ConsciousnessOutcome
      if (target === null) outcome = 'killed'
      else if (unconscious) outcome = 'skipped'
      else if (roll === null) outcome = 'pending'
      else outcome = roll >= target ? 'conscious' : 'unconscious'
      if (outcome === 'unconscious') unconscious = true
      checks.push({ damageId: d.id, index, hits, target, outcome })
    }
  }
  return { checks, hits, unconscious, killed: hits >= KILLING_HITS }
}

/** Rolls still to enter: Consciousness Rolls and the wake-up roll. */
export const pendingPilotSteps = (pilot: PilotTurn): number => {
  const wake = pilot.wake && pilot.wake.roll === null && pilot.hitsBefore < KILLING_HITS ? 1 : 0
  return wake + checkPilot(pilot).checks.filter((c) => c.outcome === 'pending').length
}
