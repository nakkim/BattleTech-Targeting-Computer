import { isMechDestroyed } from '../rules/destruction'
import { projectHeat } from '../rules/heat'
import { rulesAttacker, useTracking } from '../state/mode'
import type { LanceState } from '../state/unit'

/** One-line system readout of the lance, e.g. "SYS OK · TURN 3 · 2 UNITS · MODE: TRACK · HEAT 4→9". */
export const StatusLine = ({ lance }: { lance: LanceState }) => {
  const tracking = useTracking()
  const active = lance.units.find((u) => u.id === lance.activeUnitId) ?? lance.units[0]
  const lost = lance.units.filter((u) => isMechDestroyed(u.attacker)).length
  const next = projectHeat(rulesAttacker(active.attacker, tracking), active.weapons).next
  const units = lance.units.length
  return (
    <div className="status-line">
      {lost > 0 ? <span className="status-alert">{lost} destroyed</span> : <span className="status-ok">Sys OK</span>}
      {` · Turn ${lance.turn} · ${units} ${units === 1 ? 'unit' : 'units'} · Mode: ${tracking ? 'track' : 'plain'} · Heat ${active.attacker.heat}→${next}`}
    </div>
  )
}
