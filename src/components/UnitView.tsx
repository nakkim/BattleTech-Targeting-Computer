import { useMemo, useState } from 'react'
import { projectHeat } from '../rules/heat'
import { PHYSICAL_ATTACK_TYPES, resolvePhysicalAttack } from '../rules/physicalAttack'
import type { Location, Target } from '../rules/types'
import { drawAmmo, firingWeapons } from '../rules/ammo'
import { declaredWeapons } from '../rules/destruction'
import { checkTargets, resolveWeaponAttack, type WeaponAttackResult } from '../rules/weaponAttack'
import { rulesAttacker, useTracking } from '../state/mode'
import { applyFallDamage, enterFallRoll, enterHeatRoll, explodeHeatAmmo, undoFallDamage, undoHeatExplosion, type UnitState } from '../state/unit'
import { AttackerPanel, MechDataPanel } from './AttackerPanel'
import { DamagePanel } from './DamagePanel'
import { HeatPanel } from './HeatPanel'
import { HitLocationPanel } from './HitLocationPanel'
import { MechDialog } from './MechDialog'
import { PhysicalPanel } from './PhysicalPanel'
import { TargetDataPanel, TargetsPanel } from './TargetsPanel'
import { WeaponsPanel } from './WeaponsPanel'

interface Props {
  unit: UnitState
  onChange: (update: (unit: UnitState) => UnitState) => void
}

export const UnitView = ({ unit, onChange }: Props) => {
  const set = (patch: Partial<UnitState>) => onChange((u) => ({ ...u, ...patch }))
  const { targets, weapons, spotter } = unit
  const tracking = useTracking()
  // Rules see no ammo bins in plain mode; edits still go to the stored attacker.
  const attacker = rulesAttacker(unit.attacker, tracking)
  const [editing, setEditing] = useState(false)

  const selectedTarget = targets.find((t) => t.id === unit.selectedTargetId) ?? targets[0]
  const physicalTarget = targets.find((t) => t.id === unit.physicalTargetId) ?? targets[0]

  const weaponResults = useMemo(() => {
    const map = new Map<string, WeaponAttackResult>()
    const { empty } = drawAmmo(attacker, declaredWeapons(attacker, weapons))
    for (const w of weapons) {
      const target = targets.find((t) => t.id === w.targetId) ?? targets[0]
      map.set(w.id, resolveWeaponAttack(w, { attacker, target, spotter, attackerIsSpotting: unit.attackerIsSpotting, outOfAmmo: empty.has(w.id) }))
    }
    return map
  }, [weapons, targets, attacker, spotter, unit.attackerIsSpotting])

  const targetWarnings = useMemo(() => {
    const used = new Set(firingWeapons(attacker, weapons).map((w) => w.targetId))
    return checkTargets(targets, used).warnings
  }, [attacker, weapons, targets])

  const physicalResults = useMemo(() => {
    const firedLocations = new Set<Location>(firingWeapons(attacker, weapons).map((w) => w.location))
    return PHYSICAL_ATTACK_TYPES.map((type) =>
      resolvePhysicalAttack(type, { attacker, target: physicalTarget, firedLocations, hatchetTable: unit.hatchetTable }),
    )
  }, [attacker, physicalTarget, weapons, unit.hatchetTable])

  const heat = useMemo(() => projectHeat(attacker, weapons), [attacker, weapons])

  const updateTargets = (next: Target[]) => {
    const ids = new Set(next.map((t) => t.id))
    const fallback = next.find((t) => t.primary)?.id ?? next[0].id
    set({
      targets: next,
      weapons: weapons.map((w) => (ids.has(w.targetId) ? w : { ...w, targetId: fallback })),
      physicalTargetId: ids.has(unit.physicalTargetId) ? unit.physicalTargetId : fallback,
    })
  }

  return (
    <main className="layout">
      <div className="col col-setup">
        <MechDataPanel attacker={attacker} onEdit={() => setEditing(true)} />
        {editing && (
          <MechDialog
            title="Edit 'Mech"
            submitLabel="Save"
            attacker={unit.attacker}
            weapons={weapons}
            targetId={(targets.find((t) => t.primary) ?? targets[0]).id}
            onSave={(a, w) => set({ attacker: a, weapons: w })}
            onClose={() => setEditing(false)}
          />
        )}
        <AttackerPanel attacker={unit.attacker} onChange={(a) => set({ attacker: a })} />
        {tracking && <DamagePanel attacker={unit.attacker} onChange={(a) => set({ attacker: a })} />}
        <TargetsPanel
          targets={targets}
          selectedId={selectedTarget.id}
          attacker={attacker}
          weapons={weapons}
          onSelect={(id) => set({ selectedTargetId: id })}
          onChange={updateTargets}
        />
        <TargetDataPanel
          target={selectedTarget}
          onChange={(t) => updateTargets(targets.map((x) => (x.id === t.id ? t : x)))}
        />
      </div>
      <div className="col col-results">
        <WeaponsPanel
          attacker={unit.attacker}
          weapons={weapons}
          results={weaponResults}
          targets={targets}
          spotter={spotter}
          attackerIsSpotting={unit.attackerIsSpotting}
          targetWarnings={targetWarnings}
          onChange={(w) => set({ weapons: w })}
          onAttackerChange={(a) => set({ attacker: a })}
          onSpotterChange={(s) => set({ spotter: s })}
          onSpottingChange={(v) => set({ attackerIsSpotting: v })}
        />
        <PhysicalPanel
          results={physicalResults}
          targets={targets}
          targetId={physicalTarget.id}
          hatchetTable={unit.hatchetTable}
          onTargetChange={(id) => set({ physicalTargetId: id })}
          onHatchetTableChange={(t) => set({ hatchetTable: t })}
        />
        <div className="grid-results">
          <HitLocationPanel target={selectedTarget} />
          <HeatPanel
            attacker={unit.attacker}
            projection={heat}
            phase={unit.heatPhase}
            phaseActions={{
              onRoll: (roll, value) => onChange((u) => enterHeatRoll(u, roll, value)),
              onExplode: (binId) => onChange((u) => explodeHeatAmmo(u, binId)),
              onUndoExplosion: () => onChange(undoHeatExplosion),
              onFallRoll: (roll, value) => onChange((u) => enterFallRoll(u, roll, value)),
              onApplyFall: () => onChange(applyFallDamage),
              onUndoFall: () => onChange(undoFallDamage),
            }}
          />
        </div>
      </div>
    </main>
  )
}
