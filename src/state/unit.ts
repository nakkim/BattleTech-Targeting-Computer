import { spendAmmo } from '../rules/ammo'
import { projectHeat } from '../rules/heat'
import type { HitTable } from '../rules/tables'
import type { Attacker, MountedWeapon, Spotter, Target } from '../rules/types'
import { createAttacker, createTarget, defaultSpotter, fillAmmoBins, mountWeapons, newId } from './defaults'
import { rulesAttacker } from './mode'
import { HIGHLANDER_HGN_732, HUNCHBACK_HBK_4G, LOCUST_LCT_1V, type MechPreset } from './presets'

/** Everything the targeting computer tracks for one 'Mech of the lance. */
export interface UnitState {
  id: string
  attacker: Attacker
  targets: Target[]
  weapons: MountedWeapon[]
  spotter: Spotter
  attackerIsSpotting: boolean
  selectedTargetId: string
  physicalTargetId: string
  hatchetTable: HitTable
}

export interface LanceState {
  units: UnitState[]
  activeUnitId: string
  /** Game turn, starting at 1. */
  turn: number
}

/** A new lance member facing a Hunchback (primary) and a Locust. Defaults to an HGN-732 Highlander. */
export const newUnit = ({ attacker, weapons, ammo = [] }: MechPreset = HIGHLANDER_HGN_732): UnitState => {
  const target = createTarget({ ...HUNCHBACK_HBK_4G, range: 5 })
  return {
    id: newId('u'),
    attacker: createAttacker({ ammoBins: fillAmmoBins(ammo), ...attacker }),
    targets: [target, createTarget({ ...LOCUST_LCT_1V, range: 8, primary: false })],
    weapons: mountWeapons(weapons, target.id),
    spotter: defaultSpotter(),
    attackerIsSpotting: false,
    selectedTargetId: target.id,
    physicalTargetId: target.id,
    hatchetTable: 'standard',
  }
}

/** Fill in fields added after a lance was saved, so old saves keep working. */
export const normalizeLance = (lance: LanceState): LanceState => {
  return {
    ...lance,
    turn: lance.turn ?? 1,
    units: lance.units.map((u) => ({ ...u, attacker: createAttacker(u.attacker) })),
  }
}

export const initialLance = (): LanceState => {
  const unit = newUnit()
  return { units: [unit], activeUnitId: unit.id, turn: 1 }
}

/** Clear movement and per-turn declarations, carry projected heat forward and spend the ammo fired (when tracked). */
export const advanceTurn = (unit: UnitState, tracking = true): UnitState => {
  const { attacker, targets, weapons } = unit
  return {
    ...unit,
    attacker: {
      ...attacker,
      movement: 'stationary',
      hexesMoved: 0,
      torsoTwisted: false,
      armsFlipped: false,
      heat: projectHeat(rulesAttacker(attacker, tracking), weapons).next,
      ammoBins: tracking ? spendAmmo(attacker, weapons) : attacker.ammoBins,
    },
    targets: targets.map((t) => ({ ...t, hexesMoved: 0, jumped: false, legArc: t.arc })),
    weapons: weapons.map((w) => ({ ...w, fire: true, indirect: false, aimedAt: null })),
    attackerIsSpotting: false,
  }
}
