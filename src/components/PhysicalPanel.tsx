import { useState } from 'react'
import { formatPercent } from '../rules/dice'
import { PHYSICAL_ATTACK_TYPES, type PhysicalAttackResult } from '../rules/physicalAttack'
import type { HitTable } from '../rules/tables'
import type { Target } from '../rules/types'
import { Messages, ModifierList, TargetNumber } from './Breakdown'
import { Panel, Segmented, Toggle } from './fields'

interface Props {
  results: PhysicalAttackResult[]
  targets: Target[]
  targetId: string
  hatchetTable: HitTable
  onTargetChange: (id: string) => void
  onHatchetTableChange: (table: HitTable) => void
}

const TABLE_NAMES: Record<HitTable, string> = { standard: 'Hit Location', punch: 'Punch', kick: 'Kick' }

function PhysicalRow({ result }: { result: PhysicalAttackResult }) {
  const [open, setOpen] = useState(false)
  const total = result.damageGroups.reduce((s, d) => s + d, 0)
  return (
    <li className={`weapon ${result.allowed ? '' : 'weapon-idle'}`}>
      <div className="weapon-main physical-main">
        <button type="button" className="weapon-name" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="caret">{open ? '▾' : '▸'}</span>
          <strong>{result.name}</strong>
        </button>
        {result.allowed ? (
          <>
            <span className="dmg">
              {total}
              <small>dmg</small>
            </span>
            <TargetNumber result={result} />
          </>
        ) : (
          <span className="idle-label">{result.reasons[0]}</span>
        )}
      </div>
      {open && (
        <div className="weapon-detail">
          <div className="weapon-stats">
            {result.damageGroups.length > 0 && <span>Damage {result.damageGroups.join(' + ')}</span>}
            {result.hitTable && (
              <span>
                {result.forceRear ? 'Hit Location (rear)' : TABLE_NAMES[result.hitTable]} table
              </span>
            )}
            {result.attackerDamageGroups.length > 0 && <span>Attacker takes {result.attackerDamageGroups.join(' + ')}</span>}
            {result.allowed && <span>Expected {(result.probability * total).toFixed(1)}</span>}
          </div>
          <Messages result={result} />
          {result.notes.length > 0 && (
            <ul className="messages">
              {result.notes.map((n) => (
                <li key={n} className="msg-note">
                  {n}
                </li>
              ))}
            </ul>
          )}
          <ModifierList modifiers={result.modifiers} />
          <div className="tn-total">
            Target Number <strong>{result.targetNumber}</strong> · {formatPercent(result.probability)}
          </div>
        </div>
      )}
    </li>
  )
}

export function PhysicalPanel({ results, targets, targetId, hatchetTable, onTargetChange, onHatchetTableChange }: Props) {
  const [showAll, setShowAll] = useState(false)
  const ordered = PHYSICAL_ATTACK_TYPES.map((t) => results.find((r) => r.type === t)!).filter(Boolean)
  const visible = showAll ? ordered : ordered.filter((r) => r.allowed)
  const hidden = ordered.length - visible.length

  return (
    <Panel title="Physical attacks" className="physical">
      <div className="grid-2">
        <label className="field">
          <span className="field-label">Target</span>
          <select value={targetId} onChange={(e) => onTargetChange(e.target.value)}>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <Segmented
          label="Hatchet hit table"
          value={hatchetTable}
          options={[
            { value: 'standard', label: 'Normal' },
            { value: 'punch', label: 'Punch +4' },
            { value: 'kick', label: 'Kick +4' },
          ]}
          onChange={onHatchetTableChange}
        />
      </div>
      <p className="muted small-text">One physical attack type per turn (two punches count as one). Heat and sensor modifiers never apply.</p>
      {visible.length === 0 ? (
        <p className="empty">
          {(targets.find((t) => t.id === targetId)?.range ?? 1) > 1
            ? 'Target is not adjacent: physical attacks need range 1.'
            : 'No physical attacks possible against this target.'}
        </p>
      ) : (
        <ul className="weapon-list">
          {visible.map((r) => (
            <PhysicalRow key={r.type} result={r} />
          ))}
        </ul>
      )}
      {(hidden > 0 || showAll) && (
        <Toggle label={`Show unavailable attacks${hidden > 0 ? ` (${hidden})` : ''}`} checked={showAll} onChange={setShowAll} />
      )}
    </Panel>
  )
}
