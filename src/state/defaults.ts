import { shotsPerBin } from '../rules/ammo'
import { maxArmorFacings } from '../rules/damage'
import type { AmmoBin, ArmState, Attacker, LegState, Location, MountedWeapon, Spotter, Target } from '../rules/types'

export const defaultArm = (): ArmState => ({
  present: true,
  shoulderHit: false,
  upperArmHit: false,
  lowerArmHit: false,
  handHit: false,
  hasLowerArm: true,
  hasHand: true,
  hasHatchet: false,
})

export const defaultLeg = (): LegState => ({
  hipHit: false,
  upperLegHit: false,
  lowerLegHit: false,
  footHit: false,
})

/** Attacker fields to override. Arm fields are merged into the default arm. */
export interface AttackerOptions extends Omit<Partial<Attacker>, 'leftArm' | 'rightArm'> {
  leftArm?: Partial<ArmState>
  rightArm?: Partial<ArmState>
}

export const createAttacker = ({ leftArm, rightArm, ...options }: AttackerOptions = {}): Attacker => ({
  ammoBins: [],
  // Without record sheet values, every location carries its maximum armor.
  armor: maxArmorFacings(options.tonnage ?? 55),
  armorDamage: {},
  structureDamage: {},
  name: 'Attacker',
  gunnery: 4,
  piloting: 5,
  tonnage: 55,
  movement: 'stationary',
  hexesMoved: 0,
  prone: false,
  heat: 0,
  shutdown: false,
  pilotHits: 0,
  unconscious: false,
  sensorHits: 0,
  waterDepth: 0,
  armsFlipped: false,
  torsoTwisted: false,
  proneBracingArm: 'LA',
  leftLeg: defaultLeg(),
  rightLeg: defaultLeg(),
  heatSinks: 10,
  heatSinkHits: 0,
  submergedHeatSinks: 0,
  engineHits: 0,
  gyroHits: 0,
  hasClub: false,
  destroyedLocations: [],
  criticalSlots: null,
  critHits: {},
  cockpitHit: false,
  lifeSupportHit: false,
  ...options,
  leftArm: { ...defaultArm(), ...leftArm },
  rightArm: { ...defaultArm(), ...rightArm },
})

let counter = 0
export const newId = (prefix: string): string => {
  counter++
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}

export const createTarget = (options: Partial<Target> = {}): Target => ({
  id: newId('t'),
  name: 'Target 1',
  range: 4,
  hexesMoved: 0,
  jumped: false,
  prone: false,
  immobile: false,
  terrain: 'clear',
  interveningLight: 0,
  interveningHeavy: 0,
  partialCover: false,
  waterDepth: 0,
  arc: 'front',
  legArc: 'front',
  attackDirection: 'front',
  primary: true,
  piloting: 5,
  tonnage: 50,
  levelDifference: 0,
  ...options,
})

export const defaultSpotter = (): Spotter => ({ movement: 'stationary', attacked: false, prone: false })

export const newWeapon = (weaponKey: string, location: MountedWeapon['location'], targetId: string): MountedWeapon => {
  return { id: newId('w'), weaponKey, location, rear: false, fire: true, targetId, indirect: false, aimedAt: null }
}

/** A full one-ton ammo bin. */
export const newAmmoBin = (weaponKey: string, location: Location): AmmoBin => {
  return { id: newId('a'), weaponKey, location, shots: shotsPerBin(weaponKey) }
}

/** Full ammo bins, one per [weapon type, location] entry. */
export const fillAmmoBins = (bins: [weaponKey: string, location: Location][]): AmmoBin[] => {
  return bins.map(([weaponKey, location]) => newAmmoBin(weaponKey, location))
}
