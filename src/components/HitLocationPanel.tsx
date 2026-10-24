import { useState } from 'react'
import { formatPercent } from '../rules/dice'
import { ARC_NAMES, CLUSTER_HITS_TABLE, CLUSTER_SIZES, hitLocationChances, LOCATION_NAMES, type HitTable } from '../rules/tables'
import type { Target } from '../rules/types'
import { hasPartialCover } from '../rules/weaponAttack'
import { Panel, Segmented } from './fields'

interface Props {
  target: Target
}

export function HitLocationPanel({ target }: Props) {
  const [table, setTable] = useState<HitTable>('standard')
  const chances = hitLocationChances(table, target.attackDirection)
  const cover = hasPartialCover(target)
  const max = Math.max(...chances.map((c) => c.probability))

  return (
    <Panel title="Hit location" className="hitloc">
      <p className="muted small-text">
        {target.name}: attack strikes the <strong>{ARC_NAMES[target.attackDirection].toLowerCase()}</strong>
        {target.attackDirection === 'rear' ? ' (rear armor)' : ''}.
        {cover && table === 'standard' ? ' Partial cover: leg results hit the cover.' : ''}
      </p>
      <Segmented
        label="Table"
        value={table}
        options={[
          { value: 'standard', label: 'Hit Location 2D6' },
          { value: 'punch', label: 'Punch 1D6' },
          { value: 'kick', label: 'Kick 1D6' },
        ]}
        onChange={setTable}
      />
      <ul className="hit-bars">
        {chances.map((c) => {
          const blocked = cover && table === 'standard' && (c.location === 'LL' || c.location === 'RL')
          return (
            <li key={c.location} className={blocked ? 'blocked' : ''}>
              <span className="hit-name">
                {LOCATION_NAMES[c.location]}
                {c.rear && c.location !== 'HD' && c.location.endsWith('T') ? ' (rear)' : ''}
              </span>
              <span className="hit-rolls">{c.rolls.join(', ')}</span>
              <span className="bar">
                <span style={{ width: `${(c.probability / max) * 100}%` }} />
              </span>
              <span className="hit-pct">{formatPercent(c.probability)}</span>
            </li>
          )
        })}
      </ul>
      {table === 'standard' && <p className="muted small-text">A roll of 2 may cause a through-armor critical hit.</p>}

      <details className="damage">
        <summary>Cluster Hits Table</summary>
        <div className="table-scroll">
          <table className="cluster">
            <thead>
              <tr>
                <th>2D6</th>
                {CLUSTER_SIZES.map((s) => (
                  <th key={s}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 11 }, (_, i) => (
                <tr key={i}>
                  <th>{i + 2}</th>
                  {CLUSTER_SIZES.map((s) => (
                    <td key={s}>{CLUSTER_HITS_TABLE[s][i]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small-text">SRMs: one hit location per missile (2 dmg each). LRMs: one hit location per 5-missile group.</p>
      </details>
    </Panel>
  )
}
