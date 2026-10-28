import { applyDamage, type DamageFields, type DamageStep } from './damage'
import { isLocationDestroyed } from './destruction'
import { isImmobile, isPilotKilled } from './pilot'
import { HIT_LOCATION_TABLE, tableColumn } from './tables'
import type { Arc, Attacker, LegState, Location } from './types'

/** Why a Piloting Skill Roll is needed (Piloting Skill Roll Table, p. 41). */
export type PsrCause =
  | 'shutdown'
  | 'damage20'
  | 'legActuator'
  | 'hip'
  | 'legDestroyed'
  | 'gyroHit'
  | 'gyroDestroyed'
  | 'kicked'
  | 'pushed'
  | 'charged'
  | 'missedKick'
  | 'madeCharge'
  | 'madeDfa'
  | 'missedDfa'
  | 'stand'
  | 'rubble'
  | 'water1'
  | 'water2'
  | 'water3'
  | 'jumpedDamaged'
  | 'ranDamaged'

/** When the roll is made: right after a movement action, or at the end of an attack phase or the Heat Phase (p. 40). */
export type PsrPhase = 'movement' | 'weapon' | 'physical' | 'heat'

export const PSR_PHASE_NAMES: Record<PsrPhase, string> = {
  movement: 'Movement Phase',
  weapon: 'Weapon Attack Phase',
  physical: 'Physical Attack Phase',
  heat: 'Heat Phase',
}

export interface PsrCauseSpec {
  label: string
  /** Target Number modifier of the event. */
  modifier: number
  phase: PsrPhase
  /** The 'Mech falls without a roll. */
  automatic?: string
  /** Levels fallen: damage is multiplied by levels + 1. */
  levels?: number
  /** Falling damage always hits the rear. */
  rear?: boolean
  /** Shown under the roll. */
  note?: string
}

const DAMAGE_NOTE = 'Its modifier comes from Critical damage, once for every roll.'

export const PSR_CAUSES: Record<PsrCause, PsrCauseSpec> = {
  shutdown: { label: 'Reactor shut down', modifier: 3, phase: 'heat' },
  damage20: { label: '20+ damage in one phase', modifier: 1, phase: 'weapon' },
  legActuator: { label: 'Leg or foot actuator destroyed', modifier: 0, phase: 'weapon', note: DAMAGE_NOTE },
  hip: { label: 'Hip actuator destroyed', modifier: 0, phase: 'weapon', note: DAMAGE_NOTE },
  legDestroyed: { label: 'Leg destroyed', modifier: 0, phase: 'weapon', automatic: 'A ’Mech that loses a leg falls automatically.' },
  gyroHit: { label: 'Gyro hit', modifier: 0, phase: 'weapon', note: DAMAGE_NOTE },
  gyroDestroyed: { label: 'Gyro destroyed', modifier: 0, phase: 'weapon', automatic: 'A ’Mech whose gyro is destroyed falls automatically.' },
  kicked: { label: 'Was kicked', modifier: 0, phase: 'physical' },
  pushed: { label: 'Was pushed', modifier: 0, phase: 'physical' },
  charged: { label: 'Was charged or hit by death from above', modifier: 2, phase: 'physical' },
  missedKick: { label: 'Missed a kick', modifier: 0, phase: 'physical' },
  madeCharge: { label: 'Made a successful charge', modifier: 2, phase: 'physical' },
  madeDfa: { label: 'Made a successful death from above', modifier: 4, phase: 'physical' },
  missedDfa: {
    label: 'Missed death from above',
    modifier: 0,
    phase: 'physical',
    automatic: 'A missed death from above falls automatically, as if from 2 levels, on the rear.',
    levels: 2,
    rear: true,
  },
  stand: { label: 'Trying to stand', modifier: 0, phase: 'movement' },
  rubble: { label: 'Entered a rubble hex', modifier: 0, phase: 'movement' },
  water1: { label: 'Entered Depth 1 water', modifier: -1, phase: 'movement' },
  water2: { label: 'Entered Depth 2 water', modifier: 0, phase: 'movement' },
  water3: { label: 'Entered Depth 3+ water', modifier: 1, phase: 'movement' },
  jumpedDamaged: { label: 'Jumped with damaged leg actuators or gyro, or a lost leg', modifier: 0, phase: 'movement' },
  ranDamaged: { label: 'Ran with a damaged hip or gyro', modifier: 0, phase: 'movement' },
}

export interface PsrModifier {
  label: string
  value: number
}

const LEGS: [Location, 'leftLeg' | 'rightLeg', string][] = [
  ['LL', 'leftLeg', 'Left'],
  ['RL', 'rightLeg', 'Right'],
]

/**
 * Damage modifiers to a Piloting Skill Roll (p. 41): +5 for a destroyed leg, else +2
 * for a destroyed hip (ignoring the leg's other actuators), else +1 per leg or foot
 * actuator; +3 for a damaged gyro and +3 more once destroyed (p. 32).
 */
export const psrDamageModifiers = (attacker: Attacker): PsrModifier[] => {
  const modifiers: PsrModifier[] = []
  for (const [location, key, side] of LEGS) {
    const leg: LegState = attacker[key]
    if (isLocationDestroyed(attacker, location)) modifiers.push({ label: `${side} leg destroyed`, value: 5 })
    else if (leg.hipHit) modifiers.push({ label: `${side} hip damaged`, value: 2 })
    else {
      const actuators = [leg.upperLegHit, leg.lowerLegHit, leg.footHit].filter(Boolean).length
      if (actuators > 0) modifiers.push({ label: `${side} leg actuators damaged (${actuators})`, value: actuators })
    }
  }
  if (attacker.gyroHits >= 1) modifiers.push({ label: 'Gyro damaged', value: 3 })
  if (attacker.gyroHits >= 2) modifiers.push({ label: 'Gyro destroyed', value: 3 })
  return modifiers
}

/** Falling damage: 1 per 10 tons, rounded up, times levels fallen + 1; halved, rounded down, in Depth 1+ water (p. 43). */
export const fallDamage = (attacker: Pick<Attacker, 'tonnage' | 'waterDepth'>, levels = 0): number => {
  const damage = Math.ceil(attacker.tonnage / 10) * (levels + 1)
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

/** One 5-point group of falling damage, applied to the location its 2D6 roll gave. */
export interface FallHit {
  location: Location
  damage: number
  steps: DamageStep[]
  lost: number
}

/** Falling damage applied, with the fields from before so it can be undone. */
export interface AppliedFall {
  /** Side the damage hit. */
  side: Arc
  hits: FallHit[]
  before: DamageFields
}

export interface FallOptions {
  levels?: number
  /** Damage always hits the rear, whatever the facing roll. */
  rear?: boolean
}

/** Apply falling damage group by group: one 2D6 location roll per group, on the rear armor after a fall on the back. */
export const applyFall = (attacker: Attacker, facingRoll: number, rolls: number[], { levels = 0, rear = false }: FallOptions = {}): { attacker: Attacker; fall: AppliedFall } => {
  const side = rear ? 'rear' : fallSide(facingRoll)
  const { armorDamage, structureDamage, destroyedLocations, ammoBins } = attacker
  const hits: FallHit[] = []
  let state = attacker
  fiveGroups(fallDamage(attacker, levels)).forEach((damage, i) => {
    const location = fallHitLocation(side, rolls[i])
    const result = applyDamage(state, location, damage, { rear: side === 'rear' })
    state = result.attacker
    hits.push({ location, damage, steps: result.steps, lost: result.lost })
  })
  return { attacker: state, fall: { side, hits, before: { armorDamage, structureDamage, destroyedLocations, ammoBins } } }
}

/** Rolls for falling damage: the Facing After Fall roll (1D6), then a Hit Location roll (2D6) per 5-point group. */
export interface FallRolls {
  facingRoll: number | null
  locationRolls: (number | null)[]
  applied: AppliedFall | null
}

export const noFall = (): FallRolls => ({ facingRoll: null, locationRolls: [], applied: null })

/** One Piloting Skill Roll, made with physical dice. */
export interface Psr {
  id: string
  cause: PsrCause
  phase: PsrPhase
  /** 2D6 result, null until rolled. */
  roll: number | null
  /** Modifiers fixed when the roll was entered, so later damage cannot change its result. */
  frozen: PsrModifier[] | null
  /** 2D6 to avoid MechWarrior damage after a fall (p. 43), null until rolled. */
  pilotRoll: number | null
  fall: FallRolls
  /** Set when the app added the roll for tracked damage, e.g. "hip:LL"; it goes away with that damage. */
  source?: string
}

/** The Piloting Skill Rolls of the turn, in the order they came up. */
export interface PsrQueue {
  /** The 'Mech was prone when the first roll came up. */
  wasProne: boolean
  rolls: Psr[]
}

export type PsrOutcome = 'pending' | 'stands' | 'falls' | 'skipped'

export interface PsrCheck {
  psr: Psr
  modifiers: PsrModifier[]
  target: number
  /** Why the 'Mech falls without a roll, if it does. */
  automatic: string | null
  outcome: PsrOutcome
  /** Why the roll is not needed, when skipped. */
  skipped: string | null
  /** MechWarrior damage roll after a fall: its Target Number, or why the MechWarrior is hurt without a roll. */
  pilotTarget: number
  pilotAutomatic: string | null
  /** True when the MechWarrior takes 1 damage, null while the roll is missing; only set after a fall. */
  pilotHurt: boolean | null
}

/**
 * Modifiers of a roll: Piloting skill, every event of the phase so far (all events
 * of an attack phase, since its rolls come at the end of the phase), and damage (p. 40).
 */
export const psrModifiers = (queue: PsrQueue, psr: Psr, attacker: Attacker): PsrModifier[] => {
  if (psr.frozen) return psr.frozen
  const index = queue.rolls.indexOf(psr)
  const atEnd = psr.phase === 'weapon' || psr.phase === 'physical'
  const events = queue.rolls.filter((p, i) => p.phase === psr.phase && (atEnd || i <= index))
  return [
    { label: 'Piloting skill', value: attacker.piloting },
    ...events.map((p) => ({ label: PSR_CAUSES[p.cause].label, value: PSR_CAUSES[p.cause].modifier })).filter((m) => m.value !== 0),
    ...psrDamageModifiers(attacker),
  ]
}

/**
 * Work out every roll in order. A prone 'Mech ignores all rolls except trying to
 * stand, so rolls after a fall are not needed. A shut down 'Mech, a Target Number
 * above 12 and some events fall automatically.
 */
export const checkPsrs = (queue: PsrQueue, attacker: Attacker): PsrCheck[] => {
  let prone = queue.wasProne
  // An automatic fall in an attack phase makes its other rolls, made at the end of the phase, unnecessary.
  const fallingPhases = new Set(queue.rolls.filter((p) => PSR_CAUSES[p.cause].automatic && (p.phase === 'weapon' || p.phase === 'physical')).map((p) => p.phase))
  return queue.rolls.map((psr) => {
    const spec = PSR_CAUSES[psr.cause]
    const modifiers = psrModifiers(queue, psr, attacker)
    const target = modifiers.reduce((sum, m) => sum + m.value, 0)
    const levels = spec.levels ?? 0
    const pilotTarget = target + Math.max(0, levels - 1)
    const immobile = isImmobile(attacker)
    const check: PsrCheck = { psr, modifiers, target, automatic: null, outcome: 'pending', skipped: null, pilotTarget, pilotAutomatic: null, pilotHurt: null }
    if (prone && psr.cause !== 'stand') return { ...check, outcome: 'skipped', skipped: 'The ’Mech is prone: it only rolls to stand.' }
    if (fallingPhases.has(psr.phase) && !spec.automatic) return { ...check, outcome: 'skipped', skipped: 'The ’Mech falls automatically in this phase anyway.' }
    if (psr.cause === 'stand' && attacker.gyroHits >= 2) return { ...check, outcome: 'skipped', skipped: 'With its gyro destroyed, the ’Mech cannot stand up.' }
    if (spec.automatic) check.automatic = spec.automatic
    else if (attacker.unconscious || isPilotKilled(attacker)) check.automatic = 'A ’Mech with an unconscious MechWarrior fails every Piloting Skill Roll.'
    else if (attacker.shutdown && psr.cause !== 'shutdown') check.automatic = 'A shut down ’Mech fails every Piloting Skill Roll.'
    else if (target > 12) check.automatic = `Target Number ${target} is above 12.`
    if (check.automatic) check.outcome = 'falls'
    else if (psr.roll !== null) check.outcome = psr.roll >= target ? 'stands' : 'falls'
    if (check.outcome === 'falls') {
      prone = true
      if (immobile) check.pilotAutomatic = 'The ’Mech is immobile.'
      else if (pilotTarget > 12) check.pilotAutomatic = `Target Number ${pilotTarget} is above 12.`
      check.pilotHurt = check.pilotAutomatic ? true : psr.pilotRoll === null ? null : psr.pilotRoll < pilotTarget
    }
    if (check.outcome === 'stands' && psr.cause === 'stand') prone = false
    return check
  })
}

/** Whether the 'Mech is prone after the rolls so far. */
export const proneAfter = (queue: PsrQueue, checks: PsrCheck[]): boolean => {
  return checks.reduce((prone, c) => (c.outcome === 'falls' ? true : c.outcome === 'stands' && c.psr.cause === 'stand' ? false : prone), queue.wasProne)
}

/** Steps still to do: rolls without a result, MechWarrior rolls and falling damage not yet applied. */
export const pendingPsrSteps = (queue: PsrQueue, attacker: Attacker): number => {
  return checkPsrs(queue, attacker).reduce((sum, c) => {
    if (c.outcome === 'pending') return sum + 1
    if (c.outcome !== 'falls') return sum
    return sum + (c.pilotHurt === null ? 1 : 0) + (c.psr.fall.applied ? 0 : 1)
  }, 0)
}
