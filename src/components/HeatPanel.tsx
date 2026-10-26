import { explosionDamage, heatExplosionCandidates } from '../rules/ammo'
import type { HeatProjection } from '../rules/heat'
import { heatEffects, workingHeatSinks } from '../rules/heat'
import { ammoExplosionAvoid, LOCATION_NAMES, WEAPONS_BY_KEY } from '../rules/tables'
import type { Attacker } from '../rules/types'
import { useTracking } from '../state/mode'
import { Panel } from './fields'

/** Which bin explodes if the heat explosion roll fails, and what it does. */
const AmmoAtRisk = ({ attacker, heat }: { attacker: Attacker; heat: number }) => {
  const avoid = ammoExplosionAvoid(heat)
  if (avoid === null) return null
  const bins = heatExplosionCandidates(attacker)
  if (bins.length === 0) return <p className="muted">Ammo explosion check at {heat} heat: no unemptied explosive ammo, so no roll.</p>
  return (
    <div className="ammo-risk msg-warn-text">
      <strong>
        Ammo explosion at {heat} heat: roll {avoid}+ on 2D6 to avoid.
      </strong>{' '}
      On a failure {bins.length > 1 ? 'one of these bins explodes (your choice)' : 'this bin explodes'}:
      <ul>
        {bins.map((b) => (
          <li key={b.id}>
            {WEAPONS_BY_KEY[b.weaponKey].name} ammo in the {LOCATION_NAMES[b.location].toLowerCase()} ({b.shots} shots):{' '}
            <strong>{explosionDamage(b)}</strong> damage to its internal structure
          </li>
        ))}
      </ul>
      Damage bypasses armor and transfers inward to internal structure. The MechWarrior takes 2 damage.
    </div>
  )
}

export const HeatPanel = ({ attacker, projection }: { attacker: Attacker; projection: HeatProjection }) => {
  const tracking = useTracking()
  const current = attacker.heat
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
          <span>Dissipation{attacker.heatSinkHits > 0 && ` (${workingHeatSinks(attacker)} of ${attacker.heatSinks} heat sinks)`}</span>
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
      {tracking && <AmmoAtRisk attacker={attacker} heat={projection.next} />}
    </Panel>
  )
}
