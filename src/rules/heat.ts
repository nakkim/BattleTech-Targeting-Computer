import { firingWeapons } from './destruction'
import { ammoExplosionAvoid, heatMovementPenalty, heatToHitModifier, shutdownAvoid, WEAPONS_BY_KEY } from './tables'
import type { Attacker, MountedWeapon } from './types'

export interface HeatLine {
  label: string
  value: number
}

export interface HeatProjection {
  lines: HeatLine[]
  generated: number
  dissipated: number
  next: number
  effects: string[]
}

/** Movement heat, Heat Point Table p. 37. */
export function movementHeat(attacker: Attacker): number {
  switch (attacker.movement) {
    case 'walked':
      return 1
    case 'ran':
      return 2
    case 'jumped':
      return Math.max(3, attacker.hexesMoved)
    default:
      return 0
  }
}

export function heatEffects(heat: number): string[] {
  const effects: string[] = []
  const toHit = heatToHitModifier(heat)
  if (toHit > 0) effects.push(`+${toHit} to-hit for weapon attacks`)
  const mp = heatMovementPenalty(heat)
  if (mp > 0) effects.push(`–${mp} Walking MP`)
  const shutdown = shutdownAvoid(heat)
  if (shutdown === Infinity) effects.push('Automatic shutdown')
  else if (shutdown !== null) effects.push(`Shutdown, avoid on ${shutdown}+`)
  const ammo = ammoExplosionAvoid(heat)
  if (ammo !== null) effects.push(`Ammo explosion, avoid on ${ammo}+`)
  return effects
}

export function projectHeat(attacker: Attacker, weapons: MountedWeapon[]): HeatProjection {
  const lines: HeatLine[] = []
  const move = movementHeat(attacker)
  if (move > 0) lines.push({ label: `Movement (${attacker.movement})`, value: move })
  for (const w of firingWeapons(attacker, weapons)) {
    const spec = WEAPONS_BY_KEY[w.weaponKey]
    if (spec.heat > 0) lines.push({ label: `${spec.name} [${w.location}${w.rear ? ' R' : ''}]`, value: spec.heat })
  }
  if (attacker.engineHits > 0) lines.push({ label: `Engine hits (${attacker.engineHits})`, value: attacker.engineHits >= 2 ? 10 : 5 })
  const generated = lines.reduce((s, l) => s + l.value, 0)
  const waterBonus = Math.min(6, Math.min(attacker.submergedHeatSinks, attacker.heatSinks))
  const dissipated = attacker.heatSinks + waterBonus
  const next = Math.max(0, attacker.heat + generated - dissipated)
  return { lines, generated, dissipated, next, effects: heatEffects(next) }
}
