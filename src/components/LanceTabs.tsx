import { projectHeat } from '../rules/heat'
import type { UnitState } from '../state/unit'

interface Props {
  units: UnitState[]
  activeId: string
  onSelect: (id: string) => void
  onAdd: () => void
  onDuplicate: () => void
  onRemove: (id: string) => void
}

export function LanceTabs({ units, activeId, onSelect, onAdd, onDuplicate, onRemove }: Props) {
  return (
    <nav className="lance-tabs" aria-label="Lance">
      <div className="lance-tablist" role="tablist">
        {units.map((u) => {
          const heat = projectHeat(u.attacker, u.weapons).next
          const firing = u.weapons.filter((w) => w.fire).length
          const active = u.id === activeId
          return (
            <div key={u.id} className={`lance-tab ${active ? 'active' : ''}`}>
              <button type="button" role="tab" aria-selected={active} className="lance-tab-main" onClick={() => onSelect(u.id)}>
                <span className="lance-tab-name">{u.attacker.name || 'Unnamed'}</span>
                <span className="lance-tab-meta">
                  <span title="Weapons firing">{firing} wpn</span>
                  <span className={heat >= 8 ? 'hot' : ''} title="Heat now → after Heat Phase">
                    H {u.attacker.heat}→{heat}
                  </span>
                </span>
              </button>
              {units.length > 1 && (
                <button
                  type="button"
                  className="lance-tab-close"
                  aria-label={`Remove ${u.attacker.name}`}
                  title="Remove from lance"
                  onClick={() => {
                    if (confirm(`Remove ${u.attacker.name || 'this unit'} from the lance?`)) onRemove(u.id)
                  }}
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>
      <div className="lance-actions">
        <button type="button" className="small" onClick={onAdd}>
          + Add &apos;Mech
        </button>
        <button type="button" className="small ghost" onClick={onDuplicate} title="Copy the selected 'Mech">
          Duplicate
        </button>
      </div>
    </nav>
  )
}
