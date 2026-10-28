import type { MechDefinition } from '../mechs/defineMech'
import { maxArmorFacings } from '../rules/damage'
import type { Attacker, MountedWeapon } from '../rules/types'
import { createAttacker, fillAmmoBins, newWeapon } from './defaults'

// Every file in src/mechs/ except the helper is one 'Mech model.
const files = import.meta.glob<MechDefinition>(['../mechs/*.ts', '!../mechs/defineMech.ts'], { eager: true, import: 'default' })

/** All 'Mech models, lightest first. */
export const MECHS: MechDefinition[] = Object.values(files).sort((a, b) => a.tonnage - b.tonnage || a.name.localeCompare(b.name))

/** The 'Mech a new lance starts with and the Add 'Mech dialog suggests. */
export const DEFAULT_MECH_NAME = 'Locust LCT-1E'

export const defaultMech = (): MechDefinition => MECHS.find((m) => m.name === DEFAULT_MECH_NAME) ?? MECHS[0]

/**
 * Starting point for a 'Mech that is not in the catalog: 50 tons with
 * provisional maximum armor and a medium laser in each arm, to be edited.
 */
export const OTHER_MECH: MechDefinition = {
  name: "Custom 'Mech",
  tonnage: 50,
  heatSinks: 10,
  armor: maxArmorFacings(50),
  weapons: [
    ['ML', 'LA'],
    ['ML', 'RA'],
  ],
}

/** A fresh attacker and loadout from a 'Mech model. Weapons aim at the given target. */
export const buildMech = (mech: MechDefinition, targetId = ''): { attacker: Attacker; weapons: MountedWeapon[] } => {
  const { name, tonnage, heatSinks, leftArm, rightArm, armor, weapons, ammo = [], criticalSlots = null } = mech
  return {
    attacker: createAttacker({ name, tonnage, heatSinks, leftArm, rightArm, armor: { ...armor }, ammoBins: fillAmmoBins(ammo), criticalSlots }),
    weapons: weapons.map(([weaponKey, location, mount]) => ({ ...newWeapon(weaponKey, location, targetId), rear: mount === 'rear' })),
  }
}
