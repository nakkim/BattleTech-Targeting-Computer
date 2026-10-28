import { isExplosive, spendAmmo, usesAmmo } from '../rules/ammo'
import { explodeAmmo } from '../rules/damage'
import { projectHeat } from '../rules/heat'
import { checkPilot, consciousnessTarget, newPilotTurn, pendingPilotSteps, type PilotTurn } from '../rules/pilot'
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
  type PsrCheck,
  type PsrCause,
  type PsrPhase,
  type PsrQueue,
} from '../rules/psr'
import { ammoExplosionAvoid, LOCATION_NAMES, WEAPONS_BY_KEY, type HitTable } from '../rules/tables'
import { isMechDestroyed } from '../rules/destruction'
import type { Attacker, Location, MountedWeapon, Spotter, Target } from '../rules/types'
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
  /** The MechWarrior's damage this turn and its Consciousness Rolls. */
  pilot: PilotTurn
  /** Phase that new damage and critical hits happen in, for the rolls they call for. */
  attackPhase: PsrPhase
  /** Damage taken this turn per phase, for the roll after 20 or more. */
  damageTaken: Partial<Record<PsrPhase, number>>
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
    pilot: newPilotTurn(attacker),
    attackPhase: 'weapon',
    damageTaken: {},
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
      pilot: u.pilot ?? newPilotTurn(createAttacker(u.attacker)),
      attackPhase: u.attackPhase ?? 'weapon',
      damageTaken: u.damageTaken ?? {},
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

const newPsr = (cause: PsrCause, phase: PsrPhase = PSR_CAUSES[cause].phase, source?: string): Psr => ({
  id: newId('p'),
  cause,
  phase,
  source,
  roll: null,
  frozen: null,
  pilotRoll: null,
  fall: noFall(),
})

/**
 * The 'Mech as its Piloting Skill Rolls see it: knocked out only by damage from
 * before the falls, so a fall cannot make its own roll fail.
 */
export const psrAttacker = (unit: UnitState): Attacker => {
  const { hits, unconscious } = checkPilot({ ...unit.pilot, damage: unit.pilot.damage.filter((d) => !d.source?.startsWith('fall')) })
  return { ...unit.attacker, pilotHits: hits, unconscious }
}

/** Work out the turn's Piloting Skill Rolls. */
export const unitPsrs = (unit: UnitState): PsrCheck[] => checkPsrs(unit.psrs, psrAttacker(unit))

/**
 * Bring the 'Mech in line with its Piloting Skill Rolls: take back falling damage of
 * rolls that no longer fall, and set prone from the rolls.
 */
const settlePsrRolls = (unit: UnitState): UnitState => {
  const { psrs } = unit
  if (psrs.rolls.length === 0) return unit
  let attacker = unit.attacker
  const checks = unitPsrs(unit)
  const rolls = psrs.rolls.map((psr, i) => {
    if (checks[i].outcome === 'falls') return psr
    if (psr.fall.applied) attacker = { ...attacker, ...psr.fall.applied.before }
    return { ...psr, pilotRoll: null, fall: noFall() }
  })
  const next = { ...unit, attacker, psrs: { ...psrs, rolls } }
  return { ...next, attacker: { ...attacker, prone: proneAfter(next.psrs, unitPsrs(next)) } }
}

/** MechWarrior damage the Piloting Skill Rolls call for, by source: a failed roll after a fall, and head hits from falling damage. */
const psrPilotDamage = (unit: UnitState): Map<string, { reason: string; amount: number }> => {
  const damage = new Map<string, { reason: string; amount: number }>()
  for (const check of unitPsrs(unit)) {
    const { psr } = check
    if (check.outcome === 'falls' && check.pilotHurt) damage.set(`fall:${psr.id}`, { reason: `Fall (${PSR_CAUSES[psr.cause].label.toLowerCase()})`, amount: 1 })
    const headHits = psr.fall.applied?.hits.filter((h) => h.steps.some((s) => s.location === 'HD')).length ?? 0
    if (headHits > 0) damage.set(`fallhead:${psr.id}`, { reason: 'Head hit from a fall', amount: headHits })
  }
  return damage
}

/** Bring the MechWarrior's damage from falls in line with the Piloting Skill Rolls. */
const syncPsrPilotDamage = (unit: UnitState): UnitState => {
  const wanted = psrPilotDamage(unit)
  let next = unit
  for (const d of unit.pilot.damage) {
    if (!d.source?.startsWith('fall') || wanted.get(d.source)?.amount === d.amount) continue
    next = withoutPilotDamage(next, d.source)
  }
  for (const [source, { reason, amount }] of wanted) {
    if (!next.pilot.damage.some((d) => d.source === source)) next = withPilotDamage(next, reason, amount, source)
  }
  return next
}

/** Set the MechWarrior's damage and consciousness from the turn's Consciousness Rolls. */
const settlePilot = (unit: UnitState): UnitState => {
  const { hits, unconscious } = checkPilot(unit.pilot)
  return { ...unit, attacker: { ...unit.attacker, pilotHits: hits, unconscious } }
}

/**
 * Settle Piloting Skill Rolls and MechWarrior damage together: a fall can hurt the
 * MechWarrior, and an unconscious MechWarrior fails every later roll.
 */
const settle = (unit: UnitState): UnitState => {
  const key = (u: UnitState) => JSON.stringify([u.psrs, u.pilot, u.attacker.prone, u.attacker.unconscious, u.attacker.pilotHits])
  let next = unit
  for (let i = 0; i < 5; i++) {
    const settled = settlePilot(syncPsrPilotDamage(settlePsrRolls(next)))
    if (key(settled) === key(next)) return settled
    next = settled
  }
  return next
}

const withPilotDamage = (unit: UnitState, reason: string, amount: number, source?: string): UnitState => ({
  ...unit,
  pilot: { ...unit.pilot, damage: [...unit.pilot.damage, { id: newId('w'), source, reason, amount, rolls: [] }] },
})

const withoutPilotDamage = (unit: UnitState, idOrSource: string): UnitState => ({
  ...unit,
  pilot: { ...unit.pilot, damage: unit.pilot.damage.filter((d) => d.id !== idOrSource && d.source !== idOrSource) },
})

/** The MechWarrior takes damage (wounds), each point calling for a Consciousness Roll. */
export const addPilotDamage = (unit: UnitState, reason: string, amount: number, source?: string): UnitState => {
  return settle(withPilotDamage(unit, reason, amount, source))
}

/** Take back MechWarrior damage, by its id or the source that added it. */
export const removePilotDamage = (unit: UnitState, idOrSource: string): UnitState => settle(withoutPilotDamage(unit, idOrSource))

/** Enter the 2D6 Consciousness Roll for one point of damage (null clears it). */
export const enterConsciousnessRoll = (unit: UnitState, damageId: string, index: number, value: number | null): UnitState => {
  const damage = unit.pilot.damage.map((d) => {
    if (d.id !== damageId) return d
    const rolls = [...d.rolls]
    rolls[index] = value
    return { ...d, rolls }
  })
  return settle({ ...unit, pilot: { ...unit.pilot, damage } })
}

/** Enter the End Phase roll to regain consciousness (null clears it). */
export const enterWakeRoll = (unit: UnitState, value: number | null): UnitState => {
  const { wake } = unit.pilot
  if (!wake) return unit
  return settle({ ...unit, pilot: { ...unit.pilot, wake: { ...wake, roll: value } } })
}

/** Heal the MechWarrior: no damage, conscious. */
export const healPilot = (unit: UnitState): UnitState => {
  const attacker = { ...unit.attacker, pilotHits: 0, unconscious: false }
  return settle({ ...unit, attacker, pilot: newPilotTurn(attacker) })
}

/** Start the turn's Piloting Skill Rolls when the first comes up, remembering whether the 'Mech was prone. */
const withPsr = (unit: UnitState, psr: Psr): UnitState => {
  const psrs = unit.psrs.rolls.length ? unit.psrs : { wasProne: unit.attacker.prone, rolls: [] }
  return settle({ ...unit, psrs: { ...psrs, rolls: [...psrs.rolls, psr] } })
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
 * End Phase roll to regain consciousness, for a MechWarrior out cold for the whole
 * turn that ends (p. 44); null when none is due.
 */
const wakeRoll = ({ attacker, pilot }: UnitState): PilotTurn['wake'] => {
  const target = consciousnessTarget(attacker.pilotHits)
  return attacker.unconscious && pilot.wasUnconscious && target !== null ? { target, roll: null } : null
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
    pilot: newPilotTurn(attacker, tracking ? wakeRoll(unit) : null),
    attackPhase: 'weapon',
    damageTaken: {},
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
  if (rolls.length === 0) return settle({ ...unit, attacker: { ...attacker, prone: unit.psrs.wasProne }, psrs: noPsrs() })
  return settle({ ...unit, attacker, psrs: { ...unit.psrs, rolls } })
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
  if (roll === 'pilotRoll') return settle(updatePsr(unit, id, (p) => ({ ...p, pilotRoll: value })))
  const frozen = value === null ? null : psrModifiers(unit.psrs, psr, unit.attacker)
  return settle(updatePsr(unit, id, (p) => ({ ...p, roll: value, frozen })))
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
  return settle(updatePsr({ ...unit, attacker }, id, (p) => ({ ...p, fall: { ...p.fall, applied: fall } })))
}

/** Undo falling damage, keeping the rolls so they can be corrected. */
export const undoFallDamage = (unit: UnitState, id: string): UnitState => {
  const psr = unit.psrs.rolls.find((p) => p.id === id)
  if (!psr?.fall.applied) return unit
  return settle(updatePsr({ ...unit, attacker: { ...unit.attacker, ...psr.fall.applied.before } }, id, (p) => ({ ...p, fall: { ...p.fall, applied: null } })))
}

const LEG_ROLLS: [Location, 'leftLeg' | 'rightLeg'][] = [
  ['LL', 'leftLeg'],
  ['RL', 'rightLeg'],
]

/** Armor and internal structure lost, in total. */
const damageTotal = (attacker: Attacker): number => {
  const sum = (record: Partial<Record<string, number>>) => Object.values(record).reduce<number>((total, n) => total + (n ?? 0), 0)
  return sum(attacker.armorDamage) + sum(attacker.structureDamage)
}

/**
 * Tracked damage that calls for a Piloting Skill Roll, by source key: each damaged
 * leg actuator and hip, each lost leg, the gyro, and 20+ damage in a phase (p. 41).
 */
const damageEvents = (attacker: Attacker, damageTaken: UnitState['damageTaken']): Map<string, PsrCause> => {
  const events = new Map<string, PsrCause>()
  if (isMechDestroyed(attacker)) return events
  for (const [location, key] of LEG_ROLLS) {
    const leg = attacker[key]
    if (leg.hipHit) events.set(`hip:${location}`, 'hip')
    if (leg.upperLegHit) events.set(`upperLeg:${location}`, 'legActuator')
    if (leg.lowerLegHit) events.set(`lowerLeg:${location}`, 'legActuator')
    if (leg.footHit) events.set(`foot:${location}`, 'legActuator')
    if (attacker.destroyedLocations.includes(location)) events.set(`leg:${location}`, 'legDestroyed')
  }
  if (attacker.gyroHits >= 1) events.set('gyro:1', 'gyroHit')
  if (attacker.gyroHits >= 2) events.set('gyro:2', 'gyroDestroyed')
  for (const [phase, damage] of Object.entries(damageTaken)) if ((damage ?? 0) >= 20) events.set(`damage20:${phase}`, 'damage20')
  return events
}

/**
 * Add the Piloting Skill Rolls that new damage calls for, and remove those whose damage
 * was undone or repaired. Damage counts toward the phase given, by default the unit's attack phase.
 */
export const trackDamage = (before: UnitState, after: UnitState, phase: PsrPhase = after.attackPhase): UnitState => {
  let unit = after
  const total = damageTotal(after.attacker)
  const dealt = total - damageTotal(before.attacker)
  if (dealt !== 0) {
    // Fully repaired: nothing counts any more.
    const damageTaken = total === 0 ? {} : { ...after.damageTaken, [phase]: Math.max(0, (after.damageTaken[phase] ?? 0) + dealt) }
    unit = { ...unit, damageTaken }
  }
  const was = damageEvents(before.attacker, before.damageTaken)
  const now = damageEvents(unit.attacker, unit.damageTaken)
  for (const [source, cause] of now) {
    if (was.has(source)) continue
    const rollPhase = cause === 'damage20' ? (source.split(':')[1] as PsrPhase) : phase
    unit = withPsr(unit, newPsr(cause, rollPhase, source))
  }
  for (const source of was.keys()) {
    const psr = unit.psrs.rolls.find((p) => p.source === source)
    if (!now.has(source) && psr) unit = removePsr(unit, psr.id)
  }
  return unit
}

/** Heat Phase and Piloting Skill Roll steps still to do. Only tracked play enters rolls. */
export const pendingSteps = (unit: UnitState, tracking: boolean): number => {
  if (!tracking) return 0
  return (unit.heatPhase ? pendingHeatSteps(unit.heatPhase) : 0) + pendingPsrSteps(unit.psrs, psrAttacker(unit)) + pendingPilotSteps(unit.pilot)
}

/** Explode an ammo bin after a failed heat roll, keeping what it changed so it can be undone. */
export const explodeHeatAmmo = (unit: UnitState, binId: string): UnitState => {
  const { attacker, heatPhase } = unit
  const bin = attacker.ammoBins.find((b) => b.id === binId)
  if (!heatPhase || !bin) return unit
  const { armorDamage, structureDamage, destroyedLocations, ammoBins } = attacker
  const result = explodeAmmo(attacker, binId)
  const label = `${WEAPONS_BY_KEY[bin.weaponKey].name} ammo in the ${LOCATION_NAMES[bin.location].toLowerCase()} explodes`
  const exploded = {
    ...unit,
    attacker: result.attacker,
    heatPhase: { ...heatPhase, explosion: { label, steps: result.steps, lost: result.lost, before: { armorDamage, structureDamage, destroyedLocations, ammoBins } } },
  }
  return addPilotDamage(exploded, 'Ammo explosion', 2, 'heat-explosion')
}

/** Undo the heat explosion: restore armor, internal structure, destroyed locations and ammo. */
export const undoHeatExplosion = (unit: UnitState): UnitState => {
  const explosion = unit.heatPhase?.explosion
  if (!unit.heatPhase || !explosion) return unit
  return removePilotDamage({ ...unit, attacker: { ...unit.attacker, ...explosion.before }, heatPhase: { ...unit.heatPhase, explosion: null } }, 'heat-explosion')
}
