import { Fragment, useState } from 'react'
import { availableBins, explosionDamage } from '../rules/ammo'
import { applyDamage, armorLeft, damageTotals, explodeAmmo, REAR_FACING, structureLeft, structureOf, type DamageResult, type DamageStep } from '../rules/damage'
import { destroyedReason, hasLocation, isMechDestroyed } from '../rules/destruction'
import { LOCATION_NAMES, LOCATIONS, WEAPONS_BY_KEY } from '../rules/tables'
import type { ArmorFacing, Attacker, Location } from '../rules/types'
import { newId } from '../state/defaults'
import { CollapsiblePanel, NumberField, Toggle } from './fields'

interface Props {
  attacker: Attacker
  /** Phase new damage counts toward for Piloting Skill Rolls, e.g. "Weapon Attack Phase". */
  damagePhase: string
  onChange: (attacker: Attacker) => void
  /** The MechWarrior takes damage from a hit (head hit, ammo explosion); null takes it back on Undo. */
  onPilotDamage: (source: string, damage: { reason: string; amount: number } | null) => void
  /** A hit location roll of 2 checks the location for a critical hit; null takes it back on Undo. */
  onThroughArmor: (source: string, location: Location | null) => void
}

/** Fields a hit changes, kept so the last hit can be undone. */
type DamageFields = Pick<Attacker, 'armorDamage' | 'structureDamage' | 'destroyedLocations' | 'ammoBins'>

interface LastHit {
  id: string
  /** E.g. "12 to the left torso (rear)". */
  label: string
  result: DamageResult<Attacker>
  before: DamageFields
  explosion: boolean
}

const pick = ({ armorDamage, structureDamage, destroyedLocations, ammoBins }: Attacker): DamageFields => ({ armorDamage, structureDamage, destroyedLocations, ammoBins })

const Remaining = ({ left, max }: { left: number; max: number }) => (
  <span className={left === 0 && max > 0 ? 'value-gone' : left < max ? 'value-damaged' : ''}>
    {left}/{max}
  </span>
)

/** One hit of a report: what each location took, in order. */
export interface HitGroup {
  /** Shown above the group when a report has several hits, e.g. "5 to the center torso". */
  label?: string
  steps: DamageStep[]
  lost: number
}

interface HitReportProps {
  label: string
  groups: HitGroup[]
  /** An ammo explosion, which also injures the MechWarrior. */
  explosion: boolean
  /** The 'Mech after the hit. */
  attacker: Attacker
  onUndo: () => void
}

/** What each location took from one hit. Damage after the first location transferred inward. */
const StepItems = ({ steps }: { steps: DamageStep[] }) =>
  steps.map((s, i) => (
    <li key={i} className={s.destroyed ? 'msg-error' : s.structure > 0 ? 'msg-warn' : 'msg-note'}>
      {i > 0 && 'Transferred: '}
      {LOCATION_NAMES[s.location]}
      {s.facing && s.facing !== s.location && ' (rear)'}
      {': '}
      {[s.facing ? `${s.armor} armor` : 'armor bypassed', (s.structure > 0 || !s.facing) && `${s.structure} internal structure`].filter(Boolean).join(', ')}
      {s.destroyed ? ' — destroyed.' : '.'}
      {s.structure > 0 && !s.destroyed && ' Roll for a critical hit.'}
      {s.destroyed && (s.location === 'LT' || s.location === 'RT') && ' The arm is blown off.'}
    </li>
  ))

/** What a hit, or several, did location by location. */
export const HitReport = ({ label, groups, explosion, attacker, onUndo }: HitReportProps) => {
  const steps = groups.flatMap((g) => g.steps)
  const lost = groups.reduce((sum, g) => sum + g.lost, 0)
  return (
    <div className="hit-report">
      <div className="hit-report-header">
        <strong>{label}</strong>
        <button type="button" className="small ghost" onClick={onUndo} title="Restore armor, internal structure, destroyed locations and ammo from before this hit">
          Undo
        </button>
      </div>
      <ul className="messages">
        {groups.map((g, i) => (
          <Fragment key={i}>
            {g.label && <li className="hit-group-label">{g.label}</li>}
            <StepItems steps={g.steps} />
          </Fragment>
        ))}
        {explosion && <li className="msg-warn">The MechWarrior takes 2 damage from the feedback.</li>}
        {!explosion && steps.some((s) => s.location === 'HD') && <li className="msg-warn">Head hit: the MechWarrior takes 1 damage.</li>}
        {isMechDestroyed(attacker) && (
          <li className="msg-error">
            {attacker.destroyedLocations.includes('HD')
              ? 'Head destroyed: the MechWarrior is killed.'
              : `Center torso destroyed: the ’Mech is destroyed${explosion ? ' and the MechWarrior is killed' : ''}.`}
          </li>
        )}
        {lost > 0 && <li className="muted">{lost} damage left over.</li>}
      </ul>
    </div>
  )
}

/** Armor and internal structure of the 'Mech, with damage applied hit by hit. */
export const DamagePanel = ({ attacker, damagePhase, onChange, onPilotDamage, onThroughArmor }: Props) => {
  const locations = LOCATIONS.filter((l) => hasLocation(attacker, l))
  const [location, setLocation] = useState<Location>('CT')
  const [amount, setAmount] = useState(5)
  const [rear, setRear] = useState(false)
  const [throughArmor, setThroughArmor] = useState(false)
  const [binId, setBinId] = useState('')
  const [lastHit, setLastHit] = useState<LastHit | null>(null)

  const at = locations.includes(location) ? location : 'CT'
  const bins = availableBins(attacker).filter((b) => explosionDamage(b) > 0)
  const bin = bins.find((b) => b.id === binId) ?? bins[0]
  const totals = damageTotals(attacker)
  const destroyed = isMechDestroyed(attacker)

  const record = (label: string, result: DamageResult<Attacker>, explosion = false) => {
    const id = newId('h')
    setLastHit({ id, label, result, before: pick(attacker), explosion })
    onChange(result.attacker)
    // Ammo explosions injure the MechWarrior; so does any hit to the head (p. 44).
    if (explosion) onPilotDamage(id, { reason: 'Ammo explosion', amount: 2 })
    else if (result.steps.some((s) => s.location === 'HD')) onPilotDamage(id, { reason: 'Head hit', amount: 1 })
    // A location roll of 2 checks the location the damage lands in, a destroyed side torso passing it to the center torso.
    if (!explosion && throughArmor && result.steps.length) onThroughArmor(id, result.steps[0].location)
  }
  const hit = () => record(`${amount} damage to the ${LOCATION_NAMES[at].toLowerCase()}${rear ? ' (rear)' : ''}`, applyDamage(attacker, at, amount, { rear }))
  const explode = () => {
    if (!bin) return
    record(`${WEAPONS_BY_KEY[bin.weaponKey].name} ammo explodes for ${explosionDamage(bin)}`, explodeAmmo(attacker, bin.id), true)
  }
  const undo = () => {
    if (!lastHit) return
    onChange({ ...attacker, ...lastHit.before })
    onPilotDamage(lastHit.id, null)
    onThroughArmor(lastHit.id, null)
    setLastHit(null)
  }
  const repair = () => {
    setLastHit(null)
    onChange({ ...attacker, armorDamage: {}, structureDamage: {}, destroyedLocations: [] })
  }

  const facingCell = (facing: ArmorFacing | undefined, gone: boolean) => {
    if (!facing) return <td className="muted">–</td>
    return <td>{gone ? <span className="value-gone">0/{attacker.armor[facing]}</span> : <Remaining left={armorLeft(attacker, facing)} max={attacker.armor[facing]} />}</td>
  }

  return (
    <CollapsiblePanel
      id="damage"
      title="Armor & structure"
      className="damage-panel"
      actions={
        <button type="button" className="small ghost" onClick={repair} title="Restore all armor and internal structure, and clear destroyed locations">
          Repair
        </button>
      }
      summary={
        <>
          Armor {totals.armor}/{totals.armorMax} · IS {totals.structure}/{totals.structureMax}
        </>
      }
    >
      <table className="armor-table">
        <thead>
          <tr>
            <th>Location</th>
            <th>Armor</th>
            <th>Rear</th>
            <th>Internal</th>
          </tr>
        </thead>
        <tbody>
          {LOCATIONS.map((l) => {
            if (!hasLocation(attacker, l))
              return (
                <tr key={l} className="row-absent">
                  <th>{LOCATION_NAMES[l]}</th>
                  <td colSpan={3} className="muted">
                    None
                  </td>
                </tr>
              )
            const reason = destroyedReason(attacker, l)
            return (
              <tr key={l} className={reason ? 'row-destroyed' : ''} title={reason ?? undefined}>
                <th>{LOCATION_NAMES[l]}</th>
                {facingCell(l, !!reason)}
                {facingCell(REAR_FACING[l], !!reason)}
                <td>{reason ? <span className="value-gone">0/{structureOf(attacker.tonnage, l)}</span> : <Remaining left={structureLeft(attacker, l)} max={structureOf(attacker.tonnage, l)} />}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <fieldset className="limb apply-damage" disabled={destroyed}>
        <legend>Take damage</legend>
        <div className="grid-3">
          <label className="field">
            <span className="field-label">Location</span>
            <select value={at} onChange={(e) => setLocation(e.target.value as Location)}>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {LOCATION_NAMES[l]}
                </option>
              ))}
            </select>
          </label>
          <NumberField label="Damage" value={amount} onChange={setAmount} min={1} max={999} />
        </div>
        <div className="toggles">
          <Toggle label="From the rear" checked={rear} onChange={setRear} title="Torsos take the hit on their rear armor, also when it transfers inward" />
          <Toggle label="Hit location roll of 2" checked={throughArmor} onChange={setThroughArmor} title="A through-armor critical hit: the location checks for critical hits even if no internal structure was damaged" />
          <button type="button" onClick={hit} title="Armor first, then internal structure. Damage to a destroyed location transfers inward.">
            Apply
          </button>
        </div>
        {bins.length > 0 && bin && (
          <div className="explode-ammo">
            <select value={bin.id} onChange={(e) => setBinId(e.target.value)} aria-label="Ammo bin" title="Ammo bin hit by a critical hit or exploded by heat">
              {bins.map((b) => (
                <option key={b.id} value={b.id}>
                  {WEAPONS_BY_KEY[b.weaponKey].name} · {b.location} · {b.shots} shots ({explosionDamage(b)})
                </option>
              ))}
            </select>
            <button type="button" className="danger" onClick={explode} title="Damage goes to internal structure, bypassing armor, and transfers inward. The MechWarrior takes 2 damage.">
              Explode ammo
            </button>
          </div>
        )}
        <p className="muted small-text">Damage counts toward the {damagePhase} for Piloting Skill Rolls.</p>
      </fieldset>
      {lastHit && <HitReport label={lastHit.label} groups={[lastHit.result]} explosion={lastHit.explosion} attacker={lastHit.result.attacker} onUndo={undo} />}
    </CollapsiblePanel>
  )
}
