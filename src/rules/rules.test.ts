import { describe, expect, it } from 'vitest'
import { createAttacker, createTarget, defaultSpotter, newAmmoBin, newWeapon } from '../state/defaults'
import { availableBins, drawAmmo, explosionDamage, firingWeapons, heatExplosionCandidates, shotsPerBin, spendAmmo } from './ammo'
import { applyDamage, armorLeft, damageTotals, explodeAmmo, maxArmorFacings, structureLeft, structureOf } from './damage'
import { chanceToHit } from './dice'
import { projectHeat } from './heat'
import { resolvePhysicalAttack } from './physicalAttack'
import { averageClusterHits, CLUSTER_HITS_TABLE, fivePointGroups, hitLocationChances, targetMovementModifier, WEAPONS_BY_KEY } from './tables'
import type { Attacker, Location, Target } from './types'
import { advanceTurn, newUnit } from '../state/unit'
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
    const unit = newUnit()
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
