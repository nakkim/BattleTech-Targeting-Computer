import { destroyedReason, isLocationDestroyed } from './destruction'
import { chanceToHit } from './dice'
import {
  ATTACKER_MOVEMENT_MODIFIER,
  MOVEMENT_NAMES,
  averageClusterHits,
  heatToHitModifier,
  isLrm,
  targetMovementModifier,
  WEAPONS_BY_KEY,
} from './tables'
import type { Arc, ArmState, Attacker, AttackResult, Location, Modifier, MountedWeapon, Spotter, Target, WeaponSpec } from './types'

export type RangeBracket = 'short' | 'medium' | 'long' | 'out'

export function rangeBracket(spec: WeaponSpec, range: number): RangeBracket {
  if (range <= spec.short) return 'short'
  if (range <= spec.medium) return 'medium'
  if (range <= spec.long) return 'long'
  return 'out'
}

export const RANGE_MODIFIER: Record<Exclude<RangeBracket, 'out'>, number> = {
  short: 0,
  medium: 2,
  long: 4,
}

/** [Min. Range] – [Target Range] + 1 when the target is within minimum range (p. 18). */
export function minimumRangeModifier(spec: WeaponSpec, range: number): number {
  if (spec.minRange <= 0 || range > spec.minRange) return 0
  return spec.minRange - range + 1
}

export function isArm(location: Location): location is 'LA' | 'RA' {
  return location === 'LA' || location === 'RA'
}

export function isLeg(location: Location): boolean {
  return location === 'LL' || location === 'RL'
}

export function armOf(attacker: Attacker, location: 'LA' | 'RA'): ArmState {
  return location === 'LA' ? attacker.leftArm : attacker.rightArm
}

/** Arcs a weapon mounted in the given location can fire into (p. 14-15). */
export function weaponArcs(location: Location, rear: boolean, armsFlipped: boolean): Arc[] {
  if (rear) return ['rear']
  if (isArm(location)) {
    if (armsFlipped) return ['rear']
    return ['front', location === 'LA' ? 'left' : 'right']
  }
  return ['front']
}

/** A standing 'Mech in Depth 2+ water, or a prone 'Mech in Depth 1+, is submerged (p. 14). */
export function isSubmerged(waterDepth: number, prone: boolean): boolean {
  return waterDepth >= 2 || (prone && waterDepth >= 1)
}

/** Woods modifiers: target hex plus each intervening woods hex (p. 17). */
export function woodsModifier(target: Pick<Target, 'terrain' | 'interveningLight' | 'interveningHeavy'>): number {
  const targetHex = target.terrain === 'light' ? 1 : target.terrain === 'heavy' ? 2 : 0
  return targetHex + target.interveningLight + target.interveningHeavy * 2
}

/** Partial cover applies for hill/building cover or for a standing 'Mech in Depth 1 water. */
export function hasPartialCover(target: Target): boolean {
  if (target.prone) return false
  return target.partialCover || target.waterDepth === 1
}

/** Damage modifier for weapons in a damaged arm (p. 19). */
export function armDamageModifier(arm: ArmState): Modifier[] {
  if (arm.shoulderHit) return [{ gator: 'O', label: 'Shoulder hit', value: 4 }]
  const mods: Modifier[] = []
  if (arm.upperArmHit) mods.push({ gator: 'O', label: 'Upper arm actuator hit', value: 1 })
  if (arm.lowerArmHit && arm.hasLowerArm) mods.push({ gator: 'O', label: 'Lower arm actuator hit', value: 1 })
  return mods
}

export function attackerMovementModifiers(movement: Attacker['movement'], prone: boolean, who = 'Attacker'): Modifier[] {
  const mods: Modifier[] = [
    { gator: 'A', label: `${who} ${MOVEMENT_NAMES[movement].toLowerCase()}`, value: ATTACKER_MOVEMENT_MODIFIER[movement] },
  ]
  if (prone) mods.push({ gator: 'A', label: `${who} prone`, value: 2 })
  return mods
}

export function targetModifiers(target: Target): Modifier[] {
  const mods: Modifier[] = [
    { gator: 'T', label: `Target moved ${target.hexesMoved} hex${target.hexesMoved === 1 ? '' : 'es'}`, value: targetMovementModifier(target.hexesMoved) },
  ]
  if (target.jumped) mods.push({ gator: 'T', label: 'Target jumped', value: 1 })
  if (target.prone) {
    mods.push(
      target.range <= 1
        ? { gator: 'T', label: 'Prone target, adjacent', value: -2 }
        : { gator: 'T', label: 'Prone target, not adjacent', value: 1 },
    )
  }
  return mods
}

export function terrainModifiers(target: Target, { partialCover = true } = {}): Modifier[] {
  const mods: Modifier[] = []
  if (target.terrain === 'light') mods.push({ gator: 'O', label: 'Target in light woods', value: 1 })
  if (target.terrain === 'heavy') mods.push({ gator: 'O', label: 'Target in heavy woods', value: 2 })
  if (target.interveningLight > 0)
    mods.push({ gator: 'O', label: `${target.interveningLight}× intervening light woods`, value: target.interveningLight })
  if (target.interveningHeavy > 0)
    mods.push({ gator: 'O', label: `${target.interveningHeavy}× intervening heavy woods`, value: target.interveningHeavy * 2 })
  if (partialCover && hasPartialCover(target))
    mods.push({ gator: 'O', label: target.waterDepth === 1 && !target.partialCover ? 'Partial cover (Depth 1 water)' : 'Partial cover', value: 1 })
  return mods
}

export function multipleTargetsModifier(target: Target): Modifier[] {
  if (target.primary) return []
  return target.arc === 'front'
    ? [{ gator: 'O', label: 'Secondary target, forward arc', value: 1 }]
    : [{ gator: 'O', label: 'Secondary target, side/rear arc', value: 2 }]
}

export interface WeaponAttackContext {
  attacker: Attacker
  target: Target
  spotter: Spotter
  /** True when this attacker spots for an indirect attack this turn (p. 21). */
  attackerIsSpotting: boolean
}

export interface WeaponAttackResult extends AttackResult {
  spec: WeaponSpec
  bracket: RangeBracket
  averageDamage: number
  expectedDamage: number
}

function summarise(modifiers: Modifier[]): number {
  return modifiers.reduce((sum, m) => sum + m.value, 0)
}

/** Average damage when the weapon hits (cluster hits averaged for missiles). */
export function averageDamageOnHit(spec: WeaponSpec): number {
  if (spec.missiles) return averageClusterHits(spec.missiles) * spec.damage
  return spec.damage
}

export function resolveWeaponAttack(weapon: MountedWeapon, ctx: WeaponAttackContext): WeaponAttackResult {
  const { attacker, target, spotter } = ctx
  const spec = WEAPONS_BY_KEY[weapon.weaponKey]
  const reasons: string[] = []
  const warnings: string[] = []
  const modifiers: Modifier[] = [{ gator: 'G', label: 'Gunnery skill', value: attacker.gunnery }]
  const indirect = weapon.indirect && isLrm(spec)
  const aimed = weapon.aimedAt

  // Ability to fire at all.
  const lost = destroyedReason(attacker, weapon.location)
  if (lost) reasons.push(`${lost}: weapon cannot fire`)
  if (attacker.sensorHits >= 2) reasons.push('Two sensor hits: cannot fire weapons')
  if (attacker.prone && (isLocationDestroyed(attacker, 'LA') || isLocationDestroyed(attacker, 'RA')))
    reasons.push('Prone with a destroyed arm: no weapons can fire')
  if (attacker.prone) {
    if (isLeg(weapon.location)) reasons.push('Prone: leg-mounted weapons cannot fire')
    if (weapon.location === attacker.proneBracingArm) reasons.push('Prone: this arm supports the ’Mech and cannot fire')
  }
  if (attacker.waterDepth === 1 && !attacker.prone && isLeg(weapon.location)) reasons.push('Leg weapons are underwater (Depth 1)')

  // Firing arc. Leg weapons are aligned with the feet, other weapons with the torso.
  const arc = isLeg(weapon.location) && attacker.torsoTwisted ? target.legArc : target.arc
  const arcs = weaponArcs(weapon.location, weapon.rear, attacker.armsFlipped && !attacker.prone)
  if (!arcs.includes(arc)) reasons.push(`Target is outside this weapon’s firing arc`)

  // Line of sight.
  const attackerSubmerged = isSubmerged(attacker.waterDepth, attacker.prone)
  const targetSubmerged = isSubmerged(target.waterDepth, target.prone)
  if (attackerSubmerged !== targetSubmerged)
    reasons.push(attackerSubmerged ? 'Submerged attacker can only target underwater units' : 'Target is submerged: no LOS')
  const woods = woodsModifier(target)
  if (!indirect && woods > 2) reasons.push(`Woods add +${woods}: LOS blocked (more than +2)`)

  // Range.
  const bracket = rangeBracket(spec, target.range)
  if (bracket === 'out') reasons.push(`Out of range (max ${spec.long})`)

  // A: attacker movement (and prone).
  modifiers.push(...attackerMovementModifiers(attacker.movement, attacker.prone))

  // T: target movement.
  modifiers.push(...targetModifiers(target))
  if (target.immobile && !(aimed === 'HD')) modifiers.push({ gator: 'T', label: 'Immobile target', value: -4 })

  // O: other modifiers.
  if (indirect) {
    modifiers.push(...attackerMovementModifiers(spotter.movement, spotter.prone, 'Spotter'))
    modifiers.push({ gator: 'O', label: 'Indirect fire', value: 1 })
    if (spotter.attacked) modifiers.push({ gator: 'O', label: 'Spotter also attacked', value: 1 })
    warnings.push('Only legal if the attacker has no LOS; terrain and partial cover are measured from the spotter')
    if (woods > 2) reasons.push(`Woods add +${woods}: spotter has no LOS`)
  }
  const cover = hasPartialCover(target)
  modifiers.push(...terrainModifiers(target, { partialCover: !aimed }))
  if (cover && !aimed) warnings.push(indirect ? 'Partial cover: leg hits still strike the target (indirect fire)' : 'Partial cover: leg hits strike the cover')
  if (attacker.sensorHits === 1) modifiers.push({ gator: 'O', label: 'Sensor hit', value: 2 })
  if (isArm(weapon.location)) modifiers.push(...armDamageModifier(armOf(attacker, weapon.location)))
  const heatMod = heatToHitModifier(attacker.heat)
  if (heatMod > 0) modifiers.push({ gator: 'O', label: `Heat ${attacker.heat}`, value: heatMod })
  modifiers.push(...multipleTargetsModifier(target))
  if (ctx.attackerIsSpotting && !indirect) modifiers.push({ gator: 'O', label: 'Attacker is spotting this turn', value: 1 })

  // Aimed shots (p. 21).
  if (aimed) {
    if (!target.immobile) reasons.push('Aimed shots require an immobile target')
    if (spec.category === 'missile') reasons.push('Missiles cannot make aimed shots')
    if (indirect) reasons.push('Indirect fire cannot be an aimed shot')
    if (aimed === 'HD') modifiers.push({ gator: 'O', label: 'Aimed shot at head', value: 3 })
    if (cover && isLeg(aimed)) reasons.push('Legs are behind partial cover: cannot aim there')
  }

  // R: range.
  if (bracket !== 'out') {
    modifiers.push({ gator: 'R', label: `${bracket[0].toUpperCase()}${bracket.slice(1)} range (${target.range} hex)`, value: RANGE_MODIFIER[bracket] })
  }
  const minMod = minimumRangeModifier(spec, target.range)
  if (minMod > 0) modifiers.push({ gator: 'R', label: `Minimum range ${spec.minRange}`, value: minMod })

  const targetNumber = summarise(modifiers)
  if (targetNumber > 12) warnings.push('Target Number above 12: automatic miss')
  const allowed = reasons.length === 0
  const probability = allowed ? chanceToHit(targetNumber) : 0
  const averageDamage = averageDamageOnHit(spec)
  return {
    spec,
    bracket,
    allowed,
    reasons,
    warnings,
    modifiers: modifiers.filter((m) => m.value !== 0 || m.gator === 'G'),
    targetNumber,
    probability,
    averageDamage,
    expectedDamage: probability * averageDamage,
  }
}

/** Chance an aimed shot that hit lands on the chosen location: 6, 7 or 8 on 2D6 (p. 21). */
export const AIMED_SHOT_CHANCE = 16 / 36

export interface TargetCheck {
  warnings: string[]
}

/** Checks about the set of declared targets, e.g. primary target rules (p. 17). */
export function checkTargets(targets: Target[], usedTargetIds: Set<string>): TargetCheck {
  const warnings: string[] = []
  const used = targets.filter((t) => usedTargetIds.has(t.id))
  const primaries = used.filter((t) => t.primary)
  if (used.length > 0 && primaries.length === 0) warnings.push('No primary target declared among attacked targets')
  if (primaries.length > 1) warnings.push('Only one primary target is allowed per turn')
  const forward = used.filter((t) => t.arc === 'front')
  if (forward.length > 0 && primaries.length === 1 && primaries[0].arc !== 'front')
    warnings.push('A target in the forward arc must be the primary target')
  return { warnings }
}
