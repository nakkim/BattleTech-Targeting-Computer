import { projectHeat } from '../rules/heat'
import type { HitTable } from '../rules/tables'
import type { Attacker, MountedWeapon, Spotter, Target } from '../rules/types'
import { defaultAttacker, defaultSpotter, defaultTarget, newId, newWeapon } from './defaults'

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
}

export function newUnit(name: string): UnitState {
  const target = defaultTarget()
  return {
    id: newId('u'),
    attacker: { ...defaultAttacker(), name },
    targets: [target],
    weapons: [newWeapon('ML', 'RA', target.id), newWeapon('ML', 'LA', target.id), newWeapon('SRM6', 'RT', target.id)],
    spotter: defaultSpotter(),
    attackerIsSpotting: false,
    selectedTargetId: target.id,
    physicalTargetId: target.id,
    hatchetTable: 'standard',
  }
}

export function initialLance(): LanceState {
  const unit = newUnit('’Mech 1')
  return { units: [unit], activeUnitId: unit.id }
}

/** Clear movement and per-turn declarations, and carry projected heat forward. */
export function advanceTurn(unit: UnitState): UnitState {
  const { attacker, targets, weapons } = unit
  return {
    ...unit,
    attacker: {
      ...attacker,
      movement: 'stationary',
      hexesMoved: 0,
      torsoTwisted: false,
      armsFlipped: false,
      heat: projectHeat(attacker, weapons).next,
    },
    targets: targets.map((t) => ({ ...t, hexesMoved: 0, jumped: false, legArc: t.arc })),
    weapons: weapons.map((w) => ({ ...w, fire: true, indirect: false, aimedAt: null })),
    attackerIsSpotting: false,
  }
}
