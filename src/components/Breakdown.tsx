import { formatPercent } from '../rules/dice'
import type { AttackResult, Modifier } from '../rules/types'

const GATOR_TITLES = { G: 'Gunnery / base', A: 'Attacker', T: 'Target', O: 'Other', R: 'Range' }

export const ModifierList = ({ modifiers }: { modifiers: Modifier[] }) => {
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

export const TargetNumber = ({ result }: { result: AttackResult }) => {
  if (!result.allowed)
    return (
      <span className="tn tn-blocked" title={`Cannot attack: ${result.reasons.join('; ')}`}>
        —
      </span>
    )
  const tn = result.targetNumber
  const cls = tn > 12 ? 'tn-miss' : tn <= 6 ? 'tn-good' : tn <= 9 ? 'tn-ok' : 'tn-bad'
  const title =
    tn <= 2
      ? `Target Number ${tn}: automatic hit`
      : tn > 12
        ? `Target Number ${tn}: above 12, automatic miss`
        : `Target Number ${tn}: roll ${tn} or higher on 2D6 (${formatPercent(result.probability)} chance to hit)`
  return (
    <span className={`tn ${cls}`} title={title}>
      <span className="tn-number">{tn <= 2 ? 'AUTO' : tn > 12 ? 'MISS' : `${tn}+`}</span>
      <span className="tn-pct">{formatPercent(result.probability)}</span>
    </span>
  )
}

export const Messages = ({ result }: { result: AttackResult }) => {
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
