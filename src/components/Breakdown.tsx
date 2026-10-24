import { formatPercent } from '../rules/dice'
import type { AttackResult, Modifier } from '../rules/types'

const GATOR_TITLES = { G: 'Gunnery / base', A: 'Attacker', T: 'Target', O: 'Other', R: 'Range' }

export function ModifierList({ modifiers }: { modifiers: Modifier[] }) {
  return (
    <ul className="modifiers">
      {modifiers.map((m, i) => (
        <li key={i}>
          <span className={`gator gator-${m.gator}`} title={GATOR_TITLES[m.gator]}>
            {m.gator}
          </span>
          <span className="mod-label">{m.label}</span>
          <span className="mod-value">{i === 0 ? m.value : m.value > 0 ? `+${m.value}` : m.value < 0 ? `–${-m.value}` : '±0'}</span>
        </li>
      ))}
    </ul>
  )
}

export function TargetNumber({ result }: { result: AttackResult }) {
  if (!result.allowed) return <span className="tn tn-blocked">—</span>
  const tn = result.targetNumber
  const cls = tn > 12 ? 'tn-miss' : tn <= 6 ? 'tn-good' : tn <= 9 ? 'tn-ok' : 'tn-bad'
  return (
    <span className={`tn ${cls}`}>
      <span className="tn-number">{tn <= 2 ? 'AUTO' : tn > 12 ? 'MISS' : `${tn}+`}</span>
      <span className="tn-pct">{formatPercent(result.probability)}</span>
    </span>
  )
}

export function Messages({ result }: { result: AttackResult }) {
  if (result.reasons.length === 0 && result.warnings.length === 0) return null
  return (
    <ul className="messages">
      {result.reasons.map((r) => (
        <li key={r} className="msg-error">
          {r}
        </li>
      ))}
      {result.warnings.map((w) => (
        <li key={w} className="msg-warn">
          {w}
        </li>
      ))}
    </ul>
  )
}
