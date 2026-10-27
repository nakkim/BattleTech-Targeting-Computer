import { spendAmmo } from '../rules/ammo'
import { projectHeat } from '../rules/heat'
import type { HitTable } from '../rules/tables'
import type { Attacker, MountedWeapon, Spotter, Target } from '../rules/types'
import { createAttacker, createTarget, defaultSpotter, newId } from './defaults'
import { buildMech, defaultMech } from './mechCatalog'
import { rulesAttacker } from './mode'
import { HUNCHBACK_HBK_4G, LOCUST_LCT_1V } from './presets'

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

/** A new lance member facing a Hunchback (primary) and a Locust. Defaults to the default catalog 'Mech. */
export const newUnit = ({ attacker, weapons }: { attacker: Attacker; weapons: MountedWeapon[] } = buildMech(defaultMech())): UnitState => {
  const target = createTarget({ ...HUNCHBACK_HBK_4G, range: 5 })
  return {
    id: newId('u'),
    attacker,
    targets: [target, createTarget({ ...LOCUST_LCT_1V, range: 8, primary: false })],
    weapons: weapons.map((w) => ({ ...w, targetId: target.id })),
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

/**
 * Name for a new lance member: the model name, numbered only when the lance already has that model,
 * e.g. "Atlas AS7-D #2". An unnumbered "Atlas AS7-D" counts as #1.
 */
export const unitName = (model: string, names: string[]): string => {
  const numbers = names.flatMap((name) => {
    if (name === model) return [1]
    const match = name.startsWith(`${model} #`) && /^\d+$/.exec(name.slice(model.length + 2))
    return match ? [Number(match[0])] : []
  })
  return numbers.length ? `${model} #${Math.max(...numbers) + 1}` : model
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
