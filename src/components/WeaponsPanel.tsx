import { useState } from 'react'
import { destroyedReason, firingWeapons } from '../rules/destruction'
import { AIMED_SHOT_CHANCE, type WeaponAttackResult } from '../rules/weaponAttack'
import { formatPercent } from '../rules/dice'
import { isLrm, LOCATION_NAMES, LOCATIONS, MOVEMENT_NAMES, WEAPONS, WEAPONS_BY_KEY } from '../rules/tables'
import type { Attacker, Location, MountedWeapon, MovementMode, Spotter, Target } from '../rules/types'
import { newWeapon } from '../state/defaults'
import { Messages, ModifierList, TargetNumber } from './Breakdown'
import { Chevron, Panel, Segmented, Toggle } from './fields'

interface Props {
  attacker: Attacker
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

function bracketTitle(r: WeaponAttackResult, range: number): string {
  const { spec } = r
  const brackets = `Short 1–${spec.short}, medium ${spec.short + 1}–${spec.medium}, long ${spec.medium + 1}–${spec.long}`
  const min = spec.minRange > 0 ? `; minimum range ${spec.minRange}` : ''
  if (r.bracket === 'out') return `Out of range at ${range} hexes. ${brackets}${min}`
  const mod = r.bracket === 'short' ? '+0' : r.bracket === 'medium' ? '+2' : '+4'
  return `${r.bracket[0].toUpperCase()}${r.bracket.slice(1)} range at ${range} hexes (${mod}). ${brackets}${min}`
}

function WeaponRow({
  weapon,
  result,
  targets,
  destroyed,
  onChange,
  onRemove,
}: {
  /** Why the weapon's location is gone, or null when intact. */
  destroyed: string | null
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
    <li className={`weapon ${weapon.fire && !destroyed ? '' : 'weapon-idle'} ${destroyed ? 'weapon-destroyed' : ''} ${result && !result.allowed && weapon.fire && !destroyed ? 'weapon-blocked' : ''}`}>
      <div className="weapon-main">
        <input
          type="checkbox"
          checked={weapon.fire && !destroyed}
          disabled={!!destroyed}
          onChange={(e) => set({ fire: e.target.checked })}
          aria-label={`Fire ${spec.name}`}
          title={destroyed ? `${destroyed}: weapon cannot fire` : weapon.fire ? 'Firing this turn: uncheck to hold fire' : 'Holding fire: check to fire this turn'}
        />
        <button
          type="button"
          className="weapon-name"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          title={open ? 'Hide modifier breakdown and options' : 'Show modifier breakdown and options'}
        >
          <Chevron open={open} />
          <strong>{spec.name}</strong>
          <span className="loc" title={`${LOCATION_NAMES[weapon.location]}${weapon.rear ? ', rear-mounted' : ''}`}>
            {weapon.location}
            {weapon.rear ? ' (R)' : ''}
          </span>
        </button>
        <select className="target-select" value={weapon.targetId} onChange={(e) => set({ targetId: e.target.value })} aria-label="Target" title="Target for this weapon">
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {destroyed ? (
          <span className="idle-label destroyed-label" title="Restore the location under This turn → Critical damage">
            {destroyed}
          </span>
        ) : result && weapon.fire ? (
          <>
            <span className={`bracket bracket-${result.bracket}`} title={bracketTitle(result, target?.range ?? 0)}>
              {bracketLabel(result)}
            </span>
            <TargetNumber result={result} />
            <span className="dmg" title="Expected damage (chance × average damage on hit)">
              {result.expectedDamage.toFixed(1)}
              <small>exp</small>
            </span>
          </>
        ) : (
          <span className="idle-label" title="Not fired this turn: no heat, no attack roll">
            holding fire
          </span>
        )}
      </div>
      {open && (
        <div className="weapon-detail">
          <div className="weapon-stats">
            <span title="Heat generated when fired">Heat {spec.heat}</span>
            <span title={spec.missiles ? `Damage per missile × missiles per salvo; Cluster Hits Table decides how many hit` : 'Damage per hit'}>
              Dmg {spec.missiles ? `${spec.damage}/msl × ${spec.missiles}` : spec.damage}
            </span>
            <span title="Range brackets in hexes: short / medium / long (upper limits)">
              Range {spec.minRange > 0 ? `min ${spec.minRange} · ` : ''}
              {spec.short}/{spec.medium}/{spec.long}
            </span>
            {result && (
              <span title={spec.missiles ? 'Average damage when the attack hits, using average cluster hits' : 'Damage when the attack hits'}>
                Avg on hit {result.averageDamage.toFixed(1)}
              </span>
            )}
          </div>
          <div className="weapon-options">
            <Toggle
              label="Rear-mounted"
              title="Marked (R) on the record sheet: fires only into the rear arc"
              checked={weapon.rear}
              onChange={(v) => set({ rear: v })}
            />
            {isLrm(spec) && (
              <Toggle
                label="Indirect fire"
                title="LRM only: fire without LOS using a friendly spotter. +1, plus spotter movement; +1 more if the spotter attacked"
                checked={weapon.indirect}
                onChange={(v) => set({ indirect: v, aimedAt: null })}
              />
            )}
            {canAim && (
              <label className="field inline" title="Immobile targets only. –4 to hit (head: +3 instead); a hit lands on the chosen location on 6–8">
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
            <button type="button" className="small danger" onClick={onRemove} title="Remove this weapon from the loadout">
              Remove
            </button>
          </div>
          {result && (
            <>
              <Messages result={result} />
              <ModifierList modifiers={result.modifiers} />
              <div className="tn-total">
                <span title="Sum of all modifiers: roll this or higher on 2D6 to hit">
                  Target Number <strong>{result.targetNumber}</strong>
                </span>
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

  const firing = firingWeapons(props.attacker, weapons)
  const totalExpected = firing.reduce((s, w) => s + (results.get(w.id)?.expectedDamage ?? 0), 0)
  const totalHeat = firing.reduce((s, w) => s + WEAPONS_BY_KEY[w.weaponKey].heat, 0)
  const anyIndirect = firing.some((w) => w.indirect)

  return (
    <Panel title="Weapon attacks" className="weapons">
      <div className="add-weapon">
        <select value={weaponKey} onChange={(e) => setWeaponKey(e.target.value)} aria-label="Weapon" title="Weapon to mount">
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
        <select value={location} onChange={(e) => setLocation(e.target.value as Location)} aria-label="Location" title="Location the weapon is mounted in (sets its firing arcs)">
          {LOCATIONS.map((l) => (
            <option key={l} value={l}>
              {LOCATION_NAMES[l]}
            </option>
          ))}
        </select>
        <button type="button" onClick={add} title="Add the weapon to this 'Mech's loadout, aimed at the primary target">
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
              destroyed={destroyedReason(props.attacker, w.location)}
              onChange={(nw) => onChange(weapons.map((x) => (x.id === nw.id ? nw : x)))}
              onRemove={() => onChange(weapons.filter((x) => x.id !== w.id))}
            />
          ))}
        </ul>
      )}

      <div className="totals">
        <span title="Weapons fired this turn">
          Firing <strong>{firing.length}</strong>
        </span>
        <span title="Heat from weapons fired this turn (movement and engine heat are in the Heat card)">
          Weapon heat <strong>+{totalHeat}</strong>
        </span>
        <span title="Sum over fired weapons of chance to hit × average damage on hit">
          Expected damage <strong>{totalExpected.toFixed(1)}</strong>
        </span>
      </div>

      <div className="spotting">
        <Toggle
          label="This 'Mech is spotting for indirect fire (+1 to its own attacks)"
          title="A spotter needs LOS to the target and must not charge or DFA. Its own weapon attacks this turn get +1"
          checked={props.attackerIsSpotting} onChange={props.onSpottingChange} />
        {anyIndirect && (
          <fieldset className="limb">
            <legend>Spotter for indirect LRM fire</legend>
            <Segmented
              label="Spotter movement"
              title="The spotter's movement modifier is added to indirect attacks"
              value={spotter.movement} options={MOVEMENT_OPTIONS} onChange={(v) => props.onSpotterChange({ ...spotter, movement: v })} />
            <div className="toggles">
              <Toggle label="Spotter prone" title="Prone spotter adds +2, as for a prone attacker" checked={spotter.prone} onChange={(v) => props.onSpotterChange({ ...spotter, prone: v })} />
              <Toggle label="Spotter also attacked" title="Spotter made weapon attacks this turn: +1 to the indirect attack" checked={spotter.attacked} onChange={(v) => props.onSpotterChange({ ...spotter, attacked: v })} />
            </div>
          </fieldset>
        )}
      </div>
    </Panel>
  )
}
