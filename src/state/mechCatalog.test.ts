import { describe, expect, it } from 'vitest'
import { usesAmmo } from '../rules/ammo'
import { maxArmor, REAR_FACING } from '../rules/damage'
import { hasLocation } from '../rules/destruction'
import { itemAt, slotCount } from '../rules/crits'
import { LOCATIONS, WEAPONS_BY_KEY } from '../rules/tables'
import { buildMech, defaultMech, MECHS, OTHER_MECH } from './mechCatalog'

// Checks every file in src/mechs/, so a new 'Mech with a typo fails here.
describe('mech catalog', () => {
  it('loads every model once', () => {
    expect(MECHS.length).toBeGreaterThanOrEqual(11)
    expect(new Set(MECHS.map((m) => m.name)).size).toBe(MECHS.length)
    expect(defaultMech().name).toBe('Griffin GRF-1N')
  })

  describe.each(MECHS.map((m) => [m.name, m] as const))('%s', (_, mech) => {
    const { attacker, weapons } = buildMech(mech)

    it('has a valid tonnage', () => {
      expect(mech.tonnage % 5).toBe(0)
      expect(mech.tonnage).toBeGreaterThanOrEqual(20)
      expect(mech.tonnage).toBeLessThanOrEqual(100)
    })
    it('mounts known weapons in locations it has', () => {
      for (const w of weapons) {
        expect(WEAPONS_BY_KEY[w.weaponKey], w.weaponKey).toBeDefined()
        expect(hasLocation(attacker, w.location), `${w.weaponKey} in ${w.location}`).toBe(true)
      }
    })
    it('carries ammo only for its ammo weapons', () => {
      for (const bin of attacker.ammoBins) {
        expect(usesAmmo(bin.weaponKey), bin.weaponKey).toBe(true)
        expect(weapons.some((w) => w.weaponKey === bin.weaponKey), `${bin.weaponKey} ammo without the weapon`).toBe(true)
        expect(hasLocation(attacker, bin.location)).toBe(true)
      }
    })
    it('has a Critical Hit Table that matches its weapons and ammo', () => {
      const slots = mech.criticalSlots
      expect(slots, 'criticalSlots').toBeDefined()
      for (const l of LOCATIONS) {
        const table = slots![l]
        expect(table.length, l).toBe(slotCount(l))
        // Every mounted weapon and ammo bin has a slot of its own.
        for (const [i, w] of weapons.entries()) {
          const item = itemAt(attacker, weapons, w.location, slots![w.location].findIndex((_, s) => {
            const at = itemAt(attacker, weapons, w.location, s)
            return at.kind === 'weapon' && at.weaponId === w.id
          }))
          expect(item.kind === 'weapon' && item.weaponId, `${w.weaponKey} #${i} in ${w.location}`).toBe(w.id)
        }
        for (const bin of attacker.ammoBins.filter((b) => b.location === l)) {
          expect(table.some((_, s) => { const at = itemAt(attacker, weapons, l, s); return at.kind === 'ammo' && at.binId === bin.id }), `${bin.weaponKey} ammo in ${l}`).toBe(true)
        }
      }
    })
    it('stays within maximum armor', () => {
      for (const l of LOCATIONS) {
        const rear = REAR_FACING[l]
        expect(mech.armor[l] + (rear ? mech.armor[rear] : 0), l).toBeLessThanOrEqual(maxArmor(mech.tonnage, l))
      }
    })
  })

  it('marks rear-firing mounts', () => {
    const { weapons } = buildMech(MECHS.find((m) => m.name === 'BattleMaster BLR-1G')!)
    expect(weapons.filter((w) => w.rear).map((w) => w.location)).toEqual(['LT', 'RT'])
  })
})

describe('other mech', () => {
  it('is a blank 50-ton Mech within maximum armor, not in the list', () => {
    const { attacker, weapons } = buildMech(OTHER_MECH)
    expect(attacker.tonnage).toBe(50)
    expect(weapons.map((w) => w.weaponKey)).toEqual(['ML', 'ML'])
    expect(attacker.ammoBins).toEqual([])
    expect(MECHS.some((m) => m.name === OTHER_MECH.name)).toBe(false)
  })
})
