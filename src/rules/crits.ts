import { isExplosive } from './ammo'
import { TRANSFER, type DamageFields, type DamageStep } from './damage'
import { isLocationDestroyed } from './destruction'
import { LOCATION_NAMES, WEAPONS_BY_KEY } from './tables'
import type { ArmState, Attacker, LegState, Location, MountedWeapon } from './types'

/** The head and legs have 6 critical slots, the torsos and arms 12 in two blocks of 6 (p. 31). */
export const slotCount = (location: Location): number => (location === 'HD' || location === 'LL' || location === 'RL' ? 6 : 12)

export interface CritCount {
  hits: number
  /** A 12 on a limb or the head blows it off instead (p. 31). */
  blownOff: boolean
}

/** Determining Critical Hits Table (2D6, p. 31): 8–9 one hit, 10–11 two, 12 three on a torso or the limb or head blown off. */
export const critCount = (roll: number, location: Location): CritCount => {
  if (roll <= 7) return { hits: 0, blownOff: false }
  if (roll <= 9) return { hits: 1, blownOff: false }
  if (roll <= 11) return { hits: 2, blownOff: false }
  const torso = location === 'CT' || location === 'LT' || location === 'RT'
  return torso ? { hits: 3, blownOff: false } : { hits: 0, blownOff: true }
}

/** What a critical hit strikes: a fixed component by name, a mounted weapon, an ammo bin, or nothing. */
export type CritItem =
  | { kind: 'component'; name: string }
  | { kind: 'weapon'; weaponId: string | null; key: string }
  | { kind: 'ammo'; binId: string | null; key: string }
  | { kind: 'none' }

const ARM_SLOTS: Record<string, keyof ArmState> = { Shoulder: 'shoulderHit', 'Upper Arm': 'upperArmHit', 'Lower Arm': 'lowerArmHit', Hand: 'handHit' }
const LEG_SLOTS: Record<string, keyof LegState> = { Hip: 'hipHit', 'Upper Leg': 'upperLegHit', 'Lower Leg': 'lowerLegHit', Foot: 'footHit' }

/** A weapon slot names its key, with " (R)" for a rear mount. */
const weaponSlot = (slot: string): { key: string; rear: boolean } | null => {
  const rear = slot.endsWith(' (R)')
  const key = rear ? slot.slice(0, -4) : slot
  return WEAPONS_BY_KEY[key] ? { key, rear } : null
}

/**
 * The item in a slot of a known Critical Hit Table. A weapon fills as many slots in a
 * row as it needs, so the n-th group of its slots is the n-th such weapon in the location;
 * the n-th ammo slot of a type is the n-th bin of that type there.
 */
export const itemAt = (attacker: Attacker, weapons: MountedWeapon[], location: Location, index: number): CritItem => {
  const slots = attacker.criticalSlots?.[location] ?? []
  const slot = slots[index] ?? null
  if (slot === null) return { kind: 'none' }
  if (slot.startsWith('Ammo ')) {
    const key = slot.slice(5)
    const nth = slots.slice(0, index).filter((s) => s === slot).length
    const bin = attacker.ammoBins.filter((b) => b.weaponKey === key && b.location === location)[nth]
    return { kind: 'ammo', key, binId: bin?.id ?? null }
  }
  const weapon = weaponSlot(slot)
  if (weapon) {
    // Each run of identical slots splits into groups of the weapon's size; find the group of this slot.
    const size = WEAPONS_BY_KEY[weapon.key].slots
    let group = -1
    let run = 0
    for (let i = 0; i <= index; i++) {
      if (slots[i] !== slot) {
        run = 0
        continue
      }
      if (run % size === 0) group++
      run++
    }
    const mounted = weapons.filter((w) => w.weaponKey === weapon.key && w.location === location && w.rear === weapon.rear)[group]
    return { kind: 'weapon', key: weapon.key, weaponId: mounted?.id ?? null }
  }
  return { kind: 'component', name: slot }
}

/** Whether a critical slot can still take a hit: not empty and not hit before (p. 31). */
export const isApplicable = (attacker: Attacker, location: Location, index: number): boolean => {
  const slot = attacker.criticalSlots?.[location]?.[index] ?? null
  return slot !== null && !(attacker.critHits[location] ?? []).includes(index)
}

/** Ammo slots with shots left: the only slots that count when the location is destroyed (p. 31). */
export const isExplosiveItem = (attacker: Attacker, item: CritItem): boolean => {
  if (item.kind !== 'ammo' || !item.binId) return false
  const bin = attacker.ammoBins.find((b) => b.id === item.binId)
  return !!bin && bin.shots > 0 && isExplosive(bin.weaponKey)
}

const applicableIn = (attacker: Attacker, location: Location, from: number, to: number): boolean => {
  for (let i = from; i < to; i++) if (isApplicable(attacker, location, i)) return true
  return false
}

/** Whether a slot roll in this location needs a die for the block: 12 slots, with something left to hit in both blocks. */
export const needsBlockDie = (attacker: Attacker, location: Location): boolean => {
  return slotCount(location) === 12 && applicableIn(attacker, location, 0, 6) && applicableIn(attacker, location, 6, 12)
}

/** The slot a pair of dice points to: the block die picks 1–6 or 7–12, the slot die the slot in it (p. 31). */
export const slotFromDice = (attacker: Attacker, location: Location, block: number | null, slot: number): number => {
  if (slotCount(location) === 6) return slot - 1
  if (block !== null && needsBlockDie(attacker, location)) return (block <= 3 ? 0 : 6) + slot - 1
  // Only one block has anything left to hit: roll for the slot alone.
  return (applicableIn(attacker, location, 0, 6) ? 0 : 6) + slot - 1
}

/**
 * The location a critical hit lands in. With nothing left to hit, it transfers inward
 * like damage, unless the location's slots were only hit this phase, or the location is
 * the head or center torso: then it is lost (null) (p. 31).
 */
export const critLocation = (attacker: Attacker, location: Location, hitThisPhase: (location: Location) => boolean): Location | null => {
  // Without the table, the player reads the record sheet, transfers included.
  if (!attacker.criticalSlots) return location
  let at: Location | undefined = location
  while (at) {
    if (!isLocationDestroyed(attacker, at) && applicableIn(attacker, at, 0, slotCount(at))) return at
    if (hitThisPhase(at)) return null
    at = TRANSFER[at]
  }
  return null
}

/** Name of what a critical hit strikes, e.g. "Medium Laser (rear)" or "LRM 20 ammo". */
export const itemName = (item: CritItem): string => {
  switch (item.kind) {
    case 'none':
      return 'Nothing'
    case 'component':
      return item.name === 'Engine' ? 'Fusion Engine' : ARM_SLOTS[item.name] || LEG_SLOTS[item.name] ? `${item.name} actuator` : item.name
    case 'weapon':
      return WEAPONS_BY_KEY[item.key].name
    case 'ammo':
      return `${WEAPONS_BY_KEY[item.key].name} ammo`
  }
}

export interface CritEffect {
  attacker: Attacker
  weapons: MountedWeapon[]
  /** What happened, e.g. "Engine hit 2: +10 heat per turn." */
  effect: string
  /** Ammo bin that explodes. */
  explodes: string | null
}

const ARM_KEYS: Partial<Record<Location, 'leftArm' | 'rightArm'>> = { LA: 'leftArm', RA: 'rightArm' }
const LEG_KEYS: Partial<Record<Location, 'leftLeg' | 'rightLeg'>> = { LL: 'leftLeg', RL: 'rightLeg' }

/**
 * Apply a critical hit to what it strikes (Critical Hit Effects, pp. 32–33), marking the
 * slot hit when it is known. Ammo explosions are left to the caller, which applies the damage.
 */
export const applyCritItem = (attacker: Attacker, weapons: MountedWeapon[], location: Location, item: CritItem, slot: number | null): CritEffect => {
  let next: Attacker = slot === null ? attacker : { ...attacker, critHits: { ...attacker.critHits, [location]: [...(attacker.critHits[location] ?? []), slot] } }
  let nextWeapons = weapons
  const result = (effect: string, explodes: string | null = null): CritEffect => ({ attacker: next, weapons: nextWeapons, effect, explodes })
  switch (item.kind) {
    case 'none':
      return result('No effect.')
    case 'weapon': {
      const weapon = weapons.find((w) => w.id === item.weaponId)
      if (!weapon) return result(`The ${WEAPONS_BY_KEY[item.key].name} is not in the loadout: no effect.`)
      if (weapon.destroyed) return result(`The ${WEAPONS_BY_KEY[item.key].name} was already destroyed: the hit is soaked up.`)
      nextWeapons = weapons.map((w) => (w.id === weapon.id ? { ...w, destroyed: true } : w))
      return result(`The ${WEAPONS_BY_KEY[item.key].name} is destroyed.`)
    }
    case 'ammo': {
      const bin = attacker.ammoBins.find((b) => b.id === item.binId)
      if (!bin || bin.shots === 0) return result('Empty ammo slot: no effect.')
      if (!isExplosive(bin.weaponKey)) {
        next = { ...next, ammoBins: next.ammoBins.map((b) => (b.id === bin.id ? { ...b, shots: 0 } : b)) }
        return result(`The ${WEAPONS_BY_KEY[bin.weaponKey].name} ammo is destroyed; it does not explode.`)
      }
      return result(`The ${WEAPONS_BY_KEY[bin.weaponKey].name} ammo explodes. The MechWarrior takes 2 damage.`, bin.id)
    }
    case 'component':
      break
  }
  const { name } = item
  const armKey = ARM_KEYS[location]
  const legKey = LEG_KEYS[location]
  if (armKey && ARM_SLOTS[name]) {
    next = { ...next, [armKey]: { ...next[armKey], [ARM_SLOTS[name]]: true } }
    return result(`${LOCATION_NAMES[location]} ${name.toLowerCase()} actuator destroyed.`)
  }
  if (legKey && LEG_SLOTS[name]) {
    next = { ...next, [legKey]: { ...next[legKey], [LEG_SLOTS[name]]: true } }
    return result(`${LOCATION_NAMES[location]} ${name.toLowerCase()} actuator destroyed: Piloting Skill Roll.`)
  }
  switch (name) {
    case 'Engine': {
      const engineHits = Math.min(3, next.engineHits + 1)
      next = { ...next, engineHits }
      return result(engineHits >= 3 ? 'Third engine hit: the ’Mech is destroyed.' : `Engine hit ${engineHits}: +${engineHits * 5} heat per turn.`)
    }
    case 'Gyro': {
      const gyroHits = Math.min(2, next.gyroHits + 1)
      next = { ...next, gyroHits }
      return result(gyroHits >= 2 ? 'Gyro destroyed: the ’Mech falls and cannot stand.' : 'Gyro damaged: +3 to Piloting Skill Rolls, and a roll now.')
    }
    case 'Sensors': {
      const sensorHits = Math.min(2, next.sensorHits + 1)
      next = { ...next, sensorHits }
      return result(sensorHits >= 2 ? 'Second sensor hit: no weapon attacks.' : 'Sensor hit: +2 to weapon attacks.')
    }
    case 'Cockpit':
      next = { ...next, cockpitHit: true }
      return result('Cockpit destroyed: the MechWarrior is killed and the ’Mech destroyed.')
    case 'Life Support':
      next = { ...next, lifeSupportHit: true }
      return result(attacker.lifeSupportHit ? 'Life support already out: no further effect.' : 'Life support out: heat of 15+ hurts the MechWarrior in the Heat Phase.')
    case 'Heat Sink':
      next = { ...next, heatSinkHits: Math.min(next.heatSinks, next.heatSinkHits + 1) }
      return result('Heat sink destroyed: 1 less heat dissipated.')
    case 'Jump Jet':
      return result('Jump jet destroyed: Jumping MP –1. Mark it on the record sheet.')
    default:
      return result(`${name}: no effect.`)
  }
}

/** Fixed components a location can hold, for picking what a slot of the record sheet holds when the app does not know the table. */
export const COMPONENTS_BY_LOCATION: Record<Location, string[]> = {
  HD: ['Life Support', 'Sensors', 'Cockpit', 'Heat Sink'],
  CT: ['Engine', 'Gyro', 'Heat Sink', 'Jump Jet'],
  LT: ['Heat Sink', 'Jump Jet', 'CASE'],
  RT: ['Heat Sink', 'Jump Jet', 'CASE'],
  LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'Heat Sink'],
  RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'Heat Sink'],
  LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Jump Jet'],
  RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Jump Jet'],
}

/** Everything a slot of a location could hold, for picking off the record sheet. */
export const itemsIn = (attacker: Attacker, weapons: MountedWeapon[], location: Location): { label: string; item: CritItem }[] => [
  ...COMPONENTS_BY_LOCATION[location].map((name) => ({ label: itemName({ kind: 'component', name }), item: { kind: 'component', name } as CritItem })),
  ...weapons
    .filter((w) => w.location === location)
    .map((w) => ({ label: `${WEAPONS_BY_KEY[w.weaponKey].name}${w.rear ? ' (rear)' : ''}`, item: { kind: 'weapon', key: w.weaponKey, weaponId: w.id } as CritItem })),
  ...attacker.ammoBins
    .filter((b) => b.location === location)
    .map((b) => ({ label: `${WEAPONS_BY_KEY[b.weaponKey].name} ammo (${b.shots} shots)`, item: { kind: 'ammo', key: b.weaponKey, binId: b.id } as CritItem })),
]

/** Fields a critical hit can change besides damage, kept so it can be undone. */
export type CritFields = Pick<
  Attacker,
  'critHits' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg' | 'engineHits' | 'gyroHits' | 'sensorHits' | 'heatSinkHits' | 'cockpitHit' | 'lifeSupportHit'
>

export const critFields = ({ critHits, leftArm, rightArm, leftLeg, rightLeg, engineHits, gyroHits, sensorHits, heatSinkHits, cockpitHit, lifeSupportHit }: Attacker): CritFields => ({
  critHits,
  leftArm,
  rightArm,
  leftLeg,
  rightLeg,
  engineHits,
  gyroHits,
  sensorHits,
  heatSinkHits,
  cockpitHit,
  lifeSupportHit,
})

/** Dice for one try at a critical slot: the block die (1D6, 12-slot locations only) and the slot die (1D6). */
export interface CritAttempt {
  block: number | null
  slot: number | null
}

/** A critical hit applied, with what it changed so it can be undone. */
export interface AppliedCrit {
  location: Location
  slot: number | null
  name: string
  effect: string
  before: CritFields & DamageFields
  /** Weapon it destroyed. */
  weaponId: string | null
  /** Damage of the ammo explosion it set off. */
  explosion: { steps: DamageStep[]; lost: number } | null
}

/** One critical hit of a check: the slot rolls, until one hits something. */
export interface CritHitRoll {
  attempts: CritAttempt[]
  /** Without a known Critical Hit Table: what the player's record sheet says the slot holds. */
  picked: CritItem | null
  applied: AppliedCrit | null
}

/** Why a location checks for critical hits. */
export type CritCheckKind = 'structure' | 'through-armor' | 'destroyed'

/** A roll on the Determining Critical Hits Table for one location, and the critical hits it gives. */
export interface CritCheck {
  id: string
  location: Location
  kind: CritCheckKind
  /** Phase of the damage: critical hits that run out of slots in it are lost instead of transferring. */
  phase: string
  /** Set when a hit added the check (e.g. a through-armor critical); it goes away with that hit. */
  source?: string
  /** Internal structure damage of the location when the check came up; less means the damage was undone. */
  structure: number
  /** 2D6 on the Determining Critical Hits Table, null until rolled. */
  roll: number | null
  hits: CritHitRoll[]
  /** A limb or head blown off by a 12, once applied. */
  blownOff: { before: DamageFields } | null
}

export const newCritHit = (): CritHitRoll => ({ attempts: [{ block: null, slot: null }], picked: null, applied: null })

/** Where a critical hit stands. */
export type CritHitState =
  | { kind: 'applied' }
  | { kind: 'lost' }
  | { kind: 'pick'; location: Location }
  | { kind: 'roll'; location: Location; attempt: number; needsBlock: boolean; tries: { slot: number; reason: string }[] }
  | { kind: 'ready'; location: Location; slot: number | null; item: CritItem; tries: { slot: number; reason: string }[] }
  | { kind: 'discarded'; location: Location; slot: number; item: CritItem }

/**
 * Work out a critical hit from its dice: the location it lands in, then the slot. An empty
 * or already hit slot means rolling again (both dice for a 12-slot location). In a destroyed
 * location only exploding ammo counts; anything else is discarded (p. 31).
 */
export const resolveCritHit = (attacker: Attacker, weapons: MountedWeapon[], check: CritCheck, hit: CritHitRoll, hitThisPhase: (location: Location) => boolean): CritHitState => {
  if (hit.applied) return { kind: 'applied' }
  const location = check.kind === 'destroyed' ? check.location : critLocation(attacker, check.location, hitThisPhase)
  if (!location) return { kind: 'lost' }
  if (!attacker.criticalSlots) return hit.picked ? { kind: 'ready', location, slot: null, item: hit.picked, tries: [] } : { kind: 'pick', location }
  const needsBlock = needsBlockDie(attacker, location)
  const tries: { slot: number; reason: string }[] = []
  for (const [i, attempt] of hit.attempts.entries()) {
    if (attempt.slot === null || (needsBlock && attempt.block === null)) return { kind: 'roll', location, attempt: i, needsBlock, tries }
    const slot = slotFromDice(attacker, location, needsBlock ? attempt.block : null, attempt.slot)
    const item = itemAt(attacker, weapons, location, slot)
    if (check.kind === 'destroyed') return isExplosiveItem(attacker, item) ? { kind: 'ready', location, slot, item, tries } : { kind: 'discarded', location, slot, item }
    if (isApplicable(attacker, location, slot)) return { kind: 'ready', location, slot, item, tries }
    tries.push({ slot, reason: attacker.criticalSlots[location][slot] === null ? 'empty' : 'already hit' })
  }
  return { kind: 'roll', location, attempt: hit.attempts.length, needsBlock, tries }
}

/** Critical hits a check gives, once rolled. */
export const checkHits = (check: CritCheck): CritCount => (check.roll === null ? { hits: 0, blownOff: false } : critCount(check.roll, check.location))
