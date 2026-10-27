import { isExplosive, spendAmmo, usesAmmo } from '../rules/ammo'
import { explodeAmmo } from '../rules/damage'
import { projectHeat } from '../rules/heat'
import { ammoCheck, applyFall, fallDamage, fallsOnShutdown, fiveGroups, needsShutdownPsr, shutdownAfter, type HeatPhase } from '../rules/heatPhase'
import { ammoExplosionAvoid, LOCATION_NAMES, WEAPONS_BY_KEY, type HitTable } from '../rules/tables'
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
  /** Rolls of the last Heat Phase, made with physical dice; null before the first. */
  heatPhase: HeatPhase | null
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
    heatPhase: null,
  }
}

/** Fill in fields added after a lance was saved, so old saves keep working. */
export const normalizeLance = (lance: LanceState): LanceState => {
  return {
    ...lance,
    turn: lance.turn ?? 1,
    units: lance.units.map((u) => ({
      ...u,
      attacker: createAttacker(u.attacker),
      heatPhase: u.heatPhase
        ? { ...u.heatPhase, fallFacingRoll: u.heatPhase.fallFacingRoll ?? null, fallRolls: u.heatPhase.fallRolls ?? [], fall: u.heatPhase.fall ?? null }
        : null,
    })),
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

/**
 * Heat Phase rolls for the heat after the phase. Untracked ammo still needs the
 * explosion roll when the loadout has explosive ammo, for the plain mode notice.
 */
const heatPhaseFor = (attacker: Attacker, weapons: MountedWeapon[], tracking: boolean): HeatPhase => {
  const hasAmmo = weapons.some((w) => usesAmmo(w.weaponKey) && isExplosive(w.weaponKey))
  return {
    heat: attacker.heat,
    wasShutdown: attacker.shutdown,
    wasProne: attacker.prone,
    ammoTarget: tracking ? ammoCheck(attacker.heat, attacker) : hasAmmo ? ammoExplosionAvoid(attacker.heat) : null,
    powerRoll: null,
    ammoRoll: null,
    psrRoll: null,
    explosion: null,
    fallFacingRoll: null,
    fallRolls: [],
    fall: null,
  }
}

/**
 * End the turn: carry projected heat forward, spend the ammo fired (when tracked),
 * list the Heat Phase rolls, and clear movement and per-turn declarations.
 */
export const advanceTurn = (unit: UnitState, tracking = true): UnitState => {
  const { attacker, targets, weapons } = unit
  const heated: Attacker = {
    ...attacker,
    heat: projectHeat(rulesAttacker(attacker, tracking), weapons).next,
    ammoBins: tracking ? spendAmmo(attacker, weapons) : attacker.ammoBins,
  }
  const heatPhase = heatPhaseFor(heated, weapons, tracking)
  return {
    ...unit,
    attacker: {
      ...heated,
      // When tracked: automatic shutdown or restart, and a fall that no roll can avoid; rolled ones wait for the result.
      shutdown: tracking ? (shutdownAfter(heatPhase) ?? heated.shutdown) : heated.shutdown,
      prone: heated.prone || (tracking && fallsOnShutdown(heatPhase, heated) === true),
      movement: 'stationary',
      hexesMoved: 0,
      torsoTwisted: false,
      armsFlipped: false,
    },
    targets: targets.map((t) => ({ ...t, hexesMoved: 0, jumped: false, legArc: t.arc })),
    weapons: weapons.map((w) => ({ ...w, fire: true, indirect: false, aimedAt: null })),
    attackerIsSpotting: false,
    heatPhase,
  }
}

export type HeatRoll = 'powerRoll' | 'ammoRoll' | 'psrRoll'

/**
 * Enter a 2D6 result of the Heat Phase (null clears it). The power plant shuts
 * down or restarts with the shutdown roll, and the 'Mech falls on a failed PSR.
 */
export const enterHeatRoll = (unit: UnitState, roll: HeatRoll, value: number | null): UnitState => {
  if (!unit.heatPhase) return unit
  const phase = { ...unit.heatPhase, [roll]: value }
  if (!needsShutdownPsr(phase)) phase.psrRoll = null
  const falls = fallsOnShutdown(phase, unit.attacker) === true
  // No fall after all: forget its rolls and take back its damage.
  const attacker = !falls && phase.fall ? { ...unit.attacker, ...phase.fall.before } : unit.attacker
  if (!falls) Object.assign(phase, { fallFacingRoll: null, fallRolls: [], fall: null })
  return {
    ...unit,
    heatPhase: phase,
    attacker: {
      ...attacker,
      shutdown: shutdownAfter(phase) ?? phase.wasShutdown,
      prone: phase.wasProne || falls,
    },
  }
}

/** Enter the Facing After Fall roll (1D6) or the Hit Location roll (2D6) of one group of falling damage. */
export const enterFallRoll = (unit: UnitState, roll: 'facing' | number, value: number | null): UnitState => {
  const phase = unit.heatPhase
  if (!phase || phase.fall) return unit
  if (roll === 'facing') return { ...unit, heatPhase: { ...phase, fallFacingRoll: value } }
  const fallRolls = [...phase.fallRolls]
  fallRolls[roll] = value
  return { ...unit, heatPhase: { ...phase, fallRolls } }
}

/** Apply the falling damage once every roll is in. */
export const applyFallDamage = (unit: UnitState): UnitState => {
  const phase = unit.heatPhase
  if (!phase || phase.fall || phase.fallFacingRoll === null) return unit
  const groups = fiveGroups(fallDamage(unit.attacker))
  const rolls = groups.map((_, i) => phase.fallRolls[i] ?? null)
  if (rolls.some((r) => r === null)) return unit
  const { attacker, fall } = applyFall(unit.attacker, phase.fallFacingRoll, rolls as number[])
  return { ...unit, attacker, heatPhase: { ...phase, fall } }
}

/** Undo the falling damage, keeping the rolls so they can be corrected. */
export const undoFallDamage = (unit: UnitState): UnitState => {
  const fall = unit.heatPhase?.fall
  if (!unit.heatPhase || !fall) return unit
  return { ...unit, attacker: { ...unit.attacker, ...fall.before }, heatPhase: { ...unit.heatPhase, fall: null } }
}

/** Explode an ammo bin after a failed heat roll, keeping what it changed so it can be undone. */
export const explodeHeatAmmo = (unit: UnitState, binId: string): UnitState => {
  const { attacker, heatPhase } = unit
  const bin = attacker.ammoBins.find((b) => b.id === binId)
  if (!heatPhase || !bin) return unit
  const { armorDamage, structureDamage, destroyedLocations, ammoBins } = attacker
  const result = explodeAmmo(attacker, binId)
  const label = `${WEAPONS_BY_KEY[bin.weaponKey].name} ammo in the ${LOCATION_NAMES[bin.location].toLowerCase()} explodes`
  return {
    ...unit,
    attacker: result.attacker,
    heatPhase: { ...heatPhase, explosion: { label, steps: result.steps, lost: result.lost, before: { armorDamage, structureDamage, destroyedLocations, ammoBins } } },
  }
}

/** Undo the heat explosion: restore armor, internal structure, destroyed locations and ammo. */
export const undoHeatExplosion = (unit: UnitState): UnitState => {
  const explosion = unit.heatPhase?.explosion
  if (!unit.heatPhase || !explosion) return unit
  return { ...unit, attacker: { ...unit.attacker, ...explosion.before }, heatPhase: { ...unit.heatPhase, explosion: null } }
}
