import { destroyedReason, isLocationDestroyed, isMechDestroyed } from './destruction'
import { chanceToHit } from './dice'
import { fivePointGroups, type HitTable } from './tables'
import type { ArmState, Attacker, AttackResult, LegState, Location, Modifier, Target } from './types'
import { attackerMovementModifiers, isSubmerged, targetModifiers } from './weaponAttack'

export type PhysicalAttackType =
  | 'punchLA'
  | 'punchRA'
  | 'kickLL'
  | 'kickRL'
  | 'hatchetLA'
  | 'hatchetRA'
  | 'club'
  | 'push'
  | 'charge'
  | 'dfa'

export const PHYSICAL_ATTACK_NAMES: Record<PhysicalAttackType, string> = {
  punchLA: 'Punch (left arm)',
  punchRA: 'Punch (right arm)',
  kickLL: 'Kick (left leg)',
  kickRL: 'Kick (right leg)',
  hatchetLA: 'Hatchet (left arm)',
  hatchetRA: 'Hatchet (right arm)',
  club: 'Club',
  push: 'Push',
  charge: 'Charge',
  dfa: 'Death From Above',
}

export const PHYSICAL_ATTACK_TYPES = Object.keys(PHYSICAL_ATTACK_NAMES) as PhysicalAttackType[]

/** Physical Attack Modifiers Table, p. 24. */
const BASE_MODIFIER: Record<string, number> = {
  punch: 0,
  kick: -2,
  hatchet: -1,
  club: -1,
  push: -1,
  charge: 0,
  dfa: 0,
}

type Kind = 'punch' | 'kick' | 'hatchet' | 'club' | 'push' | 'charge' | 'dfa'

const kindOf = (type: PhysicalAttackType): Kind => {
  if (type.startsWith('punch')) return 'punch'
  if (type.startsWith('kick')) return 'kick'
  if (type.startsWith('hatchet')) return 'hatchet'
  return type as Kind
}

export interface PhysicalAttackContext {
  attacker: Attacker
  target: Target
  /** Locations of weapons fired by the attacker this turn. */
  firedLocations: Set<Location>
  /** Hit table chosen for hatchet attacks (+4 for punch/kick tables). */
  hatchetTable: HitTable
}

export interface PhysicalAttackResult extends AttackResult {
  type: PhysicalAttackType
  name: string
  /** Damage groupings to the target. */
  damageGroups: number[]
  /** Damage groupings to the attacker on a hit (charge, DFA). */
  attackerDamageGroups: number[]
  hitTable: HitTable | null
  /** True when the hit uses the rear column regardless of direction (DFA on prone target). */
  forceRear: boolean
  notes: string[]
}

interface LevelRule {
  allowed: boolean
  /** Hit table forced by different levels (p. 25). */
  table?: HitTable
}

/** Different Levels Table and prone target rules, p. 25. */
export const levelRule = (kind: Kind, target: Target): LevelRule => {
  if (kind === 'dfa') return { allowed: true }
  const diff = target.levelDifference
  if (Math.abs(diff) > 1) return { allowed: false }
  if (diff === 0) {
    if (!target.prone) return { allowed: true }
    return { allowed: kind === 'kick' || kind === 'club' || kind === 'hatchet', table: 'standard' }
  }
  if (target.prone) {
    if (diff === 1) return { allowed: kind === 'punch' || kind === 'club' || kind === 'hatchet', table: 'standard' }
    return { allowed: false }
  }
  if (diff === 1) {
    if (kind === 'charge') return { allowed: true }
    return { allowed: kind === 'punch' || kind === 'club' || kind === 'hatchet', table: 'kick' }
  }
  if (kind === 'charge') return { allowed: true }
  return { allowed: kind === 'kick' || kind === 'club' || kind === 'hatchet', table: 'punch' }
}

const defaultTable = (kind: Kind, ctx: PhysicalAttackContext): HitTable | null => {
  switch (kind) {
    case 'punch':
    case 'dfa':
      return 'punch'
    case 'kick':
      return 'kick'
    case 'hatchet':
      return ctx.hatchetTable
    case 'push':
      return null
    default:
      return 'standard'
  }
}

const halve = (value: number, times: number): number => {
  let v = value
  for (let i = 0; i < times; i++) v = Math.floor(v / 2)
  return v
}

const armOf = (attacker: Attacker, loc: 'LA' | 'RA'): ArmState => {
  return loc === 'LA' ? attacker.leftArm : attacker.rightArm
}

const legOf = (attacker: Attacker, loc: 'LL' | 'RL'): LegState => {
  return loc === 'LL' ? attacker.leftLeg : attacker.rightLeg
}

export const resolvePhysicalAttack = (type: PhysicalAttackType, ctx: PhysicalAttackContext): PhysicalAttackResult => {
  const { attacker, target, firedLocations } = ctx
  const kind = kindOf(type)
  const reasons: string[] = []
  const warnings: string[] = []
  const notes: string[] = []
  const modifiers: Modifier[] = [
    { gator: 'G', label: 'Piloting skill', value: attacker.piloting },
    { gator: 'O', label: `${PHYSICAL_ATTACK_NAMES[type].split(' (')[0]} modifier`, value: BASE_MODIFIER[kind] },
  ]
  const firedArm = firedLocations.has('LA') || firedLocations.has('RA')
  let damage = 0
  let attackerDamage = 0

  if (isMechDestroyed(attacker)) reasons.push('’Mech destroyed')
  if (attacker.prone) reasons.push('Prone ’Mechs cannot make physical attacks')
  const armsLost = (['LA', 'RA'] as const).filter((loc) => isLocationDestroyed(attacker, loc))
  const legsLost = (['LL', 'RL'] as const).filter((loc) => isLocationDestroyed(attacker, loc))
  if (target.range !== 1) reasons.push('Target must be in an adjacent hex')

  // Level and prone target restrictions.
  const level = levelRule(kind, target)
  if (!level.allowed) reasons.push(target.prone ? 'Not allowed against this prone target' : 'Not allowed at this level difference')
  let table = defaultTable(kind, ctx)
  if (level.table && table) table = level.table
  if (kind === 'hatchet' && !level.table && ctx.hatchetTable !== 'standard')
    modifiers.push({ gator: 'O', label: `Hatchet uses ${ctx.hatchetTable} table`, value: 4 })

  // Water (p. 25).
  const attackerSubmerged = isSubmerged(attacker.waterDepth, attacker.prone)
  const targetSubmerged = isSubmerged(target.waterDepth, target.prone)
  const underwater = targetSubmerged && (attackerSubmerged || (kind === 'kick' && attacker.waterDepth >= 1))
  if (targetSubmerged && !underwater) reasons.push('Target is fully submerged: attack must begin underwater')
  if (kind === 'dfa' && attacker.waterDepth >= 2) reasons.push('Cannot DFA from Depth 2+ water')

  // Movement and target modifiers. Prone targets always count as adjacent.
  const movement = kind === 'dfa' ? 'jumped' : attacker.movement
  modifiers.push(...attackerMovementModifiers(movement, false))
  modifiers.push(...targetModifiers({ ...target, range: 1 }))
  if (target.immobile) modifiers.push({ gator: 'T', label: 'Immobile target', value: -4 })

  // Terrain: woods in the target hex (DFA ignores terrain).
  if (kind !== 'dfa') {
    if (target.terrain === 'light') modifiers.push({ gator: 'O', label: 'Target in light woods', value: 1 })
    if (target.terrain === 'heavy') modifiers.push({ gator: 'O', label: 'Target in heavy woods', value: 2 })
  }
  // Depth 1 water gives partial cover against physical attacks that could hit the legs.
  if (!target.prone && target.waterDepth === 1 && !attackerSubmerged && table === 'standard') {
    modifiers.push({ gator: 'O', label: 'Partial cover (Depth 1 water)', value: 1 })
    warnings.push('Partial cover: leg hits are ignored')
  }

  switch (kind) {
    case 'punch': {
      const loc = type === 'punchLA' ? 'LA' : 'RA'
      const arm = armOf(attacker, loc)
      const lost = destroyedReason(attacker, loc)
      if (lost && !isMechDestroyed(attacker)) reasons.push(lost)
      if (arm.shoulderHit) reasons.push('Shoulder actuator damaged')
      if (arm.hasHatchet) reasons.push('Arm carries a hatchet')
      if (firedLocations.has(loc)) reasons.push('Weapons in this arm fired this turn')
      if (target.arc !== 'front' && target.arc !== (loc === 'LA' ? 'left' : 'right')) reasons.push('Target not in forward or matching side arc')
      let halvings = 0
      if (arm.upperArmHit) {
        modifiers.push({ gator: 'O', label: 'Upper arm actuator damaged', value: 2 })
        halvings++
      }
      if (arm.lowerArmHit || !arm.hasLowerArm) {
        modifiers.push({ gator: 'O', label: arm.hasLowerArm ? 'Lower arm actuator damaged' : 'No lower arm actuator', value: 2 })
        halvings++
      }
      if (arm.handHit || !arm.hasHand) modifiers.push({ gator: 'O', label: arm.hasHand ? 'Hand actuator damaged' : 'No hand actuator', value: 1 })
      damage = Math.max(1, halve(Math.ceil(attacker.tonnage / 10), halvings))
      notes.push('Two punches may target different ’Mechs with no secondary target modifier')
      break
    }
    case 'kick': {
      const loc = type === 'kickLL' ? 'LL' : 'RL'
      const leg = legOf(attacker, loc)
      if (legsLost.length > 0 && !isMechDestroyed(attacker)) reasons.push('A leg is destroyed: no kicking attacks')
      if (attacker.leftLeg.hipHit || attacker.rightLeg.hipHit) reasons.push('Hip actuator damaged: no kicking attacks')
      if (firedLocations.has(loc)) reasons.push('Weapons in this leg fired this turn')
      if (target.legArc !== 'front') reasons.push('Target not in forward arc of the feet')
      let halvings = 0
      if (leg.upperLegHit) {
        modifiers.push({ gator: 'O', label: 'Upper leg actuator damaged', value: 2 })
        halvings++
      }
      if (leg.lowerLegHit) {
        modifiers.push({ gator: 'O', label: 'Lower leg actuator damaged', value: 2 })
        halvings++
      }
      if (leg.footHit) modifiers.push({ gator: 'O', label: 'Foot actuator damaged', value: 1 })
      damage = halve(Math.floor(attacker.tonnage / 5), halvings)
      notes.push('Target must make a PSR if kicked; attacker must make a PSR on a miss')
      break
    }
    case 'hatchet': {
      const loc = type === 'hatchetLA' ? 'LA' : 'RA'
      const arm = armOf(attacker, loc)
      const lost = destroyedReason(attacker, loc)
      if (lost && !isMechDestroyed(attacker)) reasons.push(lost)
      if (!arm.hasHatchet) reasons.push('No hatchet in this arm')
      if (arm.shoulderHit) reasons.push('Shoulder actuator damaged')
      if (arm.handHit) reasons.push('Hand actuator damaged')
      if (firedLocations.has(loc)) reasons.push('Weapons in this arm fired this turn')
      if (target.arc !== 'front' && target.arc !== (loc === 'LA' ? 'left' : 'right')) reasons.push('Target not in forward or matching side arc')
      if (arm.upperArmHit) modifiers.push({ gator: 'O', label: 'Upper arm actuator damaged', value: 2 })
      if (arm.lowerArmHit) modifiers.push({ gator: 'O', label: 'Lower arm actuator damaged', value: 2 })
      damage = Math.floor(attacker.tonnage / 5)
      break
    }
    case 'club': {
      if (armsLost.length > 0 && !isMechDestroyed(attacker)) reasons.push('Needs both arms')
      if (!attacker.hasClub) reasons.push('No club in hand')
      if (firedArm) reasons.push('Arm-mounted weapons fired this turn')
      if (attacker.leftArm.shoulderHit || attacker.rightArm.shoulderHit) reasons.push('Shoulder actuator damaged')
      const handsOk = [attacker.leftArm, attacker.rightArm].every((a) => a.hasHand && !a.handHit)
      if (!handsOk) reasons.push('Needs two undamaged hand actuators')
      if (target.arc !== 'front') reasons.push('Target not in forward arc')
      for (const [side, arm] of [['Left', attacker.leftArm], ['Right', attacker.rightArm]] as const) {
        if (arm.upperArmHit) modifiers.push({ gator: 'O', label: `${side} upper arm actuator damaged`, value: 2 })
        if (arm.lowerArmHit) modifiers.push({ gator: 'O', label: `${side} lower arm actuator damaged`, value: 2 })
      }
      damage = Math.floor(attacker.tonnage / 5)
      break
    }
    case 'push': {
      if (armsLost.length > 0 && !isMechDestroyed(attacker)) reasons.push('Push uses both arms')
      if (firedArm) reasons.push('Arm-mounted weapons fired this turn')
      if (target.prone) reasons.push('Target must be standing')
      if (target.levelDifference !== 0) reasons.push('Target must be at the same level')
      if (target.legArc !== 'front') reasons.push('Target must be directly in front of the feet')
      for (const [side, arm] of [['Left', attacker.leftArm], ['Right', attacker.rightArm]] as const) {
        if (arm.shoulderHit) modifiers.push({ gator: 'O', label: `${side} shoulder damaged`, value: 2 })
      }
      notes.push('No damage: target is displaced and must make a PSR')
      break
    }
    case 'charge': {
      if (attacker.movement === 'jumped') reasons.push('Cannot charge after jumping')
      if (firedLocations.size > 0) reasons.push('A charging ’Mech cannot make weapon attacks')
      modifiers.push({ gator: 'O', label: 'Comparative piloting (attacker – target)', value: attacker.piloting - target.piloting })
      damage = Math.ceil((attacker.tonnage / 10) * attacker.hexesMoved)
      attackerDamage = Math.ceil(target.tonnage / 10)
      if (attacker.hexesMoved === 0) warnings.push('Set hexes moved for charge damage')
      notes.push('Both ’Mechs make a PSR at +2 after a successful charge')
      break
    }
    case 'dfa': {
      if (attacker.movement !== 'jumped') reasons.push('Attacker must use jumping movement')
      if (firedLocations.size > 0) reasons.push('Cannot make weapon attacks in a DFA turn')
      modifiers.push({ gator: 'O', label: 'Comparative piloting (attacker – target)', value: attacker.piloting - target.piloting })
      damage = Math.ceil((attacker.tonnage / 10) * 3)
      attackerDamage = Math.ceil(attacker.tonnage / 5)
      notes.push('Hit: attacker PSR at +4, attacker damage on Kick table (front). Miss: attacker falls 2 levels, rear hits')
      break
    }
  }

  if (underwater && damage > 0) {
    damage = Math.floor(damage / 2)
    notes.push('Underwater: half damage')
  }

  const forceRear = kind === 'dfa' && target.prone
  if (forceRear) table = 'standard'

  const targetNumber = modifiers.reduce((s, m) => s + m.value, 0)
  if (targetNumber > 12) warnings.push('Target Number above 12: automatic miss (no PSR needed if not attempted)')
  const allowed = reasons.length === 0
  const grouped = kind === 'charge' || kind === 'dfa'
  return {
    type,
    name: PHYSICAL_ATTACK_NAMES[type],
    allowed,
    reasons,
    warnings,
    notes,
    modifiers: modifiers.filter((m) => m.value !== 0 || m.gator === 'G'),
    targetNumber,
    probability: allowed ? chanceToHit(targetNumber) : 0,
    damageGroups: damage <= 0 ? [] : grouped ? fivePointGroups(damage) : [damage],
    attackerDamageGroups: attackerDamage > 0 ? fivePointGroups(attackerDamage) : [],
    hitTable: table,
    forceRear,
  }
}
