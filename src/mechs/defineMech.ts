import type { ArmorFacing, ArmState, Location } from '../rules/types'

/**
 * A weapon and its location on the record sheet, e.g. ['ML', 'RA'].
 * Add 'rear' for a rear-firing mount: ['ML', 'CT', 'rear'].
 * Weapon keys are listed in WEAPONS in src/rules/tables.ts.
 */
export type WeaponMount = [weaponKey: string, location: Location] | [weaponKey: string, location: Location, mount: 'rear']

/** Record sheet data of one 'Mech model. See README.md in this folder for how to add one. */
export interface MechDefinition {
  /** Chassis and model, e.g. 'Atlas AS7-D'. Shown in the Add 'Mech dialog. */
  name: string
  tonnage: number
  /** Single heat sinks, including those in the engine. */
  heatSinks: number
  /** Only what differs from a full arm, e.g. { hasHand: false } or { present: false } for no arm. */
  leftArm?: Partial<Pick<ArmState, 'present' | 'hasLowerArm' | 'hasHand' | 'hasHatchet'>>
  rightArm?: Partial<Pick<ArmState, 'present' | 'hasLowerArm' | 'hasHand' | 'hasHatchet'>>
  /** Armor points per location. CTR, LTR and RTR are the rear torso armor. */
  armor: Record<ArmorFacing, number>
  weapons: WeaponMount[]
  /** One entry per full ton of ammunition: the weapon it is for and its location. */
  ammo?: [weaponKey: string, location: Location][]
}

/** Identity helper so 'Mech files get type checking and editor autocomplete. */
export const defineMech = (mech: MechDefinition): MechDefinition => mech
