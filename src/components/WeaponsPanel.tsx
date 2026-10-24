import { useState } from 'react'
import { AIMED_SHOT_CHANCE, type WeaponAttackResult } from '../rules/weaponAttack'
import { formatPercent } from '../rules/dice'
import { isLrm, LOCATION_NAMES, LOCATIONS, MOVEMENT_NAMES, WEAPONS, WEAPONS_BY_KEY } from '../rules/tables'
import type { Location, MountedWeapon, MovementMode, Spotter, Target } from '../rules/types'
import { newWeapon } from '../state/defaults'
import { Messages, ModifierList, TargetNumber } from './Breakdown'
import { Panel, Segmented, Toggle } from './fields'

interface Props {
  weapons: MountedWeapon[]
  results: Map<string, WeaponAttackResult>
  targets: Target[]
  spotter: Spotter
  attackerIsSpotting: boolean
  targetWarnings: string[]
  onChange: (weapons: MountedWeapon[]) => void
  onSpotterChange: (spotter: Spotter) => void
  onSpottingChange: (spotting: boolean) => void
}

const MOVEMENT_OPTIONS = (Object.keys(MOVEMENT_NAMES) as MovementMode[]).map((m) => ({ value: m, label: MOVEMENT_NAMES[m] }))

function bracketLabel(r: WeaponAttackResult): string {
  return r.bracket === 'out' ? 'OUT' : r.bracket.toUpperCase()
}

function WeaponRow({
  weapon,
  result,
  targets,
  onChange,
  onRemove,
}: {
  weapon: MountedWeapon
  result: WeaponAttackResult | undefined
  targets: Target[]
  onChange: (w: MountedWeapon) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const spec = WEAPONS_BY_KEY[weapon.weaponKey]
  const target = targets.find((t) => t.id === weapon.targetId)
  const set = (patch: Partial<MountedWeapon>) => onChange({ ...weapon, ...patch })
  const canAim = target?.immobile && spec.category !== 'missile'

  return (
    <li className={`weapon ${weapon.fire ? '' : 'weapon-idle'} ${result && !result.allowed && weapon.fire ? 'weapon-blocked' : ''}`}>
      <div className="weapon-main">
        <input type="checkbox" checked={weapon.fire} onChange={(e) => set({ fire: e.target.checked })} aria-label={`Fire ${spec.name}`} />
        <button type="button" className="weapon-name" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="caret">{open ? '▾' : '▸'}</span>
          <strong>{spec.name}</strong>
          <span className="loc">
            {weapon.location}
            {weapon.rear ? ' (R)' : ''}
          </span>
        </button>
        <select className="target-select" value={weapon.targetId} onChange={(e) => set({ targetId: e.target.value })} aria-label="Target">
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {result && weapon.fire ? (
          <>
            <span className={`bracket bracket-${result.bracket}`}>{bracketLabel(result)}</span>
            <TargetNumber result={result} />
            <span className="dmg" title="Expected damage (chance × average damage on hit)">
              {result.expectedDamage.toFixed(1)}
              <small>exp</small>
            </span>
          </>
        ) : (
          <span className="idle-label">holding fire</span>
        )}
      </div>
      {open && (
        <div className="weapon-detail">
          <div className="weapon-stats">
            <span>Heat {spec.heat}</span>
            <span>
              Dmg {spec.missiles ? `${spec.damage}/msl × ${spec.missiles}` : spec.damage}
            </span>
            <span>
              Range {spec.minRange > 0 ? `min ${spec.minRange} · ` : ''}
              {spec.short}/{spec.medium}/{spec.long}
            </span>
            {result && <span>Avg on hit {result.averageDamage.toFixed(1)}</span>}
          </div>
          <div className="weapon-options">
            <Toggle label="Rear-mounted" checked={weapon.rear} onChange={(v) => set({ rear: v })} />
            {isLrm(spec) && <Toggle label="Indirect fire" checked={weapon.indirect} onChange={(v) => set({ indirect: v, aimedAt: null })} />}
            {canAim && (
              <label className="field inline">
                <span className="field-label">Aimed shot</span>
                <select value={weapon.aimedAt ?? ''} onChange={(e) => set({ aimedAt: (e.target.value || null) as Location | null })}>
                  <option value="">None</option>
                  {LOCATIONS.map((l) => (
                    <option key={l} value={l}>
                      {LOCATION_NAMES[l]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button type="button" className="small danger" onClick={onRemove}>
              Remove
            </button>
          </div>
          {result && (
            <>
              <Messages result={result} />
              <ModifierList modifiers={result.modifiers} />
              <div className="tn-total">
                Target Number <strong>{result.targetNumber}</strong>
                {weapon.aimedAt && result.allowed && (
                  <span className="muted"> · aimed location hit on 6–8 ({formatPercent(AIMED_SHOT_CHANCE)} of hits)</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </li>
  )
}

export function WeaponsPanel(props: Props) {
  const { weapons, results, targets, spotter, onChange } = props
  const [weaponKey, setWeaponKey] = useState('ML')
  const [location, setLocation] = useState<Location>('RA')

  const add = () => {
    const primary = targets.find((t) => t.primary) ?? targets[0]
    onChange([...weapons, newWeapon(weaponKey, location, primary.id)])
  }

  const firing = weapons.filter((w) => w.fire)
  const totalExpected = firing.reduce((s, w) => s + (results.get(w.id)?.expectedDamage ?? 0), 0)
  const totalHeat = firing.reduce((s, w) => s + WEAPONS_BY_KEY[w.weaponKey].heat, 0)
  const anyIndirect = firing.some((w) => w.indirect)

  return (
    <Panel title="Weapon attacks" className="weapons">
      <div className="add-weapon">
        <select value={weaponKey} onChange={(e) => setWeaponKey(e.target.value)} aria-label="Weapon">
          {(['energy', 'ballistic', 'missile'] as const).map((cat) => (
            <optgroup key={cat} label={cat[0].toUpperCase() + cat.slice(1)}>
              {WEAPONS.filter((w) => w.category === cat).map((w) => (
                <option key={w.key} value={w.key}>
                  {w.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select value={location} onChange={(e) => setLocation(e.target.value as Location)} aria-label="Location">
          {LOCATIONS.map((l) => (
            <option key={l} value={l}>
              {LOCATION_NAMES[l]}
            </option>
          ))}
        </select>
        <button type="button" onClick={add}>
          + Mount weapon
        </button>
      </div>

      {props.targetWarnings.length > 0 && (
        <ul className="messages">
          {props.targetWarnings.map((w) => (
            <li key={w} className="msg-warn">
              {w}
            </li>
          ))}
        </ul>
      )}

      {weapons.length === 0 ? (
        <p className="empty">No weapons mounted. Add the weapons from your record sheet above.</p>
      ) : (
        <ul className="weapon-list">
          {weapons.map((w) => (
            <WeaponRow
              key={w.id}
              weapon={w}
              result={results.get(w.id)}
              targets={targets}
              onChange={(nw) => onChange(weapons.map((x) => (x.id === nw.id ? nw : x)))}
              onRemove={() => onChange(weapons.filter((x) => x.id !== w.id))}
            />
          ))}
        </ul>
      )}

      <div className="totals">
        <span>
          Firing <strong>{firing.length}</strong>
        </span>
        <span>
          Weapon heat <strong>+{totalHeat}</strong>
        </span>
        <span>
          Expected damage <strong>{totalExpected.toFixed(1)}</strong>
        </span>
      </div>

      <div className="spotting">
        <Toggle label="This 'Mech is spotting for indirect fire (+1 to its own attacks)" checked={props.attackerIsSpotting} onChange={props.onSpottingChange} />
        {anyIndirect && (
          <fieldset className="limb">
            <legend>Spotter for indirect LRM fire</legend>
            <Segmented label="Spotter movement" value={spotter.movement} options={MOVEMENT_OPTIONS} onChange={(v) => props.onSpotterChange({ ...spotter, movement: v })} />
            <div className="toggles">
              <Toggle label="Spotter prone" checked={spotter.prone} onChange={(v) => props.onSpotterChange({ ...spotter, prone: v })} />
              <Toggle label="Spotter also attacked" checked={spotter.attacked} onChange={(v) => props.onSpotterChange({ ...spotter, attacked: v })} />
            </div>
          </fieldset>
        )}
      </div>
    </Panel>
  )
}
