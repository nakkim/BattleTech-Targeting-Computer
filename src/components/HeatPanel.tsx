import type { HeatProjection } from '../rules/heat'
import { heatEffects } from '../rules/heat'
import { Panel } from './fields'

export const HeatPanel = ({ current, projection }: { current: number; projection: HeatProjection }) => {
  const now = heatEffects(current)
  const level = Math.min(30, projection.next)
  return (
    <Panel title="Heat" className="heat">
      <div className="heat-gauge" aria-label={`Projected heat ${projection.next}`}>
        <span className="heat-fill" style={{ width: `${(level / 30) * 100}%` }} />
        {[5, 8, 13, 14, 17, 19, 24, 30].map((mark) => (
          <span key={mark} className="heat-mark" style={{ left: `${(mark / 30) * 100}%` }} />
        ))}
      </div>
      <ul className="heat-lines">
        <li>
          <span>Current heat</span>
          <span>{current}</span>
        </li>
        {projection.lines.map((l, i) => (
          <li key={i}>
            <span>{l.label}</span>
            <span>+{l.value}</span>
          </li>
        ))}
        <li>
          <span>Dissipation</span>
          <span>–{projection.dissipated}</span>
        </li>
        <li className="heat-total">
          <span>Projected after Heat Phase</span>
          <span>{projection.next}</span>
        </li>
      </ul>
      <div className="heat-effects">
        <div>
          <h3>Now</h3>
          {now.length ? (
            <ul>
              {now.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No effects</p>
          )}
        </div>
        <div>
          <h3>Next turn</h3>
          {projection.effects.length ? (
            <ul>
              {projection.effects.map((e) => (
                <li key={e} className="msg-warn-text">
                  {e}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No effects</p>
          )}
        </div>
      </div>
    </Panel>
  )
}
