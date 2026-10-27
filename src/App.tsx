import { useEffect, useMemo, useState } from 'react'
import { Switch } from './components/fields'
import { MechDialog } from './components/MechDialog'
import { StatusLine } from './components/StatusLine'
import { Typewriter } from './components/Typewriter'
import { LanceTabs } from './components/LanceTabs'
import { UnitView } from './components/UnitView'
import { newId } from './state/defaults'
import { buildMech, defaultMech, MECHS, OTHER_MECH } from './state/mechCatalog'
import { advanceTurn, initialLance, newUnit, normalizeLance, unitName, type LanceState, type UnitState } from './state/unit'
import { ModeContext, type AppMode } from './state/mode'
import { usePersistentState } from './state/usePersistentState'
import type { Attacker, MountedWeapon } from './rules/types'
import './App.css'

const MODES: { value: AppMode; label: string; title: string }[] = [
  { value: 'tracking', label: 'Track stats', title: 'Track ammo, armor and internal structure from turn to turn' },
  { value: 'plain', label: 'Plain 2D6', title: 'Only hit or miss on 2D6: ammo, armor and internal structure are not tracked' },
]

type Theme = 'light' | 'dark'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const App = () => {
  const [storedLance, setLance] = usePersistentState<LanceState>('btc-lance-v1', initialLance)
  const lance = useMemo(() => normalizeLance(storedLance), [storedLance])
  const updateLance = (update: (lance: LanceState) => LanceState) => setLance((l) => update(normalizeLance(l)))
  const active = lance.units.find((u) => u.id === lance.activeUnitId) ?? lance.units[0]

  const updateActive = (update: (unit: UnitState) => UnitState) =>
    updateLance((l) => ({ ...l, units: l.units.map((u) => (u.id === active.id ? update(u) : u)) }))

  const [mode, setMode] = usePersistentState<AppMode>('btc-mode', () => 'tracking')
  // index.html applies the saved theme before the first paint; this keeps it in sync.
  const [theme, setTheme] = usePersistentState<Theme>('btc-theme', () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'))
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  const [adding, setAdding] = useState(false)
  const numbered = ({ attacker, weapons }: ReturnType<typeof buildMech>) => ({
    attacker: { ...attacker, name: unitName(attacker.name, lance.units.map((u) => u.attacker.name)) },
    weapons,
  })
  const add = (attacker: Attacker, weapons: MountedWeapon[]) => {
    const unit = newUnit({ attacker, weapons })
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

  const newTurn = () => updateLance((l) => ({ ...l, units: l.units.map((u) => advanceTurn(u, mode === 'tracking')), turn: l.turn + 1 }))

  return (
    <ModeContext value={mode}>
    <div className="app">
      <header className="app-header">
        <div>
          <h1>
            <span className="crosshair" aria-hidden="true" />
            Targeting Computer
          </h1>
          <p className="subtitle">
            <Typewriter text="BattleTech: A Game of Armored Combat · attack phase calculator " />
          </p>
        </div>
        <div className="header-actions">
          <Switch label="Mode" value={mode} options={MODES} onChange={setMode} />
          <Switch label="Theme" value={theme} options={THEMES} onChange={setTheme} />
          <div className="turn-control">
            <button type="button" onClick={newTurn} title={`For every 'Mech: clear movement, apply projected heat${mode === 'tracking' ? ', spend ammo' : ''}, reset weapon fire`}>
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
          {...numbered(buildMech(defaultMech()))}
          models={MECHS}
          otherModel={OTHER_MECH}
          fromModel={(mech) => numbered(buildMech(mech))}
          targetId=""
          onSave={add}
          onClose={() => setAdding(false)}
        />
      )}

      <UnitView key={active.id} unit={active} onChange={updateActive} />

      <footer className="app-footer">
        <StatusLine lance={lance} />
        Roll 2D6 equal to or above the Target Number. TN ≤ 2 always hits; TN &gt; 12 always misses. Rules per the BattleTech box set rulebook.
        <p>
          <a href="https://github.com/nakkim/BattleTech-Targeting-Computer" target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </p>
      </footer>
    </div>
    </ModeContext>
  )
}

export default App
