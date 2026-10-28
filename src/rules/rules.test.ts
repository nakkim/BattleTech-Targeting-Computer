import { describe, expect, it } from 'vitest'
import { createAttacker, createTarget, defaultSpotter, newAmmoBin, newWeapon } from '../state/defaults'
import { availableBins, drawAmmo, explosionDamage, firingWeapons, heatExplosionCandidates, shotsPerBin, spendAmmo } from './ammo'
import { applyDamage, armorLeft, damageTotals, explodeAmmo, maxArmorFacings, structureLeft, structureOf } from './damage'
import { chanceToHit } from './dice'
import { projectHeat } from './heat'
import { resolvePhysicalAttack } from './physicalAttack'
import { averageClusterHits, CLUSTER_HITS_TABLE, fivePointGroups, hitLocationChances, targetMovementModifier, WEAPONS_BY_KEY } from './tables'
import type { Attacker, Location, Target } from './types'
import { buildMech, MECHS } from '../state/mechCatalog'
import {
  addPilotDamage,
  addThroughArmorCrit,
  applyBlownOff,
  applyCritHit,
  critHitState,
  enterCritDie,
  enterCritRoll,
  pendingCritSteps,
  pickCritItem,
  undoCritHit,
  addPsr,
  advanceTurn,
  applyFallDamage,
  enterConsciousnessRoll,
  enterFallRoll,
  enterWakeRoll,
  enterHeatRoll,
  enterPsrRoll,
  explodeHeatAmmo,
  newUnit,
  pendingSteps,
  removePilotDamage,
  removePsr,
  trackDamage,
  undoFallDamage,
  undoHeatExplosion,
  unitName,
  unitPsrs,
  type UnitState,
} from '../state/unit'
import { powerCheck } from './heatPhase'
import { critCount, critLocation } from './crits'
import { isMechDestroyed } from './destruction'
import { checkPilot, consciousnessTarget } from './pilot'
import { checkPsrs, fallDamage, fallHitLocation, fallSide, fiveGroups, psrDamageModifiers } from './psr'
import { minimumRangeModifier, resolveWeaponAttack } from './weaponAttack'

const attacker = createAttacker
const target = createTarget

const weaponTn = (a: Attacker, t: Target, key: string, location: 'RA' | 'LA' | 'RT' | 'CT' = 'RT') => {
  const w = newWeapon(key, location, t.id)
  return resolveWeaponAttack(w, { attacker: a, target: t, spotter: defaultSpotter(), attackerIsSpotting: false })
}

describe('dice', () => {
  it('computes 2D6 chances', () => {
    expect(chanceToHit(2)).toBe(1)
    expect(chanceToHit(7)).toBeCloseTo(21 / 36)
    expect(chanceToHit(12)).toBeCloseTo(1 / 36)
    expect(chanceToHit(13)).toBe(0)
  })
})

describe('tables', () => {
  it('target movement modifier brackets', () => {
    expect([0, 2, 3, 4, 5, 6, 7, 9, 10, 17, 18, 24, 25].map(targetMovementModifier)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6])
  })
  it('cluster table example: LRM 20 roll 8 hits 12', () => {
    expect(CLUSTER_HITS_TABLE[20][8 - 2]).toBe(12)
  })
  it('average cluster hits sum sensibly', () => {
    expect(averageClusterHits(2)).toBeCloseTo((21 * 1 + 15 * 2) / 36)
  })
  it('LRM groups of 5', () => {
    expect(fivePointGroups(12)).toEqual([5, 5, 2])
    expect(fivePointGroups(17)).toEqual([5, 5, 5, 2])
  })
  it('hit location probabilities sum to 1', () => {
    for (const dir of ['front', 'left', 'right', 'rear'] as const) {
      for (const table of ['standard', 'punch', 'kick'] as const) {
        const total = hitLocationChances(table, dir).reduce((s, l) => s + l.probability, 0)
        expect(total).toBeCloseTo(1)
      }
    }
  })
})

describe('weapon attacks (rulebook p. 18 examples)', () => {
  it('Wolverine medium laser at Griffin: TN 11', () => {
    const a = attacker({ gunnery: 4, movement: 'ran', hexesMoved: 5 })
    const t = target({ range: 4, hexesMoved: 2, jumped: true, partialCover: true, interveningLight: 1 })
    const r = weaponTn(a, t, 'ML')
    expect(r.allowed).toBe(true)
    expect(r.targetNumber).toBe(11)
    expect(weaponTn(a, t, 'SRM6').targetNumber).toBe(11)
  })
  it('Griffin PPC at Wolverine: TN 10', () => {
    const a = attacker({ gunnery: 3, movement: 'jumped' })
    const t = target({ range: 4, hexesMoved: 5, terrain: 'light', interveningLight: 1 })
    expect(weaponTn(a, t, 'PPC', 'RA').targetNumber).toBe(10)
  })
  it('PPC minimum range modifiers', () => {
    const ppc = WEAPONS_BY_KEY.PPC
    expect([4, 3, 2, 1].map((r) => minimumRangeModifier(ppc, r))).toEqual([0, 1, 2, 3])
  })
  it('prone target that ran 7 hexes', () => {
    const t = target({ hexesMoved: 7, prone: true })
    expect(weaponTn(attacker(), { ...t, range: 2 }, 'ML').targetNumber).toBe(4 + 4)
    expect(weaponTn(attacker(), { ...t, range: 1 }, 'ML').targetNumber).toBe(4 + 1)
  })
  it('running then dropping prone gives +4', () => {
    const r = weaponTn(attacker({ movement: 'ran', prone: true, proneBracingArm: 'LA' }), target({ range: 1 }), 'ML', 'RA')
    expect(r.targetNumber).toBe(4 + 4)
  })
  it('blocks LOS when woods exceed +2', () => {
    expect(weaponTn(attacker(), target({ interveningLight: 1, interveningHeavy: 1 }), 'ML').allowed).toBe(false)
  })
  it('enforces firing arcs', () => {
    expect(weaponTn(attacker(), target({ arc: 'right' }), 'ML', 'RA').allowed).toBe(true)
    expect(weaponTn(attacker(), target({ arc: 'right' }), 'ML', 'RT').allowed).toBe(false)
    expect(weaponTn(attacker(), target({ arc: 'left' }), 'ML', 'RA').allowed).toBe(false)
  })
  it('secondary target modifiers', () => {
    expect(weaponTn(attacker(), target({ primary: false, range: 3 }), 'ML').targetNumber).toBe(4 + 1)
    expect(weaponTn(attacker(), target({ primary: false, arc: 'right', range: 3 }), 'ML', 'RA').targetNumber).toBe(4 + 2)
  })
  it('arm damage and heat', () => {
    const a = attacker({ heat: 13, rightArm: { upperArmHit: true, lowerArmHit: true } })
    expect(weaponTn(a, target({ range: 3 }), 'ML', 'RA').targetNumber).toBe(4 + 2 + 2)
    const s = attacker({ rightArm: { shoulderHit: true, upperArmHit: true } })
    expect(weaponTn(s, target({ range: 3 }), 'ML', 'RA').targetNumber).toBe(4 + 4)
  })
  it('aimed shots at immobile targets', () => {
    const t = target({ immobile: true, range: 3 })
    const w = { ...newWeapon('ML', 'RT', t.id), aimedAt: 'CT' as const }
    const ctx = { attacker: attacker(), target: t, spotter: defaultSpotter(), attackerIsSpotting: false }
    expect(resolveWeaponAttack(w, ctx).targetNumber).toBe(0)
    expect(resolveWeaponAttack({ ...w, aimedAt: 'HD' }, ctx).targetNumber).toBe(7)
  })
  it('indirect LRM fire', () => {
    const t = target({ range: 10 })
    const w = { ...newWeapon('LRM10', 'RT', t.id), indirect: true }
    const r = resolveWeaponAttack(w, {
      attacker: attacker({ movement: 'walked' }),
      target: t,
      spotter: { movement: 'ran', attacked: true, prone: false },
      attackerIsSpotting: false,
    })
    // 4 gunnery +1 walked +2 spotter ran +1 indirect +1 spotter attacked +2 medium
    expect(r.targetNumber).toBe(11)
  })
})

describe('physical attacks (rulebook examples)', () => {
  it('Catapult punch: TN 9, 3 damage', () => {
    const a = attacker({ piloting: 5, tonnage: 65, rightArm: { hasLowerArm: false, hasHand: false } })
    const r = resolvePhysicalAttack('punchRA', { attacker: a, target: target({ range: 1, terrain: 'light' }), firedLocations: new Set(), hatchetTable: 'standard' })
    expect(r.allowed).toBe(true)
    expect(r.targetNumber).toBe(9)
    expect(r.damageGroups).toEqual([3])
  })
  it('Catapult charge: 33 to target, 5 to attacker', () => {
    const a = attacker({ tonnage: 65, movement: 'ran', hexesMoved: 5, piloting: 5 })
    const r = resolvePhysicalAttack('charge', { attacker: a, target: target({ range: 1, tonnage: 45, piloting: 4 }), firedLocations: new Set(), hatchetTable: 'standard' })
    expect(r.damageGroups.reduce((s, d) => s + d, 0)).toBe(33)
    expect(r.attackerDamageGroups).toEqual([5])
    expect(r.targetNumber).toBe(5 + 2 + 1)
  })
  it('Griffin DFA: 17 damage', () => {
    const a = attacker({ tonnage: 55, movement: 'jumped' })
    const r = resolvePhysicalAttack('dfa', { attacker: a, target: target({ range: 1, terrain: 'heavy' }), firedLocations: new Set(), hatchetTable: 'standard' })
    expect(r.damageGroups).toEqual([5, 5, 5, 2])
    expect(r.attackerDamageGroups).toEqual([5, 5, 1])
    expect(r.targetNumber).toBe(5 + 3)
    expect(r.hitTable).toBe('punch')
  })
  it('kick uses punch table against a lower target and halves for actuators', () => {
    const a = attacker({ tonnage: 60, leftLeg: { hipHit: false, upperLegHit: true, lowerLegHit: true, footHit: false } })
    const r = resolvePhysicalAttack('kickLL', { attacker: a, target: target({ range: 1, levelDifference: -1 }), firedLocations: new Set(), hatchetTable: 'standard' })
    expect(r.hitTable).toBe('punch')
    expect(r.damageGroups).toEqual([3])
    expect(r.targetNumber).toBe(5 - 2 + 4)
  })
  it('cannot punch with an arm that fired', () => {
    const r = resolvePhysicalAttack('punchLA', { attacker: attacker(), target: target({ range: 1 }), firedLocations: new Set(['LA']), hatchetTable: 'standard' })
    expect(r.allowed).toBe(false)
  })
})

describe('heat', () => {
  it('projects heat from movement and weapons', () => {
    const a = attacker({ movement: 'jumped', hexesMoved: 2, heatSinks: 10, heat: 4 })
    const weapons = [newWeapon('PPC', 'RA', 'x'), newWeapon('ML', 'LA', 'x')]
    const p = projectHeat(a, weapons)
    expect(p.generated).toBe(3 + 10 + 3)
    expect(p.next).toBe(10)
    expect(p.effects).toContain('+1 to-hit for weapon attacks')
  })
})

describe('Gauss Rifle', () => {
  it('has minimum range 2 and 7/15/22 brackets', () => {
    const t = target({ range: 1 })
    expect(weaponTn(attacker(), t, 'GAUSS').targetNumber).toBe(4 + 2)
    expect(weaponTn(attacker(), { ...t, range: 15 }, 'GAUSS').targetNumber).toBe(4 + 2)
    expect(weaponTn(attacker(), { ...t, range: 23 }, 'GAUSS').allowed).toBe(false)
  })
})

describe('ammunition', () => {
  const bin = (weaponKey: string, location: Location, shots = shotsPerBin(weaponKey)) => ({ ...newAmmoBin(weaponKey, location), shots })

  it('one bin holds one ton', () => {
    expect(shotsPerBin('LRM20')).toBe(6)
    expect(shotsPerBin('GAUSS')).toBe(8)
  })
  it('weapons of one type share bins, earlier weapons first', () => {
    const a = attacker({ ammoBins: [bin('SRM6', 'LT', 1)] })
    const weapons = [newWeapon('SRM6', 'LA', 'x'), newWeapon('SRM6', 'RA', 'x'), newWeapon('ML', 'RT', 'x')]
    expect([...drawAmmo(a, weapons).empty]).toEqual([weapons[1].id])
    expect(firingWeapons(a, weapons).map((w) => w.weaponKey)).toEqual(['SRM6', 'ML'])
  })
  it('untracked types never run out', () => {
    expect(drawAmmo(attacker(), [newWeapon('AC20', 'RT', 'x')]).empty.size).toBe(0)
  })
  it('draws from the emptiest bin and spends one shot per weapon fired', () => {
    const full = bin('LRM20', 'LT')
    const low = bin('LRM20', 'RT', 2)
    const a = attacker({ ammoBins: [full, low] })
    expect(spendAmmo(a, [newWeapon('LRM20', 'LT', 'x')]).map((b) => b.shots)).toEqual([6, 1])
  })
  it('ammo in a destroyed location is lost', () => {
    const a = attacker({ ammoBins: [bin('GAUSS', 'RT')], destroyedLocations: ['RT'] })
    expect(availableBins(a)).toEqual([])
    expect(drawAmmo(a, [newWeapon('GAUSS', 'LT', 'x')]).empty.size).toBe(1)
  })
  it('explosion damage is Damage Value times shots, missiles counted (p. 32)', () => {
    expect(explosionDamage(bin('MG', 'CT'))).toBe(400)
    expect(explosionDamage(bin('SRM2', 'CT'))).toBe(200)
    expect(explosionDamage(bin('GAUSS', 'CT'))).toBe(0)
  })
  it('heat explodes the most destructive ammo per shot first', () => {
    const a = attacker({ ammoBins: [bin('MG', 'CT'), bin('LRM15', 'LT'), bin('SRM6', 'RT'), bin('LRM20', 'LT', 0)] })
    expect(heatExplosionCandidates(a).map((b) => b.weaponKey)).toEqual(['LRM15'])
  })
  it('an empty bin blocks the attack', () => {
    const t = target()
    const w = newWeapon('GAUSS', 'RA', t.id)
    const r = resolveWeaponAttack(w, { attacker: attacker(), target: t, spotter: defaultSpotter(), attackerIsSpotting: false, outOfAmmo: true })
    expect(r.allowed).toBe(false)
    expect(r.reasons).toContain('Out of ammo')
  })
})

describe('missing arms', () => {
  const t = target({ range: 1 })
  const armless = attacker({ leftArm: { present: false }, rightArm: { present: false } })
  it('arm weapons cannot fire, torso weapons can', () => {
    const arm = weaponTn(armless, t, 'ML', 'LA')
    expect(arm.allowed).toBe(false)
    expect(arm.reasons[0]).toBe('No left arm: weapon cannot fire')
    expect(weaponTn(armless, t, 'ML', 'RT').allowed).toBe(true)
  })
  it('no punches or pushes without arms, but kicks work', () => {
    const physical = (type: Parameters<typeof resolvePhysicalAttack>[0]) =>
      resolvePhysicalAttack(type, { attacker: armless, target: t, firedLocations: new Set(), hatchetTable: 'standard' }).allowed
    expect(physical('punchLA')).toBe(false)
    expect(physical('push')).toBe(false)
    expect(physical('kickLL')).toBe(true)
  })
  it('one missing arm leaves the other usable', () => {
    const oneArm = attacker({ leftArm: { present: false } })
    expect(weaponTn(oneArm, t, 'ML', 'RA').allowed).toBe(true)
    expect(weaponTn({ ...oneArm, prone: true, proneBracingArm: 'RA' }, t, 'ML', 'RT').allowed).toBe(false)
  })
})

describe('destroyed locations', () => {
  const t = target({ range: 3, arc: 'front' })
  it('blocks weapons in a destroyed arm', () => {
    expect(weaponTn(attacker({ destroyedLocations: ['LA'] }), t, 'ML', 'LA').allowed).toBe(false)
    expect(weaponTn(attacker({ destroyedLocations: ['LA'] }), t, 'ML', 'RA').allowed).toBe(true)
  })
  it('loses the arm with its side torso', () => {
    expect(weaponTn(attacker({ destroyedLocations: ['RT'] }), t, 'ML', 'RA').allowed).toBe(false)
    expect(weaponTn(attacker({ destroyedLocations: ['RT'] }), t, 'ML', 'LA').allowed).toBe(true)
  })
  it('center torso destroys the whole Mech', () => {
    expect(weaponTn(attacker({ destroyedLocations: ['CT'] }), t, 'ML', 'LA').allowed).toBe(false)
  })
  it('prone with a destroyed arm cannot fire anything', () => {
    expect(weaponTn(attacker({ prone: true, proneBracingArm: 'LA', destroyedLocations: ['LA'] }), t, 'ML', 'RT').allowed).toBe(false)
  })
  it('destroyed weapons make no heat and do not block punches', () => {
    const a = attacker({ destroyedLocations: ['LA'], heatSinks: 0 })
    expect(projectHeat(a, [newWeapon('ML', 'LA', 'x')]).generated).toBe(0)
    const punchLeft = resolvePhysicalAttack('punchLA', { attacker: a, target: target({ range: 1 }), firedLocations: new Set(), hatchetTable: 'standard' })
    expect(punchLeft.allowed).toBe(false)
    const punchRight = resolvePhysicalAttack('punchRA', { attacker: a, target: target({ range: 1 }), firedLocations: new Set(), hatchetTable: 'standard' })
    expect(punchRight.allowed).toBe(true)
  })
})

describe('armor and internal structure', () => {
  // 50 tons: HD 3, CT 16, side torsos 12, arms 8, legs 12.
  const mech = (options = {}) => attacker({ tonnage: 50, armor: { HD: 9, CT: 20, CTR: 6, LT: 16, LTR: 4, RT: 16, RTR: 4, LA: 10, RA: 10, LL: 12, RL: 12 }, ...options })

  it('reads internal structure from the tonnage table', () => {
    expect(structureOf(50, 'CT')).toBe(16)
    expect(structureOf(90, 'LT')).toBe(19)
    expect(structureOf(20, 'HD')).toBe(3)
    expect(maxArmorFacings(50).CT + maxArmorFacings(50).CTR).toBe(32)
    expect(maxArmorFacings(100).HD).toBe(9)
  })
  it('takes damage on armor first, then internal structure', () => {
    const { attacker: a, steps } = applyDamage(mech(), 'LA', 13)
    expect(armorLeft(a, 'LA')).toBe(0)
    expect(structureLeft(a, 'LA')).toBe(5)
    expect(steps).toEqual([{ location: 'LA', facing: 'LA', armor: 10, structure: 3, destroyed: false }])
  })
  it('destroys a location and transfers the rest inward', () => {
    const { attacker: a, steps } = applyDamage(mech(), 'LA', 25)
    expect(a.destroyedLocations).toEqual(['LA'])
    expect(steps[1]).toMatchObject({ location: 'LT', armor: 7, structure: 0 })
    expect(armorLeft(a, 'LT')).toBe(9)
  })
  it('sends hits on a destroyed location to the next one inward', () => {
    const { steps } = applyDamage(mech({ destroyedLocations: ['LT'] }), 'LA', 5)
    expect(steps).toEqual([{ location: 'CT', facing: 'CT', armor: 5, structure: 0, destroyed: false }])
  })
  it('keeps rear hits on rear armor when transferring', () => {
    const { attacker: a } = applyDamage(mech({ destroyedLocations: ['LL'] }), 'LL', 6, { rear: true })
    expect(armorLeft(a, 'LTR')).toBe(0)
    expect(armorLeft(a, 'LT')).toBe(16)
    expect(structureLeft(a, 'LT')).toBe(10)
  })
  it('destroys the Mech with the center torso and drops the rest', () => {
    const { attacker: a, lost } = applyDamage(mech(), 'CT', 40)
    expect(a.destroyedLocations).toContain('CT')
    expect(lost).toBe(4)
  })
  it('explodes ammo straight into internal structure and empties the bin', () => {
    const bin = { ...newAmmoBin('LRM20', 'LT'), shots: 2 }
    const { attacker: a, steps } = explodeAmmo(mech({ ammoBins: [bin] }), bin.id)
    // 2 shots x 20 missiles = 40: 12 to the left torso, 16 to the center torso, 12 left over.
    expect(steps.map((s) => [s.location, s.armor, s.structure])).toEqual([
      ['LT', 0, 12],
      ['CT', 0, 16],
    ])
    expect(armorLeft(a, 'CT')).toBe(20)
    expect(a.ammoBins[0].shots).toBe(0)
  })
  it('totals what is left over the locations the Mech has', () => {
    const totals = damageTotals(mech({ leftArm: { present: false }, destroyedLocations: ['RA'] }))
    expect(totals.armorMax).toBe(109)
    expect(totals.armor).toBe(99)
    expect(totals.structureMax).toBe(83 - 8)
    expect(totals.structure).toBe(83 - 16)
  })
})

describe('plain 2D6 mode', () => {
  it('spends ammo on the next turn only while tracking', () => {
    // The Highlander fires SRM 6, LRM 20 and Gauss: 3 shots a turn.
    const unit = newUnit(buildMech(MECHS.find((m) => m.name === 'Highlander HGN-732')!))
    const shots = (u: typeof unit) => u.attacker.ammoBins.reduce((sum, b) => sum + b.shots, 0)
    expect(shots(advanceTurn(unit))).toBe(shots(unit) - 3)
    expect(shots(advanceTurn(unit, false))).toBe(shots(unit))
  })
})

describe('heat sink damage', () => {
  it('destroyed heat sinks dissipate nothing (p. 33)', () => {
    // 16 heat sinks with 3 destroyed dissipate 13.
    expect(projectHeat(attacker({ heatSinks: 16, heatSinkHits: 3 }), []).dissipated).toBe(13)
  })
  it('only working heat sinks count as submerged', () => {
    const a = attacker({ heatSinks: 10, heatSinkHits: 7, waterDepth: 2, submergedHeatSinks: 6 })
    expect(projectHeat(a, []).dissipated).toBe(3 + 3)
  })
})

describe('unitName', () => {
  it('numbers a model only when the lance already has it', () => {
    expect(unitName('Atlas AS7-D', ['Locust LCT-1E'])).toBe('Atlas AS7-D')
    expect(unitName('Atlas AS7-D', ['Atlas AS7-D'])).toBe('Atlas AS7-D #2')
    expect(unitName('Atlas AS7-D', ['Atlas AS7-D', 'Atlas AS7-D #3'])).toBe('Atlas AS7-D #4')
  })

  it('does not treat a longer model name as the same model', () => {
    expect(unitName('Atlas AS7-D', ['Atlas AS7-D-DC', 'Atlas AS7-D (copy)'])).toBe('Atlas AS7-D')
  })
})

describe('Heat Phase rolls', () => {
  // No heat sinks and no weapons: the heat set here is the heat after the Heat Phase.
  const heatedUnit = (heat: number, options: Parameters<typeof createAttacker>[0] = {}) =>
    newUnit({ attacker: createAttacker({ heat, heatSinks: 0, tonnage: 85, piloting: 5, ...options }), weapons: [] })
  const shutdownCheck = (unit: UnitState) => checkPsrs(unit.psrs, unit.attacker).find((c) => c.psr.cause === 'shutdown')

  it('asks for the highest shutdown Avoid number reached, and shuts down automatically at 30', () => {
    expect(powerCheck({ heat: 13, wasShutdown: false })).toEqual({ kind: 'none' })
    expect(powerCheck({ heat: 14, wasShutdown: false })).toEqual({ kind: 'shutdown', target: 4 })
    expect(powerCheck({ heat: 27, wasShutdown: false })).toEqual({ kind: 'shutdown', target: 10 })
    expect(powerCheck({ heat: 30, wasShutdown: false })).toEqual({ kind: 'auto-shutdown' })
  })

  it('restarts a shut down Mech on the same roll, automatically below 14 and never at 30+', () => {
    expect(powerCheck({ heat: 10, wasShutdown: true })).toEqual({ kind: 'auto-restart' })
    expect(powerCheck({ heat: 18, wasShutdown: true })).toEqual({ kind: 'restart', target: 6 })
    expect(powerCheck({ heat: 31, wasShutdown: true })).toEqual({ kind: 'no-restart' })
  })

  it('shuts down on a failed roll, which adds a PSR at +3 not to fall', () => {
    let unit = advanceTurn(heatedUnit(18))
    expect(unit.heatPhase?.heat).toBe(18)
    expect(unit.attacker.shutdown).toBe(false)
    expect(pendingSteps(unit, true)).toBe(1)

    unit = enterHeatRoll(unit, 'powerRoll', 5)
    expect(unit.attacker.shutdown).toBe(true)
    expect(shutdownCheck(unit)?.target).toBe(8)
    expect(pendingSteps(unit, true)).toBe(1)

    const id = shutdownCheck(unit)!.psr.id
    unit = enterPsrRoll(unit, id, 'roll', 7)
    expect(unit.attacker.prone).toBe(true)
    // The MechWarrior is hurt without a roll, since the 'Mech is immobile; the falling damage is still to apply.
    expect(shutdownCheck(unit)?.pilotHurt).toBe(true)
    // The falling damage and the MechWarrior's Consciousness Roll.
    expect(pendingSteps(unit, true)).toBe(2)
    unit = enterPsrRoll(unit, id, 'roll', 8)
    expect(unit.attacker.prone).toBe(false)

    // Passing the shutdown roll after all removes the PSR.
    unit = enterHeatRoll(unit, 'powerRoll', 6)
    expect(unit.attacker.shutdown).toBe(false)
    expect(unit.psrs.rolls).toEqual([])
    expect(pendingSteps(unit, true)).toBe(0)
  })

  it('stops a shut down Mech from firing and its engine from making heat', () => {
    const { attacker, weapons } = buildMech(MECHS.find((m) => m.name === 'Highlander HGN-732')!)
    const shutdown = { ...attacker, shutdown: true, engineHits: 1 }
    expect(firingWeapons(shutdown, weapons)).toEqual([])
    expect(projectHeat(shutdown, weapons).generated).toBe(0)
    expect(resolveWeaponAttack(weapons[0], { attacker: shutdown, target: createTarget(), spotter: defaultSpotter(), attackerIsSpotting: false }).reasons).toContain('’Mech is shut down')
  })

  it('falls automatically when shut down at 30 heat with a PSR above 12', () => {
    const hip = { hipHit: true, upperLegHit: false, lowerLegHit: false, footHit: false }
    const unit = advanceTurn(heatedUnit(30, { leftLeg: hip, rightLeg: hip }))
    expect(unit.attacker.shutdown).toBe(true)
    expect(shutdownCheck(unit)?.target).toBe(12)
    expect(unit.attacker.prone).toBe(false)
    const worse = advanceTurn(heatedUnit(30, { piloting: 6, leftLeg: hip, rightLeg: hip }))
    expect(worse.attacker.prone).toBe(true)
    // No Piloting Skill Roll is due: only the falling damage and the MechWarrior's Consciousness Roll.
    expect(pendingSteps(worse, true)).toBe(2)
  })

  it('explodes the most damaging bin on a failed ammo roll, and undoes it', () => {
    const lrm = { ...newAmmoBin('LRM20', 'LT'), shots: 2 }
    const unit0 = advanceTurn(heatedUnit(19, { ammoBins: [lrm, newAmmoBin('MG', 'RT')] }))
    expect(unit0.heatPhase?.ammoTarget).toBe(4)
    let unit = enterHeatRoll(unit0, 'ammoRoll', 3)
    expect(pendingSteps(unit, true)).toBe(2)
    unit = enterHeatRoll(unit, 'powerRoll', 6)
    unit = explodeHeatAmmo(unit, lrm.id)
    // Two Consciousness Rolls for the MechWarrior's 2 damage.
    expect(pendingSteps(unit, true)).toBe(2)
    // 2 shots × 20 = 40 to the left torso's internal structure (18 at 85 tons), the rest to the center torso.
    expect(unit.attacker.structureDamage).toEqual({ LT: 18, CT: 22 })
    expect(unit.attacker.armorDamage).toEqual({})
    expect(unit.attacker.ammoBins[0].shots).toBe(0)
    unit = undoHeatExplosion(unit)
    expect(unit.attacker.structureDamage).toEqual({})
    expect(unit.attacker.ammoBins[0].shots).toBe(2)
  })

  it('leaves shutdown, falls and rolls to the player in plain mode', () => {
    const unit = advanceTurn(heatedUnit(30, { piloting: 8 }), false)
    expect(unit.heatPhase?.heat).toBe(30)
    expect(unit.attacker.shutdown).toBe(false)
    expect(unit.attacker.prone).toBe(false)
    expect(unit.psrs.rolls).toEqual([])
    expect(pendingSteps(unit, false)).toBe(0)
  })

  it('needs no ammo roll without unemptied explosive ammo', () => {
    expect(advanceTurn(heatedUnit(25, { ammoBins: [{ ...newAmmoBin('SRM6', 'LT'), shots: 0 }, newAmmoBin('GAUSS', 'RT')] })).heatPhase?.ammoTarget).toBeNull()
  })
})

describe('Piloting Skill Rolls', () => {
  const unitOf = (options: Parameters<typeof createAttacker>[0] = {}) => newUnit({ attacker: createAttacker({ tonnage: 85, piloting: 5, ...options }), weapons: [] })
  const checks = (unit: UnitState) => checkPsrs(unit.psrs, unit.attacker)
  const last = (unit: UnitState) => unit.psrs.rolls[unit.psrs.rolls.length - 1].id
  const lowerLeg = { hipHit: false, upperLegHit: false, lowerLegHit: true, footHit: false }

  it('adds up the events of an attack phase and damage, as in the rulebook example (p. 40)', () => {
    // Weapon Attack Phase: 40 damage and two lower leg actuators lost. Three rolls at 8.
    let unit = unitOf({ leftLeg: lowerLeg, rightLeg: lowerLeg })
    unit = addPsr(addPsr(addPsr(unit, 'damage20'), 'legActuator'), 'legActuator')
    expect(checks(unit).map((c) => c.target)).toEqual([8, 8, 8])
    for (const psr of unit.psrs.rolls) unit = enterPsrRoll(unit, psr.id, 'roll', 8)

    // Physical Attack Phase: kicked twice, another actuator and 20 more damage. Four rolls at 9;
    // the weapon phase rolls keep their modifiers.
    unit = { ...unit, attacker: { ...unit.attacker, leftLeg: { ...lowerLeg, footHit: true } } }
    for (const cause of ['kicked', 'kicked', 'legActuator', 'damage20'] as const) unit = addPsr(unit, cause, 'physical')
    expect(checks(unit).map((c) => c.target)).toEqual([8, 8, 8, 9, 9, 9, 9])
  })

  it('counts leg damage, with a hip replacing the leg actuators', () => {
    const attacker = createAttacker({
      leftLeg: { hipHit: true, upperLegHit: true, lowerLegHit: false, footHit: true },
      rightLeg: { hipHit: false, upperLegHit: true, lowerLegHit: false, footHit: true },
    })
    expect(psrDamageModifiers(attacker).map((m) => m.value)).toEqual([2, 2])
    expect(psrDamageModifiers({ ...attacker, destroyedLocations: ['LL'] }).map((m) => m.value)).toEqual([5, 2])
  })

  it('makes rolls after a fall unnecessary, except trying to stand', () => {
    let unit = addPsr(addPsr(unitOf(), 'kicked'), 'missedKick')
    unit = enterPsrRoll(unit, unit.psrs.rolls[0].id, 'roll', 4)
    expect(checks(unit).map((c) => c.outcome)).toEqual(['falls', 'skipped'])
    expect(unit.attacker.prone).toBe(true)

    unit = addPsr(unit, 'stand')
    unit = enterPsrRoll(unit, last(unit), 'roll', 5)
    expect(unit.attacker.prone).toBe(false)
  })

  it('fails every roll of a shut down Mech, and hurts its MechWarrior without a roll', () => {
    const unit = addPsr(unitOf({ shutdown: true }), 'water1')
    const [check] = checks(unit)
    expect(check.outcome).toBe('falls')
    expect(check.pilotHurt).toBe(true)
    expect(unit.attacker.prone).toBe(true)
  })

  it('takes Depth 1 water at -1', () => {
    expect(checks(addPsr(unitOf(), 'water1'))[0].target).toBe(4)
  })

  it('drops a missed death from above on its rear as a 2-level fall', () => {
    let unit = addPsr(unitOf(), 'missedDfa')
    const [check] = checks(unit)
    expect(check.outcome).toBe('falls')
    // +1 for every level above 1 on the MechWarrior's roll.
    expect(check.pilotTarget).toBe(6)
    expect(fallDamage(unit.attacker, 2)).toBe(27)
    const id = last(unit)
    unit = enterFallRoll(unit, id, 'facing', 1)
    fiveGroups(27).forEach((_, i) => (unit = enterFallRoll(unit, id, i, 7)))
    unit = applyFallDamage(unit, id)
    expect(unit.psrs.rolls[0].fall.applied?.side).toBe('rear')
    expect(unit.attacker.armorDamage.CTR).toBeGreaterThan(0)
    expect(unit.attacker.armorDamage.CT).toBeUndefined()
  })

  it('deals falling damage of 1 per 10 tons in 5-point groups, halved in water', () => {
    expect(fallDamage({ tonnage: 85, waterDepth: 0 })).toBe(9)
    expect(fiveGroups(9)).toEqual([5, 4])
    expect(fallDamage({ tonnage: 85, waterDepth: 1 })).toBe(4)
  })

  it('picks the Hit Location column from the Facing After Fall roll', () => {
    expect([1, 2, 3, 4, 5, 6].map(fallSide)).toEqual(['front', 'right', 'right', 'rear', 'left', 'left'])
    expect(fallHitLocation('rear', 7)).toBe('CT')
    expect(fallHitLocation('left', 2)).toBe('LT')
  })

  it('applies falling damage group by group from the entered rolls, and undoes it', () => {
    let unit = addPsr(unitOf(), 'kicked')
    const id = last(unit)
    unit = enterPsrRoll(unit, id, 'roll', 4)
    expect(pendingSteps(unit, true)).toBe(2)
    unit = enterPsrRoll(unit, id, 'pilotRoll', 5)
    expect(checks(unit)[0].pilotHurt).toBe(false)

    // 85 tons: 9 damage as 5 + 4. A fall on the back hits the rear armor.
    unit = enterFallRoll(enterFallRoll(unit, id, 'facing', 4), id, 0, 7)
    expect(applyFallDamage(unit, id)).toBe(unit)
    unit = applyFallDamage(enterFallRoll(unit, id, 1, 6), id)
    expect(unit.attacker.armorDamage).toEqual({ CTR: 5, RTR: 4 })
    expect(pendingSteps(unit, true)).toBe(0)

    const undone = undoFallDamage(unit, id)
    expect(undone.attacker.armorDamage).toEqual({})
    expect(undone.psrs.rolls[0].fall.locationRolls).toEqual([7, 6])

    // Correcting the roll to a pass takes the fall back, and so does removing the roll.
    const standing = enterPsrRoll(unit, id, 'roll', 9)
    expect(standing.attacker.prone).toBe(false)
    expect(standing.attacker.armorDamage).toEqual({})
    const removed = removePsr(unit, id)
    expect(removed.attacker.prone).toBe(false)
    expect(removed.attacker.armorDamage).toEqual({})
  })

  it('clears the rolls on Next turn', () => {
    expect(advanceTurn(addPsr(unitOf(), 'kicked')).psrs.rolls).toEqual([])
  })
})

describe('Piloting Skill Rolls from tracked damage', () => {
  const unitOf = (options: Parameters<typeof createAttacker>[0] = {}) => newUnit({ attacker: createAttacker({ tonnage: 85, piloting: 5, ...options }), weapons: [] })
  const causes = (unit: UnitState) => unit.psrs.rolls.map((p) => `${p.cause}@${p.phase}`)
  const hit = (unit: UnitState, location: Location, amount: number) => trackDamage(unit, { ...unit, attacker: applyDamage(unit.attacker, location, amount).attacker })

  it('adds a roll once a phase deals 20 or more damage, and removes it when undone', () => {
    let unit = hit(unitOf(), 'CT', 12)
    expect(causes(unit)).toEqual([])
    const before = unit
    unit = hit(unit, 'LT', 8)
    expect(causes(unit)).toEqual(['damage20@weapon'])
    expect(trackDamage(unit, before).psrs.rolls).toEqual([])

    // The Physical Attack Phase counts on its own.
    unit = hit({ ...unit, attackPhase: 'physical' }, 'RT', 19)
    expect(causes(unit)).toEqual(['damage20@weapon'])
    unit = hit(unit, 'RT', 1)
    expect(causes(unit)).toEqual(['damage20@weapon', 'damage20@physical'])
  })

  it('adds a roll per damaged leg actuator and hip, in the attack phase, and removes it when unticked', () => {
    const unit = { ...unitOf(), attackPhase: 'physical' as const }
    const ticked = trackDamage(unit, { ...unit, attacker: { ...unit.attacker, leftLeg: { ...unit.attacker.leftLeg, footHit: true }, rightLeg: { ...unit.attacker.rightLeg, hipHit: true } } })
    expect(causes(ticked)).toEqual(['legActuator@physical', 'hip@physical'])
    // +1 foot, +2 hip.
    expect(checkPsrs(ticked.psrs, ticked.attacker).map((c) => c.target)).toEqual([8, 8])
    const unticked = trackDamage(ticked, { ...ticked, attacker: { ...ticked.attacker, leftLeg: { ...ticked.attacker.leftLeg, footHit: false } } })
    expect(causes(unticked)).toEqual(['hip@physical'])
  })

  it('drops a Mech that loses a leg, skipping the other rolls of the phase', () => {
    let unit = hit(unitOf(), 'CT', 25)
    unit = trackDamage(unit, { ...unit, attacker: { ...unit.attacker, destroyedLocations: ['LL'] } })
    const checks = checkPsrs(unit.psrs, unit.attacker)
    expect(checks.map((c) => [c.psr.cause, c.outcome])).toEqual([
      ['damage20', 'skipped'],
      ['legDestroyed', 'falls'],
    ])
    expect(unit.attacker.prone).toBe(true)
  })

  it('takes +3 for a damaged gyro and drops the Mech when it is destroyed, unable to stand', () => {
    let unit = trackDamage(unitOf(), { ...unitOf(), attacker: { ...unitOf().attacker, gyroHits: 1 } })
    expect(checkPsrs(unit.psrs, unit.attacker).map((c) => c.target)).toEqual([8])
    unit = trackDamage(unit, { ...unit, attacker: { ...unit.attacker, gyroHits: 2 } })
    expect(checkPsrs(unit.psrs, unit.attacker).map((c) => c.outcome)).toEqual(['skipped', 'falls'])
    // The MechWarrior's roll takes +6 for the destroyed gyro.
    expect(checkPsrs(unit.psrs, unit.attacker)[1].pilotTarget).toBe(11)
    unit = addPsr(unit, 'stand')
    expect(checkPsrs(unit.psrs, unit.attacker)[2].skipped).toMatch(/cannot stand/)
  })

  it('counts a heat explosion toward the Heat Phase', () => {
    const unit = newUnit({ attacker: createAttacker({ heat: 19, heatSinks: 0, tonnage: 85, ammoBins: [{ ...newAmmoBin('LRM20', 'LT'), shots: 1 }] }), weapons: [] })
    // One shot: 20 damage, short of destroying the 'Mech.
    let next = enterHeatRoll(enterHeatRoll(advanceTurn(unit), 'powerRoll', 6), 'ammoRoll', 2)
    next = trackDamage(next, explodeHeatAmmo(next, next.attacker.ammoBins[0].id), 'heat')
    expect(causes(next)).toEqual(['damage20@heat'])
  })
})

describe('MechWarrior damage', () => {
  const unitOf = (options: Parameters<typeof createAttacker>[0] = {}) => newUnit({ attacker: createAttacker({ tonnage: 85, piloting: 5, ...options }), weapons: [] })
  const outcomes = (unit: UnitState) => checkPilot(unit.pilot).checks.map((c) => c.outcome)

  it('uses the consciousness numbers of the record sheet', () => {
    expect([1, 2, 3, 4, 5, 6].map(consciousnessTarget)).toEqual([3, 5, 7, 10, 11, null])
  })

  it('rolls for each point, stops rolling once unconscious, and dies at 6', () => {
    let unit = addPilotDamage(unitOf(), 'Ammo explosion', 2)
    expect(unit.attacker.pilotHits).toBe(2)
    expect(pendingSteps(unit, true)).toBe(2)
    const id = unit.pilot.damage[0].id
    unit = enterConsciousnessRoll(unit, id, 0, 4)
    unit = enterConsciousnessRoll(unit, id, 1, 4)
    expect(outcomes(unit)).toEqual(['conscious', 'unconscious'])
    expect(unit.attacker.unconscious).toBe(true)

    unit = addPilotDamage(unit, 'Head hit', 1)
    expect(outcomes(unit)).toEqual(['conscious', 'unconscious', 'skipped'])
    expect(pendingSteps(unit, true)).toBe(0)
    unit = addPilotDamage(unit, 'Other', 3)
    expect(checkPilot(unit.pilot).killed).toBe(true)
    expect(unit.attacker.pilotHits).toBe(6)
  })

  it('immobilizes the Mech while unconscious: no fire, every PSR fails', () => {
    const { attacker, weapons } = buildMech(MECHS.find((m) => m.name === 'Highlander HGN-732')!)
    const out = { ...attacker, unconscious: true }
    expect(firingWeapons(out, weapons)).toEqual([])
    expect(resolveWeaponAttack(weapons[0], { attacker: out, target: createTarget(), spotter: defaultSpotter(), attackerIsSpotting: false }).reasons).toContain('MechWarrior unconscious')
    let unit = addPilotDamage(unitOf(), 'Head hit', 1)
    unit = addPsr(enterConsciousnessRoll(unit, unit.pilot.damage[0].id, 0, 2), 'kicked')
    expect(unitPsrs(unit)[0].automatic).toMatch(/unconscious/)
  })

  it('adds damage from a failed MechWarrior roll after a fall, and takes it back with the fall', () => {
    let unit = addPsr(unitOf(), 'kicked')
    const id = unit.psrs.rolls[0].id
    unit = enterPsrRoll(enterPsrRoll(unit, id, 'roll', 3), id, 'pilotRoll', 2)
    expect(unit.pilot.damage.map((d) => [d.source, d.amount])).toEqual([[`fall:${id}`, 1]])
    expect(unit.attacker.pilotHits).toBe(1)
    // Knocked out: the Consciousness Roll fails.
    unit = enterConsciousnessRoll(unit, unit.pilot.damage[0].id, 0, 2)
    expect(unit.attacker.unconscious).toBe(true)
    unit = enterPsrRoll(unit, id, 'roll', 10)
    expect(unit.pilot.damage).toEqual([])
    expect(unit.attacker.pilotHits).toBe(0)
    expect(unit.attacker.unconscious).toBe(false)
  })

  it('makes later Piloting Skill Rolls fail once the MechWarrior is knocked out', () => {
    let unit = addPilotDamage(addPsr(unitOf(), 'kicked'), 'Head hit', 1)
    unit = enterConsciousnessRoll(unit, unit.pilot.damage[0].id, 0, 2)
    const [check] = unitPsrs(unit)
    expect(check.outcome).toBe('falls')
    // The fall hurts the immobile MechWarrior without a roll.
    expect(unit.pilot.damage.map((d) => d.reason)).toEqual(['Head hit', 'Fall (was kicked)'])
    expect(unit.attacker.prone).toBe(true)
  })

  it('injures the MechWarrior for 2 when heat explodes ammo', () => {
    const unit = newUnit({ attacker: createAttacker({ heat: 19, heatSinks: 0, tonnage: 85, ammoBins: [{ ...newAmmoBin('LRM20', 'LT'), shots: 1 }] }), weapons: [] })
    let next = enterHeatRoll(enterHeatRoll(advanceTurn(unit), 'powerRoll', 6), 'ammoRoll', 2)
    next = explodeHeatAmmo(next, next.attacker.ammoBins[0].id)
    expect(next.attacker.pilotHits).toBe(2)
    expect(removePilotDamage(next, 'heat-explosion').attacker.pilotHits).toBe(0)
  })

  it('asks for a wake-up roll after a full turn unconscious', () => {
    let unit = addPilotDamage(unitOf(), 'Head hit', 1)
    unit = enterConsciousnessRoll(unit, unit.pilot.damage[0].id, 0, 2)
    // The turn it was knocked out: no roll yet.
    unit = advanceTurn(unit)
    expect(unit.pilot.wake).toBeNull()
    expect(unit.attacker.unconscious).toBe(true)
    unit = advanceTurn(unit)
    expect(unit.pilot.wake).toEqual({ target: 3, roll: null })
    expect(pendingSteps(unit, true)).toBe(1)
    unit = enterWakeRoll(unit, 3)
    expect(unit.attacker.unconscious).toBe(false)
    expect(unit.attacker.pilotHits).toBe(1)
  })
})

describe('Critical hits', () => {
  const wolverine = () => {
    const { attacker, weapons } = buildMech(MECHS.find((m) => m.name === 'Wolverine WVR-6R')!)
    return newUnit({ attacker, weapons })
  }
  const hit = (unit: UnitState, location: Location, amount: number) => trackDamage(unit, { ...unit, attacker: applyDamage(unit.attacker, location, amount).attacker })
  // 16 armor on the right arm: 18 damage reaches 2 internal structure.
  const armCrit = (roll = 9) => {
    const unit = hit(wolverine(), 'RA', 18)
    return enterCritRoll(unit, unit.crits[0].id, roll)
  }

  it('reads the Determining Critical Hits Table', () => {
    expect([7, 8, 9, 10, 11].map((r) => critCount(r, 'CT').hits)).toEqual([0, 1, 1, 2, 2])
    expect(critCount(12, 'LT')).toEqual({ hits: 3, blownOff: false })
    expect(critCount(12, 'LA')).toEqual({ hits: 0, blownOff: true })
    expect(critCount(12, 'HD')).toEqual({ hits: 0, blownOff: true })
  })

  it('checks a location when its internal structure is damaged, and drops the check when the damage is undone', () => {
    const armorOnly = hit(wolverine(), 'RA', 10)
    expect(armorOnly.crits).toEqual([])
    const unit = hit(armorOnly, 'RA', 8)
    expect(unit.crits.map((c) => [c.location, c.kind])).toEqual([['RA', 'structure']])
    expect(pendingCritSteps(unit)).toBe(1)
    expect(trackDamage(unit, armorOnly).crits).toEqual([])
  })

  it('destroys the weapon in the rolled slot, and undoes it', () => {
    let unit = armCrit()
    const id = unit.crits[0].id
    // Right arm: Shoulder, Upper Arm, Lower Arm, Hand, AC5 ×4, Ammo AC5, then empty. Block 4–6, slot 1: the AC/5.
    expect(critHitState(unit, unit.crits[0], 0)).toMatchObject({ kind: 'roll', needsBlock: true })
    unit = enterCritDie(enterCritDie(unit, id, 0, 0, 'block', 4), id, 0, 0, 'slot', 1)
    expect(critHitState(unit, unit.crits[0], 0)).toMatchObject({ kind: 'ready', slot: 6, item: { kind: 'weapon', key: 'AC5' } })
    unit = applyCritHit(unit, id, 0)
    expect(unit.weapons.find((w) => w.weaponKey === 'AC5')?.destroyed).toBe(true)
    expect(unit.attacker.critHits.RA).toEqual([6])
    expect(firingWeapons(unit.attacker, unit.weapons).some((w) => w.weaponKey === 'AC5')).toBe(false)
    expect(pendingCritSteps(unit)).toBe(0)
    const undone = undoCritHit(unit, id, 0)
    expect(undone.weapons.find((w) => w.weaponKey === 'AC5')?.destroyed).toBe(false)
    expect(undone.attacker.critHits.RA ?? []).toEqual([])
  })

  it('rolls again on an empty slot', () => {
    let unit = armCrit()
    const id = unit.crits[0].id
    unit = enterCritDie(enterCritDie(unit, id, 0, 0, 'block', 6), id, 0, 0, 'slot', 6)
    expect(critHitState(unit, unit.crits[0], 0)).toMatchObject({ kind: 'roll', attempt: 1, tries: [{ slot: 11, reason: 'empty' }] })
    unit = enterCritDie(enterCritDie(unit, id, 0, 1, 'block', 1), id, 0, 1, 'slot', 4)
    expect(critHitState(unit, unit.crits[0], 0)).toMatchObject({ kind: 'ready', slot: 3, item: { kind: 'component', name: 'Hand' } })
    unit = applyCritHit(unit, id, 0)
    expect(unit.attacker.rightArm.handHit).toBe(true)
  })

  it('explodes ammo it hits: damage, MechWarrior damage, and new checks where the damage lands', () => {
    let unit = armCrit()
    // Two AC/5 shots left: 10 damage, 7 to destroy the arm and 3 into the right torso.
    unit = { ...unit, attacker: { ...unit.attacker, ammoBins: unit.attacker.ammoBins.map((b) => (b.weaponKey === 'AC5' ? { ...b, shots: 2 } : b)) } }
    const id = unit.crits[0].id
    unit = enterCritDie(enterCritDie(unit, id, 0, 0, 'block', 5), id, 0, 0, 'slot', 3)
    unit = applyCritHit(unit, id, 0)
    expect(unit.attacker.destroyedLocations).toContain('RA')
    expect(unit.attacker.pilotHits).toBe(2)
    expect(unit.crits.slice(1).map((c) => c.location)).toEqual(['RT'])
    const undone = undoCritHit(unit, id, 0)
    expect(undone.attacker.destroyedLocations).toEqual([])
    expect(undone.attacker.pilotHits).toBe(0)
    expect(undone.crits.length).toBe(1)
  })

  it('adds a Piloting Skill Roll for a leg actuator hit', () => {
    let unit = hit(wolverine(), 'LL', 18)
    const id = unit.crits[0].id
    unit = enterCritRoll(unit, id, 8)
    // Left leg: Hip, Upper Leg, Lower Leg, Foot, Jump Jet ×2. Slot 4: the foot.
    unit = applyCritHit(enterCritDie(unit, id, 0, 0, 'slot', 4), id, 0)
    expect(unit.attacker.leftLeg.footHit).toBe(true)
    expect(unit.psrs.rolls.map((p) => p.cause)).toEqual(['legActuator'])
  })

  it('blows off a limb on a 12, without losing its armor', () => {
    let unit = armCrit(12)
    expect(unit.crits[0].hits).toEqual([])
    unit = applyBlownOff(unit, unit.crits[0].id)
    expect(unit.attacker.destroyedLocations).toEqual(['RA'])
    expect(unit.attacker.armorDamage.RA).toBe(16)
  })

  it('transfers a critical hit inward when nothing is left to hit, unless hit this phase', () => {
    const { attacker } = wolverine()
    // The left torso holds only the SRM 6 and its ammo, all hit before.
    const hitBefore = { ...attacker, critHits: { LT: [0, 1, 2] } }
    expect(critLocation(hitBefore, 'LT', () => false)).toBe('CT')
    expect(critLocation(hitBefore, 'LT', (l) => l === 'LT')).toBeNull()
  })

  it('destroys the Mech on a third engine hit', () => {
    let unit = hit(wolverine(), 'CT', 30)
    for (const n of [1, 2, 3]) {
      const id = unit.crits[unit.crits.length - 1].id
      unit = enterCritRoll(unit, id, 8)
      // Center torso slot 1 of the upper block: the engine. Later hits land on the next engine slots.
      unit = enterCritDie(enterCritDie(unit, id, 0, 0, 'block', 1), id, 0, 0, 'slot', n)
      unit = applyCritHit(unit, id, 0)
      if (n < 3) unit = hit(unit, 'CT', 1)
    }
    expect(unit.attacker.engineHits).toBe(3)
    expect(isMechDestroyed(unit.attacker)).toBe(true)
  })

  it('checks a through-armor critical without internal structure damage', () => {
    const unit = addThroughArmorCrit(wolverine(), 'CT', 'hit-1')
    expect(unit.crits.map((c) => c.kind)).toEqual(['through-armor'])
  })

  it('lets the player pick what the slot holds without a known Critical Hit Table', () => {
    let unit = newUnit({ attacker: createAttacker({ tonnage: 50 }), weapons: [] })
    unit = hit(unit, 'CT', 30)
    const id = unit.crits[0].id
    unit = enterCritRoll(unit, id, 8)
    expect(critHitState(unit, unit.crits[0], 0).kind).toBe('pick')
    unit = applyCritHit(pickCritItem(unit, id, 0, { kind: 'component', name: 'Gyro' }), id, 0)
    expect(unit.attacker.gyroHits).toBe(1)
  })

  it('hurts the MechWarrior in the Heat Phase with life support out', () => {
    const unit = newUnit({ attacker: createAttacker({ heat: 26, heatSinks: 0, lifeSupportHit: true }), weapons: [] })
    expect(advanceTurn(unit).attacker.pilotHits).toBe(2)
    expect(advanceTurn({ ...unit, attacker: { ...unit.attacker, heat: 15 } }).attacker.pilotHits).toBe(1)
  })
})
