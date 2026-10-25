import { projectHeat } from '../rules/heat'
import type { HitTable } from '../rules/tables'
import type { Attacker, MountedWeapon, Spotter, Target } from '../rules/types'
import { defaultAttacker, defaultSpotter, newId } from './defaults'
import { highlanderAttacker, highlanderWeapons, hunchbackTarget, locustTarget } from './presets'

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

/** A new lance member: an HGN-732 Highlander facing a Hunchback (primary) and a Locust. */
export const newUnit = (name?: string): UnitState => {
  const target = hunchbackTarget()
  return {
    id: newId('u'),
    attacker: highlanderAttacker(name),
    targets: [target, locustTarget()],
    weapons: highlanderWeapons(target.id),
    spotter: defaultSpotter(),
    attackerIsSpotting: false,
    selectedTargetId: target.id,
    physicalTargetId: target.id,
    hatchetTable: 'standard',
  }
}

/** Fill in attacker fields added after a lance was saved, so old saves keep working. */
export const normalizeLance = (lance: LanceState): LanceState => {
  return {
    ...lance,
    units: lance.units.map((u) => ({ ...u, attacker: { ...defaultAttacker(), ...u.attacker } })),
  }
}

export const initialLance = (): LanceState => {
  const unit = newUnit()
  return { units: [unit], activeUnitId: unit.id }
}

/** Clear movement and per-turn declarations, and carry projected heat forward. */
export const advanceTurn = (unit: UnitState): UnitState => {
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
