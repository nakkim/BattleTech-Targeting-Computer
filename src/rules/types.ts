export type MovementMode = 'stationary' | 'walked' | 'ran' | 'jumped'

export type Location = 'HD' | 'CT' | 'LT' | 'RT' | 'LA' | 'RA' | 'LL' | 'RL'

/** Armor of every location's front, plus the rear of the three torsos. */
export type ArmorFacing = Location | 'CTR' | 'LTR' | 'RTR'

/** Firing arc of the attacker, or the side of the target that is hit. */
export type Arc = 'front' | 'left' | 'right' | 'rear'

export type Terrain = 'clear' | 'light' | 'heavy'

export type WeaponCategory = 'energy' | 'ballistic' | 'missile' | 'physical'

export interface WeaponSpec {
  key: string
  name: string
  category: WeaponCategory
  heat: number
  /** Critical slots the weapon fills on the record sheet. */
  slots: number
  /** Damage per hit, or per missile for missile weapons. */
  damage: number
  /** Number of missiles per shot (missile weapons only). */
  missiles?: number
  /** Minimum range in hexes, 0 when the weapon has none. */
  minRange: number
  /** Upper bound (inclusive) of each range bracket in hexes. */
  short: number
  medium: number
  long: number
  ammoPerTon?: number
}

export interface ArmState {
  /** False for a 'Mech built without this arm. */
  present: boolean
  shoulderHit: boolean
  upperArmHit: boolean
  lowerArmHit: boolean
  handHit: boolean
  /** False when the 'Mech was built without the actuator. */
  hasLowerArm: boolean
  hasHand: boolean
  hasHatchet: boolean
}

export interface LegState {
  hipHit: boolean
  upperLegHit: boolean
  lowerLegHit: boolean
  footHit: boolean
}

/**
 * What one critical slot holds: an actuator ('Shoulder', 'Upper Arm', 'Lower Arm', 'Hand',
 * 'Hip', 'Upper Leg', 'Lower Leg', 'Foot'), 'Engine', 'Gyro', 'Sensors', 'Cockpit',
 * 'Life Support', 'Heat Sink', 'Jump Jet', 'CASE', a weapon key ('ML', or 'ML (R)' when
 * rear-firing) or ammo ('Ammo LRM20'); null for an empty (Roll Again) slot.
 */
export type CritSlot = string | null

/** Critical Hit Table: 6 slots for the head and legs, 12 for the torsos and arms. */
export type CriticalSlots = Record<Location, CritSlot[]>

export interface Attacker {
  name: string
  gunnery: number
  piloting: number
  tonnage: number
  movement: MovementMode
  /** Hexes moved this turn (used for charge damage and jump heat). */
  hexesMoved: number
  prone: boolean
  heat: number
  /** Power plant shut down by heat (p. 38): the 'Mech cannot move or attack. */
  shutdown: boolean
  /** Damage (wounds) the MechWarrior has taken; the 6th kills (p. 44). */
  pilotHits: number
  /** The MechWarrior is unconscious: the 'Mech cannot move or attack. */
  unconscious: boolean
  sensorHits: number
  /** 0 = dry, 1 = Depth 1, 2 = Depth 2 or deeper. */
  waterDepth: number
  armsFlipped: boolean
  torsoTwisted: boolean
  /** The arm that may not fire while prone. */
  proneBracingArm: 'LA' | 'RA'
  leftArm: ArmState
  rightArm: ArmState
  leftLeg: LegState
  rightLeg: LegState
  heatSinks: number
  /** Heat sinks destroyed by critical hits (p. 33). */
  heatSinkHits: number
  submergedHeatSinks: number
  engineHits: number
  /** Gyro critical hits: 1 damages it, 2 destroy it (p. 32). */
  gyroHits: number
  hasClub: boolean
  /** Locations destroyed or blown off. Head or center torso destroys the 'Mech. */
  destroyedLocations: Location[]
  /** Armor points per facing on the record sheet. */
  armor: Record<ArmorFacing, number>
  /** Armor points lost per facing. */
  armorDamage: Partial<Record<ArmorFacing, number>>
  /** Internal structure circles lost per location. The starting values come from tonnage. */
  structureDamage: Partial<Record<Location, number>>
  /** One bin per ton of ammunition. Ammo types without bins are not tracked. */
  ammoBins: AmmoBin[]
  /** The record sheet's Critical Hit Table; null when not known. */
  criticalSlots: CriticalSlots | null
  /** Critical slots hit, by location (0-based, from the top of the table). */
  critHits: Partial<Record<Location, number[]>>
  /** A critical hit to the cockpit kills the MechWarrior and destroys the 'Mech (p. 32). */
  cockpitHit: boolean
  /** Damaged life support: heat of 15+ hurts the MechWarrior (p. 33). */
  lifeSupportHit: boolean
}

/** One ton of ammunition in a critical slot of the record sheet. */
export interface AmmoBin {
  id: string
  /** Weapon type the ammo is for, e.g. 'LRM20'. */
  weaponKey: string
  location: Location
  /** Shots left. A full bin holds the weapon's ammo per ton. */
  shots: number
}

export interface Target {
  id: string
  name: string
  range: number
  hexesMoved: number
  jumped: boolean
  prone: boolean
  immobile: boolean
  terrain: Terrain
  interveningLight: number
  interveningHeavy: number
  partialCover: boolean
  waterDepth: number
  /** Arc of the attacker the target is in, relative to the torso. */
  arc: Arc
  /** Arc of the attacker the target is in, relative to the feet (differs only if torso twisted). */
  legArc: Arc
  /** Side of the target that the attack strikes. */
  attackDirection: Arc
  primary: boolean
  piloting: number
  tonnage: number
  /** Underlying hex level of the target minus that of the attacker. */
  levelDifference: number
}

export interface Spotter {
  movement: MovementMode
  attacked: boolean
  prone: boolean
}

export interface MountedWeapon {
  id: string
  weaponKey: string
  location: Location
  rear: boolean
  fire: boolean
  targetId: string
  indirect: boolean
  aimedAt: Location | null
  /** Destroyed by a critical hit. */
  destroyed?: boolean
}

export type Gator = 'G' | 'A' | 'T' | 'O' | 'R'

export interface Modifier {
  gator: Gator
  label: string
  value: number
}

export interface AttackResult {
  /** False when the attack cannot be made at all. */
  allowed: boolean
  reasons: string[]
  warnings: string[]
  modifiers: Modifier[]
  targetNumber: number
  probability: number
}
