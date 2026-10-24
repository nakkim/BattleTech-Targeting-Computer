import type { ArmState, Attacker, LegState, MountedWeapon, Spotter, Target } from '../rules/types'

export const defaultArm = (): ArmState => ({
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

export const defaultAttacker = (): Attacker => ({
  name: 'Attacker',
  gunnery: 4,
  piloting: 5,
  tonnage: 55,
  movement: 'stationary',
  hexesMoved: 0,
  prone: false,
  heat: 0,
  sensorHits: 0,
  waterDepth: 0,
  armsFlipped: false,
  torsoTwisted: false,
  proneBracingArm: 'LA',
  leftArm: defaultArm(),
  rightArm: defaultArm(),
  leftLeg: defaultLeg(),
  rightLeg: defaultLeg(),
  heatSinks: 10,
  submergedHeatSinks: 0,
  engineHits: 0,
  hasClub: false,
  destroyedLocations: [],
})

let counter = 0
export function newId(prefix: string): string {
  counter++
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}

export const defaultTarget = (name = 'Target 1', primary = true): Target => ({
  id: newId('t'),
  name,
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
  primary,
  piloting: 5,
  tonnage: 50,
  levelDifference: 0,
})

export const defaultSpotter = (): Spotter => ({ movement: 'stationary', attacked: false, prone: false })

export function newWeapon(weaponKey: string, location: MountedWeapon['location'], targetId: string): MountedWeapon {
  return { id: newId('w'), weaponKey, location, rear: false, fire: true, targetId, indirect: false, aimedAt: null }
}
