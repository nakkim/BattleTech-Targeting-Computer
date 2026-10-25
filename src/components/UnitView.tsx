import { useMemo } from 'react'
import { projectHeat } from '../rules/heat'
import { PHYSICAL_ATTACK_TYPES, resolvePhysicalAttack } from '../rules/physicalAttack'
import type { Location, Target } from '../rules/types'
import { firingWeapons } from '../rules/destruction'
import { checkTargets, resolveWeaponAttack, type WeaponAttackResult } from '../rules/weaponAttack'
import type { UnitState } from '../state/unit'
import { AttackerPanel, MechDataPanel } from './AttackerPanel'
import { HeatPanel } from './HeatPanel'
import { HitLocationPanel } from './HitLocationPanel'
import { PhysicalPanel } from './PhysicalPanel'
import { TargetDataPanel, TargetsPanel } from './TargetsPanel'
import { WeaponsPanel } from './WeaponsPanel'

interface Props {
  unit: UnitState
  onChange: (update: (unit: UnitState) => UnitState) => void
}

export const UnitView = ({ unit, onChange }: Props) => {
  const set = (patch: Partial<UnitState>) => onChange((u) => ({ ...u, ...patch }))
  const { attacker, targets, weapons, spotter } = unit

  const selectedTarget = targets.find((t) => t.id === unit.selectedTargetId) ?? targets[0]
  const physicalTarget = targets.find((t) => t.id === unit.physicalTargetId) ?? targets[0]

  const weaponResults = useMemo(() => {
    const map = new Map<string, WeaponAttackResult>()
    for (const w of weapons) {
      const target = targets.find((t) => t.id === w.targetId) ?? targets[0]
      map.set(w.id, resolveWeaponAttack(w, { attacker, target, spotter, attackerIsSpotting: unit.attackerIsSpotting }))
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
        <MechDataPanel attacker={attacker} onChange={(a) => set({ attacker: a })} />
        <AttackerPanel attacker={attacker} onChange={(a) => set({ attacker: a })} />
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
          attacker={attacker}
          weapons={weapons}
          results={weaponResults}
          targets={targets}
          spotter={spotter}
          attackerIsSpotting={unit.attackerIsSpotting}
          targetWarnings={targetWarnings}
          onChange={(w) => set({ weapons: w })}
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
          <HeatPanel current={attacker.heat} projection={heat} />
        </div>
      </div>
    </main>
  )
}
