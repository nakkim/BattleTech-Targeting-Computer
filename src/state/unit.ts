import { isExplosive, spendAmmo, usesAmmo } from '../rules/ammo'
import { explodeAmmo } from '../rules/damage'
import { projectHeat } from '../rules/heat'
import { ammoCheck, pendingHeatSteps, shutdownAfter, shutsDownStanding, type HeatPhase } from '../rules/heatPhase'
import {
  applyFall,
  checkPsrs,
  fallDamage,
  fiveGroups,
  noFall,
  pendingPsrSteps,
  proneAfter,
  PSR_CAUSES,
  psrModifiers,
  type Psr,
  type PsrCause,
  type PsrPhase,
  type PsrQueue,
} from '../rules/psr'
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
  /** Piloting Skill Rolls of this turn, made with physical dice. */
  psrs: PsrQueue
}

export const noPsrs = (): PsrQueue => ({ wasProne: false, rolls: [] })

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
    psrs: noPsrs(),
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
      heatPhase: u.heatPhase ?? null,
      psrs: u.psrs ?? noPsrs(),
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
    explosion: null,
  }
}

const newPsr = (cause: PsrCause, phase: PsrPhase = PSR_CAUSES[cause].phase): Psr => ({
  id: newId('p'),
  cause,
  phase,
  roll: null,
  frozen: null,
  pilotRoll: null,
  fall: noFall(),
})

/**
 * Bring the 'Mech in line with its Piloting Skill Rolls: take back falling damage of
 * rolls that no longer fall, and set prone from the rolls.
 */
const settlePsrs = (unit: UnitState): UnitState => {
  const { psrs } = unit
  if (psrs.rolls.length === 0) return unit
  let attacker = unit.attacker
  const checks = checkPsrs(psrs, attacker)
  const rolls = psrs.rolls.map((psr, i) => {
    if (checks[i].outcome === 'falls') return psr
    if (psr.fall.applied) attacker = { ...attacker, ...psr.fall.applied.before }
    return { ...psr, pilotRoll: null, fall: noFall() }
  })
  const queue = { ...psrs, rolls }
  return { ...unit, psrs: queue, attacker: { ...attacker, prone: proneAfter(queue, checkPsrs(queue, attacker)) } }
}

/** Start the turn's Piloting Skill Rolls when the first comes up, remembering whether the 'Mech was prone. */
const withPsr = (unit: UnitState, psr: Psr): UnitState => {
  const psrs = unit.psrs.rolls.length ? unit.psrs : { wasProne: unit.attacker.prone, rolls: [] }
  return settlePsrs({ ...unit, psrs: { ...psrs, rolls: [...psrs.rolls, psr] } })
}

/** Add or remove the Piloting Skill Roll for shutting down while standing, as the shutdown roll decides. */
const syncShutdownPsr = (unit: UnitState): UnitState => {
  const needed = unit.heatPhase !== null && shutsDownStanding(unit.heatPhase)
  const existing = unit.psrs.rolls.find((p) => p.cause === 'shutdown')
  if (needed && !existing) return withPsr(unit, newPsr('shutdown'))
  if (!needed && existing) return removePsr(unit, existing.id)
  return unit
}

/**
 * End the turn: carry projected heat forward, spend the ammo fired (when tracked),
 * list the Heat Phase rolls, clear the Piloting Skill Rolls, and clear movement and per-turn declarations.
 */
export const advanceTurn = (unit: UnitState, tracking = true): UnitState => {
  const { attacker, targets, weapons } = unit
  const heated: Attacker = {
    ...attacker,
    heat: projectHeat(rulesAttacker(attacker, tracking), weapons).next,
    ammoBins: tracking ? spendAmmo(attacker, weapons) : attacker.ammoBins,
  }
  const heatPhase = heatPhaseFor(heated, weapons, tracking)
  const next: UnitState = {
    ...unit,
    attacker: {
      ...heated,
      // When tracked: automatic shutdown or restart; a rolled one waits for the result.
      shutdown: tracking ? (shutdownAfter(heatPhase) ?? heated.shutdown) : heated.shutdown,
      movement: 'stationary',
      hexesMoved: 0,
      torsoTwisted: false,
      armsFlipped: false,
    },
    targets: targets.map((t) => ({ ...t, hexesMoved: 0, jumped: false, legArc: t.arc })),
    weapons: weapons.map((w) => ({ ...w, fire: true, indirect: false, aimedAt: null })),
    attackerIsSpotting: false,
    heatPhase,
    psrs: noPsrs(),
  }
  return tracking ? syncShutdownPsr(next) : next
}

export type HeatRoll = 'powerRoll' | 'ammoRoll'

/** Enter a 2D6 result of the Heat Phase (null clears it). The power plant shuts down or restarts with the shutdown roll. */
export const enterHeatRoll = (unit: UnitState, roll: HeatRoll, value: number | null): UnitState => {
  if (!unit.heatPhase) return unit
  const phase = { ...unit.heatPhase, [roll]: value }
  return syncShutdownPsr({ ...unit, heatPhase: phase, attacker: { ...unit.attacker, shutdown: shutdownAfter(phase) ?? phase.wasShutdown } })
}

/** Add a Piloting Skill Roll for an event, at the end of the phase it belongs to. */
export const addPsr = (unit: UnitState, cause: PsrCause, phase?: PsrPhase): UnitState => withPsr(unit, newPsr(cause, phase))

/** Remove a Piloting Skill Roll, taking back its falling damage. */
export const removePsr = (unit: UnitState, id: string): UnitState => {
  const psr = unit.psrs.rolls.find((p) => p.id === id)
  if (!psr) return unit
  const attacker = psr.fall.applied ? { ...unit.attacker, ...psr.fall.applied.before } : unit.attacker
  const rolls = unit.psrs.rolls.filter((p) => p.id !== id)
  // With no rolls left the 'Mech is back as it was.
  if (rolls.length === 0) return { ...unit, attacker: { ...attacker, prone: unit.psrs.wasProne }, psrs: noPsrs() }
  return settlePsrs({ ...unit, attacker, psrs: { ...unit.psrs, rolls } })
}

const updatePsr = (unit: UnitState, id: string, update: (psr: Psr) => Psr): UnitState => ({
  ...unit,
  psrs: { ...unit.psrs, rolls: unit.psrs.rolls.map((p) => (p.id === id ? update(p) : p)) },
})

/**
 * Enter the 2D6 result of a Piloting Skill Roll or of the MechWarrior's roll after a
 * fall (null clears it). Entering the roll fixes its modifiers.
 */
export const enterPsrRoll = (unit: UnitState, id: string, roll: 'roll' | 'pilotRoll', value: number | null): UnitState => {
  const psr = unit.psrs.rolls.find((p) => p.id === id)
  if (!psr) return unit
  if (roll === 'pilotRoll') return updatePsr(unit, id, (p) => ({ ...p, pilotRoll: value }))
  const frozen = value === null ? null : psrModifiers(unit.psrs, psr, unit.attacker)
  return settlePsrs(updatePsr(unit, id, (p) => ({ ...p, roll: value, frozen })))
}

/** Enter the Facing After Fall roll (1D6) or the Hit Location roll (2D6) of one group of falling damage. */
export const enterFallRoll = (unit: UnitState, id: string, roll: 'facing' | number, value: number | null): UnitState => {
  return updatePsr(unit, id, (p) => {
    if (p.fall.applied) return p
    if (roll === 'facing') return { ...p, fall: { ...p.fall, facingRoll: value } }
    const locationRolls = [...p.fall.locationRolls]
    locationRolls[roll] = value
    return { ...p, fall: { ...p.fall, locationRolls } }
  })
}

/** Apply the falling damage of a failed roll once every dice result is in. */
export const applyFallDamage = (unit: UnitState, id: string): UnitState => {
  const psr = unit.psrs.rolls.find((p) => p.id === id)
  if (!psr || psr.fall.applied || psr.fall.facingRoll === null) return unit
  const { levels, rear } = PSR_CAUSES[psr.cause]
  const rolls = fiveGroups(fallDamage(unit.attacker, levels)).map((_, i) => psr.fall.locationRolls[i] ?? null)
  if (rolls.some((r) => r === null)) return unit
  const { attacker, fall } = applyFall(unit.attacker, psr.fall.facingRoll, rolls as number[], { levels, rear })
  return updatePsr({ ...unit, attacker }, id, (p) => ({ ...p, fall: { ...p.fall, applied: fall } }))
}

/** Undo falling damage, keeping the rolls so they can be corrected. */
export const undoFallDamage = (unit: UnitState, id: string): UnitState => {
  const psr = unit.psrs.rolls.find((p) => p.id === id)
  if (!psr?.fall.applied) return unit
  return updatePsr({ ...unit, attacker: { ...unit.attacker, ...psr.fall.applied.before } }, id, (p) => ({ ...p, fall: { ...p.fall, applied: null } }))
}

/** Heat Phase and Piloting Skill Roll steps still to do. Only tracked play enters rolls. */
export const pendingSteps = (unit: UnitState, tracking: boolean): number => {
  if (!tracking) return 0
  return (unit.heatPhase ? pendingHeatSteps(unit.heatPhase) : 0) + pendingPsrSteps(unit.psrs, unit.attacker)
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
