import { useMemo, useState } from 'react'
import { MechDialog } from './components/MechDialog'
import { LanceTabs } from './components/LanceTabs'
import { UnitView } from './components/UnitView'
import { createAttacker, mountWeapons, newId } from './state/defaults'
import { HIGHLANDER_HGN_732 } from './state/presets'
import { advanceTurn, initialLance, newUnit, normalizeLance, type LanceState, type UnitState } from './state/unit'
import { usePersistentState } from './state/usePersistentState'
import type { Attacker, MountedWeapon } from './rules/types'
import './App.css'

const App = () => {
  const [storedLance, setLance] = usePersistentState<LanceState>('btc-lance-v1', initialLance)
  const lance = useMemo(() => normalizeLance(storedLance), [storedLance])
  const updateLance = (update: (lance: LanceState) => LanceState) => setLance((l) => update(normalizeLance(l)))
  const active = lance.units.find((u) => u.id === lance.activeUnitId) ?? lance.units[0]

  const updateActive = (update: (unit: UnitState) => UnitState) =>
    updateLance((l) => ({ ...l, units: l.units.map((u) => (u.id === active.id ? update(u) : u)) }))

  const [adding, setAdding] = useState(false)
  const add = (attacker: Attacker, weapons: MountedWeapon[]) => {
    const unit = newUnit({ attacker, weapons: weapons.map((w) => [w.weaponKey, w.location]) })
    updateLance((l) => ({ ...l, units: [...l.units, unit], activeUnitId: unit.id }))
  }

  const duplicate = () => {
    const copy: UnitState = {
      ...structuredClone(active),
      id: newId('u'),
      attacker: { ...structuredClone(active.attacker), name: `${active.attacker.name} (copy)` },
    }
    updateLance((l) => {
      const index = l.units.findIndex((u) => u.id === active.id)
      const units = [...l.units]
      units.splice(index + 1, 0, copy)
      return { ...l, units, activeUnitId: copy.id }
    })
  }

  const remove = (id: string) =>
    updateLance((l) => {
      const index = l.units.findIndex((u) => u.id === id)
      const units = l.units.filter((u) => u.id !== id)
      const activeUnitId = l.activeUnitId === id ? units[Math.max(0, index - 1)].id : l.activeUnitId
      return { ...l, units, activeUnitId }
    })

  const reset = () => {
    if (confirm('Reset the whole lance to defaults?')) setLance(initialLance())
  }

  const newTurn = () => updateLance((l) => ({ ...l, units: l.units.map(advanceTurn), turn: l.turn + 1 }))

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>
            <span className="crosshair" aria-hidden="true" />
            Targeting Computer
          </h1>
          <p className="subtitle">BattleTech: A Game of Armored Combat · attack phase calculator</p>
        </div>
        <div className="header-actions">
          <div className="turn-control">
            <button type="button" onClick={newTurn} title="For every 'Mech: clear movement, apply projected heat, reset weapon fire">
              Next turn
            </button>
            <span className="turn-counter" aria-live="polite">
              Turn {lance.turn}
            </span>
          </div>
          <button type="button" className="ghost" onClick={reset}>
            Reset
          </button>
        </div>
      </header>

      <LanceTabs
        units={lance.units}
        activeId={active.id}
        onSelect={(id) => updateLance((l) => ({ ...l, activeUnitId: id }))}
        onAdd={() => setAdding(true)}
        onDuplicate={duplicate}
        onRemove={remove}
      />

      {adding && (
        <MechDialog
          title="Add 'Mech to lance"
          submitLabel="Add 'Mech"
          attacker={createAttacker({ ...HIGHLANDER_HGN_732.attacker, name: `Highlander HGN-732 #${lance.units.length + 1}` })}
          weapons={mountWeapons(HIGHLANDER_HGN_732.weapons, '')}
          targetId=""
          onSave={add}
          onClose={() => setAdding(false)}
        />
      )}

      <UnitView key={active.id} unit={active} onChange={updateActive} />

      <footer className="app-footer">
        Roll 2D6 equal to or above the Target Number. TN ≤ 2 always hits; TN &gt; 12 always misses. Rules per the BattleTech box set rulebook.
      </footer>
    </div>
  )
}

export default App
