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
import { ammoExplosionAvoid, LOCATION_NAMES, LOCATIONS, WEAPONS_BY_KEY, type HitTable } from '../rules/tables'
import {
  applyCritItem,
  checkHits,
  critCount,
  critFields,
  itemName,
  newCritHit,
  resolveCritHit,
  type AppliedCrit,
  type CritCheck,
  type CritCheckKind,
  type CritHitState,
  type CritItem,
} from '../rules/crits'
import { isLocationDestroyed, isMechDestroyed } from '../rules/destruction'
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
  /** Critical hit checks of this turn, made with physical dice. */
  crits: CritCheck[]
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
    crits: [],
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
      crits: u.crits ?? [],
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

/** Drop critical hit checks of falls whose damage was taken back. */
const dropFallCrits = (unit: UnitState): UnitState => {
  let next = unit
  for (const check of unit.crits) {
    const id = check.source?.startsWith('fall:') ? check.source.slice(5) : null
    if (id && !unit.psrs.rolls.find((p) => p.id === id)?.fall.applied) next = removeCritsBySource(next, check.source!)
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
  const key = (u: UnitState) => JSON.stringify([u.psrs, u.pilot, u.crits, u.attacker.prone, u.attacker.unconscious, u.attacker.pilotHits])
  let next = unit
  for (let i = 0; i < 5; i++) {
    const settled = settlePilot(syncPsrPilotDamage(dropFallCrits(settlePsrRolls(next))))
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
    crits: [],
    attackPhase: 'weapon',
    damageTaken: {},
  }
  if (!tracking) return next
  // Damaged life support: 1 damage at 15–25 heat, 2 at 26+ (p. 33).
  const lifeSupport = heated.lifeSupportHit && heated.heat >= 15 ? (heated.heat >= 26 ? 2 : 1) : 0
  const hurt = lifeSupport ? addPilotDamage(next, 'Heat with damaged life support', lifeSupport, 'life-support') : next
  return syncShutdownPsr(hurt)
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
  // Falling damage checks for critical hits like any other: internal structure, and a location roll of 2.
  const source = `fall:${id}`
  const checks = critChecksFromDamage(unit.attacker, attacker, psr.phase, source)
  let next: UnitState = { ...unit, attacker, crits: [...unit.crits, ...checks] }
  fall.hits.forEach((hit, i) => {
    if (rolls[i] === 2 && hit.steps.length) next = addThroughArmorCrit(next, hit.steps[0].location, source)
  })
  return settle(updatePsr(next, id, (p) => ({ ...p, fall: { ...p.fall, applied: fall } })))
}

/** Undo falling damage, keeping the rolls so they can be corrected. */
export const undoFallDamage = (unit: UnitState, id: string): UnitState => {
  const psr = unit.psrs.rolls.find((p) => p.id === id)
  if (!psr?.fall.applied) return unit
  const undone = removeCritsBySource({ ...unit, attacker: { ...unit.attacker, ...psr.fall.applied.before } }, `fall:${id}`)
  return settle(updatePsr(undone, id, (p) => ({ ...p, fall: { ...p.fall, applied: null } })))
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
  unit = pruneCrits(unit)
  const checks = critChecksFromDamage(before.attacker, unit.attacker, phase)
  if (checks.length) unit = { ...unit, crits: [...unit.crits, ...checks] }
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

/** Heat Phase, Piloting Skill Roll, MechWarrior and critical hit steps still to do. Only tracked play enters rolls. */
export const pendingSteps = (unit: UnitState, tracking: boolean): number => {
  if (!tracking) return 0
  return (unit.heatPhase ? pendingHeatSteps(unit.heatPhase) : 0) + pendingPsrSteps(unit.psrs, psrAttacker(unit)) + pendingPilotSteps(unit.pilot) + pendingCritSteps(unit)
}

const hasLiveAmmo = (attacker: Attacker, location: Location): boolean =>
  attacker.ammoBins.some((b) => b.location === location && b.shots > 0 && isExplosive(b.weaponKey))

const newCritCheck = (location: Location, kind: CritCheckKind, phase: string, structure: number, source?: string): CritCheck => ({
  id: newId('c'),
  location,
  kind,
  phase,
  source,
  structure,
  roll: null,
  hits: [],
  blownOff: null,
})

/**
 * Critical hit checks for new damage: every location whose internal structure took damage
 * and still stands, and a destroyed location that holds ammo that can explode (p. 31).
 */
const critChecksFromDamage = (before: Attacker, after: Attacker, phase: string, source?: string): CritCheck[] => {
  if (isMechDestroyed(after)) return []
  return LOCATIONS.flatMap((location) => {
    const structure = after.structureDamage[location] ?? 0
    if (structure <= (before.structureDamage[location] ?? 0)) return []
    const destroyed = after.destroyedLocations.includes(location) && !before.destroyedLocations.includes(location)
    if (destroyed) return hasLiveAmmo(after, location) ? [newCritCheck(location, 'destroyed', phase, structure, source)] : []
    return isLocationDestroyed(after, location) ? [] : [newCritCheck(location, 'structure', phase, structure, source)]
  })
}

/** Take back a critical hit's effects other than damage, and the MechWarrior damage of its explosion. */
const revertCritHit = (unit: UnitState, check: CritCheck, index: number, withDamage: boolean): UnitState => {
  const applied = check.hits[index]?.applied
  if (!applied) return unit
  const { armorDamage, structureDamage, destroyedLocations, ammoBins, ...components } = applied.before
  const attacker = { ...unit.attacker, ...components, ...(withDamage ? { armorDamage, structureDamage, destroyedLocations, ammoBins } : {}) }
  const weapons = applied.weaponId ? unit.weapons.map((w) => (w.id === applied.weaponId ? { ...w, destroyed: false } : w)) : unit.weapons
  const crits = unit.crits.map((c) => (c.id === check.id ? { ...c, hits: c.hits.map((h, i) => (i === index ? { ...h, applied: null } : h)) } : c))
  return removePilotDamage({ ...unit, attacker, weapons, crits }, `crit:${check.id}:${index}`)
}

/** Drop a check, taking back its critical hits' effects (their damage went with the hit that is undone). */
const dropCheck = (unit: UnitState, check: CritCheck): UnitState => {
  let next = unit
  for (let i = check.hits.length - 1; i >= 0; i--) next = revertCritHit(next, check, i, false)
  return { ...next, crits: next.crits.filter((c) => c.id !== check.id) }
}

/** Drop checks whose internal structure damage was undone. */
const pruneCrits = (unit: UnitState): UnitState => {
  let next = unit
  for (const check of unit.crits) {
    if ((next.attacker.structureDamage[check.location] ?? 0) < check.structure) next = dropCheck(next, next.crits.find((c) => c.id === check.id)!)
  }
  return next
}

/** Drop the checks a hit added, e.g. when the hit is undone. */
export const removeCritsBySource = (unit: UnitState, source: string): UnitState => {
  let next = unit
  for (const check of unit.crits.filter((c) => c.source === source)) next = dropCheck(next, next.crits.find((c) => c.id === check.id)!)
  return next
}

/** A hit location roll of 2: a critical hit check even without internal structure damage (p. 31). */
export const addThroughArmorCrit = (unit: UnitState, location: Location, source: string): UnitState => {
  if (isMechDestroyed(unit.attacker) || isLocationDestroyed(unit.attacker, location)) return unit
  const check = newCritCheck(location, 'through-armor', unit.attackPhase, unit.attacker.structureDamage[location] ?? 0, source)
  return { ...unit, crits: [...unit.crits, check] }
}

/** Whether a critical hit already struck the location in this phase: then extra hits are lost, not transferred. */
const hitThisPhase = (unit: UnitState, phase: string) => (location: Location) =>
  unit.crits.some((c) => c.phase === phase && c.hits.some((h) => h.applied?.location === location))

export const critHitState = (unit: UnitState, check: CritCheck, index: number): CritHitState =>
  resolveCritHit(unit.attacker, unit.weapons, check, check.hits[index], hitThisPhase(unit, check.phase))

export const pendingCritSteps = (unit: UnitState): number =>
  unit.crits.reduce((sum, check) => {
    if (check.roll === null) return sum + 1
    const { hits, blownOff } = checkHits(check)
    const open = check.hits.slice(0, hits).filter((_, i) => ['roll', 'pick', 'ready'].includes(critHitState(unit, check, i).kind)).length
    return sum + open + (blownOff && !check.blownOff ? 1 : 0)
  }, 0)

const updateCheck = (unit: UnitState, id: string, update: (check: CritCheck) => CritCheck): UnitState => ({
  ...unit,
  crits: unit.crits.map((c) => (c.id === id ? update(c) : c)),
})

/**
 * Enter the Determining Critical Hits roll (null clears it). Critical hits beyond the new
 * count, or a limb no longer blown off, are taken back.
 */
export const enterCritRoll = (unit: UnitState, id: string, value: number | null): UnitState => {
  const check = unit.crits.find((c) => c.id === id)
  if (!check) return unit
  const { hits, blownOff } = value === null ? { hits: 0, blownOff: false } : critCount(value, check.location)
  let next = unit
  for (let i = check.hits.length - 1; i >= hits; i--) next = revertCritHit(next, check, i, true)
  if (!blownOff && check.blownOff) next = { ...next, attacker: { ...next.attacker, ...check.blownOff.before } }
  const kept = (next.crits.find((c) => c.id === id) ?? check).hits.slice(0, hits)
  next = updateCheck(next, id, (c) => ({
    ...c,
    roll: value,
    hits: [...kept, ...Array.from({ length: hits - kept.length }, newCritHit)],
    blownOff: blownOff ? c.blownOff : null,
  }))
  return trackDamage(unit, next, check.phase as PsrPhase)
}

/** Enter one die of a critical slot roll: the block die or the slot die (null clears it). */
export const enterCritDie = (unit: UnitState, id: string, index: number, attempt: number, die: 'block' | 'slot', value: number | null): UnitState =>
  updateCheck(unit, id, (c) => ({
    ...c,
    hits: c.hits.map((h, i) => {
      if (i !== index) return h
      const attempts = h.attempts.slice(0, attempt + 1)
      while (attempts.length <= attempt) attempts.push({ block: null, slot: null })
      attempts[attempt] = { ...attempts[attempt], [die]: value }
      return { ...h, attempts }
    }),
  }))

/** Without a known Critical Hit Table: what the record sheet's slot holds. */
export const pickCritItem = (unit: UnitState, id: string, index: number, item: CritItem | null): UnitState =>
  updateCheck(unit, id, (c) => ({ ...c, hits: c.hits.map((h, i) => (i === index ? { ...h, picked: item } : h)) }))

/** Apply a critical hit to the slot its dice found: its effect, any ammo explosion, and the rolls they call for. */
export const applyCritHit = (unit: UnitState, id: string, index: number): UnitState => {
  const check = unit.crits.find((c) => c.id === id)
  if (!check) return unit
  const state = critHitState(unit, check, index)
  if (state.kind !== 'ready') return unit
  const { attacker, weapons } = unit
  const effect = applyCritItem(attacker, weapons, state.location, state.item, state.slot)
  let damaged = effect.attacker
  let explosion: AppliedCrit['explosion'] = null
  if (effect.explodes) {
    const result = explodeAmmo(damaged, effect.explodes)
    damaged = result.attacker
    explosion = { steps: result.steps, lost: result.lost }
  }
  const { armorDamage, structureDamage, destroyedLocations, ammoBins } = attacker
  const applied: AppliedCrit = {
    location: state.location,
    slot: state.slot,
    name: itemName(state.item),
    effect: effect.effect,
    before: { ...critFields(attacker), armorDamage, structureDamage, destroyedLocations, ammoBins },
    weaponId: state.item.kind === 'weapon' && effect.weapons !== weapons ? state.item.weaponId : null,
    explosion,
  }
  const next = updateCheck({ ...unit, attacker: damaged, weapons: effect.weapons }, id, (c) => ({
    ...c,
    hits: c.hits.map((h, i) => (i === index ? { ...h, applied } : h)),
  }))
  const tracked = trackDamage(unit, next, check.phase as PsrPhase)
  return explosion ? addPilotDamage(tracked, 'Ammo explosion (critical hit)', 2, `crit:${id}:${index}`) : tracked
}

/** Undo a critical hit: its effect and the damage of its explosion. */
export const undoCritHit = (unit: UnitState, id: string, index: number): UnitState => {
  const check = unit.crits.find((c) => c.id === id)
  if (!check?.hits[index]?.applied) return unit
  return trackDamage(unit, revertCritHit(unit, check, index, true), check.phase as PsrPhase)
}

/** A 12 on a limb or the head: blow it off. Its armor and internal structure are not lost (p. 32). */
export const applyBlownOff = (unit: UnitState, id: string): UnitState => {
  const check = unit.crits.find((c) => c.id === id)
  if (!check || check.blownOff) return unit
  const { armorDamage, structureDamage, destroyedLocations, ammoBins } = unit.attacker
  const next = updateCheck(
    { ...unit, attacker: { ...unit.attacker, destroyedLocations: [...destroyedLocations, check.location] } },
    id,
    (c) => ({ ...c, blownOff: { before: { armorDamage, structureDamage, destroyedLocations, ammoBins } } }),
  )
  return trackDamage(unit, next, check.phase as PsrPhase)
}

export const undoBlownOff = (unit: UnitState, id: string): UnitState => {
  const check = unit.crits.find((c) => c.id === id)
  if (!check?.blownOff) return unit
  const next = updateCheck({ ...unit, attacker: { ...unit.attacker, ...check.blownOff.before } }, id, (c) => ({ ...c, blownOff: null }))
  return trackDamage(unit, next, check.phase as PsrPhase)
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
