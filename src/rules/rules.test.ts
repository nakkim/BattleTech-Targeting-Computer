import { describe, expect, it } from 'vitest'
import { createAttacker, createTarget, defaultSpotter, newWeapon } from '../state/defaults'
import { chanceToHit } from './dice'
import { projectHeat } from './heat'
import { resolvePhysicalAttack } from './physicalAttack'
import { averageClusterHits, CLUSTER_HITS_TABLE, fivePointGroups, hitLocationChances, targetMovementModifier, WEAPONS_BY_KEY } from './tables'
import type { Attacker, Target } from './types'
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
