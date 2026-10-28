import { explosionDamage, heatExplosionCandidates } from '../rules/ammo'
import type { HeatProjection } from '../rules/heat'
import { heatEffects, workingHeatSinks } from '../rules/heat'
import { ammoExplosionAvoid, LOCATION_NAMES, WEAPONS_BY_KEY } from '../rules/tables'
import type { Attacker } from '../rules/types'
import { pendingHeatSteps, type HeatPhase } from '../rules/heatPhase'
import { useTracking } from '../state/mode'
import { CollapsiblePanel, Status } from './fields'
import { HeatPhaseRolls, type HeatPhaseActions } from './HeatPhaseRolls'

/** Which bin explodes if the heat explosion roll fails, and what it does. */
const AmmoAtRisk = ({ attacker, heat }: { attacker: Attacker; heat: number }) => {
  const avoid = ammoExplosionAvoid(heat)
  if (avoid === null) return null
  const bins = heatExplosionCandidates(attacker)
  if (bins.length === 0) return <p className="muted">Heat {heat} after this turn: no unemptied explosive ammo, so no ammo explosion roll.</p>
  return (
    <div className="ammo-risk msg-warn-text">
      <strong>
        Heat {heat} after this turn: the Heat Phase needs {avoid}+ on 2D6 to avoid an ammo explosion.
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

interface HeatPanelProps {
  attacker: Attacker
  projection: HeatProjection
  /** Rolls of the last Heat Phase, null before the first. */
  phase: HeatPhase | null
  phaseActions: HeatPhaseActions
}

export const HeatPanel = ({ attacker, projection, phase, phaseActions }: HeatPanelProps) => {
  const tracking = useTracking()
  const current = attacker.heat
  const now = heatEffects(current)
  const level = Math.min(30, projection.next)
  const pending = tracking && phase ? pendingHeatSteps(phase) : 0
  return (
    <CollapsiblePanel
      id="heat"
      title="Heat"
      className="heat"
      summary={
        <>
          <Status tone={projection.next >= 14 ? 'bad' : projection.next >= 5 ? 'warn' : 'ok'}>
            Heat {current} → {projection.next}
          </Status>
          {pending > 0 && (
            <>
              {' · '}
              <Status tone="warn">{pending} to resolve</Status>
            </>
          )}
        </>
      }
    >
      {phase && <HeatPhaseRolls phase={phase} attacker={attacker} tracking={tracking} {...phaseActions} />}
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
    </CollapsiblePanel>
  )
}
