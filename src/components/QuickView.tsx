import { useMemo, useState, type ReactNode } from 'react'
import { projectHeat } from '../rules/heat'
import { heatToHitModifier, LOCATION_NAMES, MOVEMENT_NAMES, TARGET_MOVEMENT_BANDS, targetMovementModifier } from '../rules/tables'
import type { Arc, Gator, MovementMode, Target, Terrain } from '../rules/types'
import {
  attackerMovementModifiers,
  multipleTargetsModifier,
  rangeBracket,
  resolveWeaponAttack,
  targetModifiers,
  terrainModifiers,
  type WeaponAttackResult,
} from '../rules/weaponAttack'
import { rulesAttacker } from '../state/mode'
import type { UnitState } from '../state/unit'
import { Messages, ModifierList, TargetNumber } from './Breakdown'
import { NumberField, Segmented, Toggle } from './fields'
import { MechDialog } from './MechDialog'

interface Props {
  unit: UnitState
  onChange: (update: (unit: UnitState) => UnitState) => void
}

const MOVEMENT_OPTIONS: { value: MovementMode; label: string }[] = [
  { value: 'stationary', label: 'Stationary' },
  { value: 'walked', label: 'Walk +1' },
  { value: 'ran', label: 'Run +2' },
  { value: 'jumped', label: 'Jump +3' },
]

const TERRAIN_OPTIONS: { value: Terrain; label: string }[] = [
  { value: 'clear', label: 'Clear' },
  { value: 'light', label: 'Light woods +1' },
  { value: 'heavy', label: 'Heavy woods +2' },
]

const ARC_OPTIONS: { value: Arc; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'rear', label: 'Rear' },
]

const GATOR_NAMES: Record<Gator, string> = { G: 'Gunnery skill', A: 'Attacker movement', T: 'Target movement', O: 'Other modifiers', R: 'Range' }

const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `–${-n}` : '+0')

const sum = (mods: { value: number }[]): number => mods.reduce((s, m) => s + m.value, 0)

const BRACKET_NAMES = { short: 'Short', medium: 'Medium', long: 'Long', out: 'Out of range' }

/**
 * Plain 2D6 mode: GATOR chips on top, each opening a few buttons, and the to-hit number of every weapon.
 * Every weapon fires at the selected target; the to-hit numbers come from the same rules as tracked play.
 */
export const QuickView = ({ unit, onChange }: Props) => {
  const set = (patch: Partial<UnitState>) => onChange((u) => ({ ...u, ...patch }))
  const { targets, weapons, spotter } = unit
  // Rules see no ammo bins in plain mode, so ammo never runs out.
  const attacker = rulesAttacker(unit.attacker, false)
  const target = targets.find((t) => t.id === unit.selectedTargetId) ?? targets[0]
  const [open, setOpen] = useState<Gator | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const setAttacker = (patch: Partial<UnitState['attacker']>) => onChange((u) => ({ ...u, attacker: { ...u.attacker, ...patch } }))
  const setTarget = (patch: Partial<Target>) => onChange((u) => ({ ...u, targets: u.targets.map((t) => (t.id === target.id ? { ...t, ...patch } : t)) }))

  const results = useMemo(() => {
    const map = new Map<string, WeaponAttackResult>()
    for (const w of weapons) map.set(w.id, resolveWeaponAttack(w, { attacker, target, spotter, attackerIsSpotting: unit.attackerIsSpotting }))
    return map
  }, [weapons, attacker, target, spotter, unit.attackerIsSpotting])

  const heat = useMemo(() => projectHeat(attacker, weapons), [attacker, weapons])

  // The modifiers every weapon shares; arm actuators and minimum range differ per weapon.
  const heatMod = heatToHitModifier(attacker.heat)
  const totals: Record<Gator, number> = {
    G: attacker.gunnery,
    A: sum(attackerMovementModifiers(attacker.movement, attacker.prone)),
    T: sum(targetModifiers(target)) + (target.immobile ? -4 : 0),
    O: sum(terrainModifiers(target)) + heatMod + sum(multipleTargetsModifier(target)),
    R: 0,
  }
  const band = TARGET_MOVEMENT_BANDS.findLastIndex((b) => b.from <= target.hexesMoved)
  const chips: { gator: Gator; value: string; detail: string }[] = [
    { gator: 'G', value: String(totals.G), detail: 'Gunnery' },
    { gator: 'A', value: signed(totals.A), detail: MOVEMENT_NAMES[attacker.movement] + (attacker.prone ? ', prone' : '') },
    { gator: 'T', value: signed(totals.T), detail: target.immobile ? 'Immobile' : `${TARGET_MOVEMENT_BANDS[band].label} hex` },
    { gator: 'O', value: signed(totals.O), detail: 'Other' },
    { gator: 'R', value: String(target.range), detail: 'hexes' },
  ]

  const panels: Record<Gator, ReactNode> = {
    G: <NumberField label="Gunnery skill" value={attacker.gunnery} onChange={(gunnery) => setAttacker({ gunnery })} min={0} max={8} hint="From the record sheet" />,
    A: (
      <>
        <Segmented label="Attacker moved" value={attacker.movement} options={MOVEMENT_OPTIONS} onChange={(movement) => setAttacker({ movement })} />
        {attacker.movement === 'jumped' && (
          <NumberField label="Hexes jumped" value={attacker.hexesMoved} onChange={(hexesMoved) => setAttacker({ hexesMoved })} hint="1 heat per hex, at least 3" />
        )}
        <div className="toggles">
          <Toggle label="Attacker prone +2" checked={attacker.prone} onChange={(prone) => setAttacker({ prone })} />
        </div>
      </>
    ),
    T: (
      <>
        <Segmented
          label="Hexes the target moved"
          value={band}
          options={TARGET_MOVEMENT_BANDS.map((b, i) => ({ value: i, label: `${b.label} ${signed(targetMovementModifier(b.from))}` }))}
          onChange={(i) => setTarget({ hexesMoved: TARGET_MOVEMENT_BANDS[i].from })}
        />
        <div className="toggles">
          <Toggle label="Jumped +1" checked={target.jumped} onChange={(jumped) => setTarget({ jumped })} />
          <Toggle label={target.range <= 1 ? 'Prone –2 (adjacent)' : 'Prone +1'} checked={target.prone} onChange={(prone) => setTarget({ prone })} title="+1, or –2 when the target is adjacent" />
          <Toggle label="Immobile –4" checked={target.immobile} onChange={(immobile) => setTarget({ immobile })} />
        </div>
      </>
    ),
    O: (
      <>
        <Segmented label="Target hex" value={target.terrain} options={TERRAIN_OPTIONS} onChange={(terrain) => setTarget({ terrain })} />
        <div className="grid-2">
          <NumberField label="Light woods between" value={target.interveningLight} onChange={(interveningLight) => setTarget({ interveningLight })} max={9} hint="+1 each" />
          <NumberField label="Heavy woods between" value={target.interveningHeavy} onChange={(interveningHeavy) => setTarget({ interveningHeavy })} max={9} hint="+2 each" />
        </div>
        <div className="toggles">
          <Toggle label="Partial cover +1" checked={target.partialCover} onChange={(partialCover) => setTarget({ partialCover })} />
        </div>
        <NumberField label="Attacker heat" value={attacker.heat} onChange={(h) => setAttacker({ heat: h })} max={50} hint={heatMod > 0 ? `${signed(heatMod)} to-hit` : '+1 at 8, +2 at 13, +3 at 17, +4 at 24'} />
        <div className="grid-2">
          <Segmented
            label="Target"
            value={target.primary ? 'primary' : 'secondary'}
            options={[
              { value: 'primary', label: 'Primary' },
              { value: 'secondary', label: 'Secondary' },
            ]}
            onChange={(v) => setTarget({ primary: v === 'primary' })}
            title="A secondary target adds +1 in the forward arc, +2 in a side or rear arc"
          />
          <Segmented label="In the attacker's arc" value={target.arc} options={ARC_OPTIONS} onChange={(arc) => setTarget({ arc, legArc: arc })} title="Weapons fire only into their own arcs" />
        </div>
      </>
    ),
    R: <NumberField label="Range to target (hexes)" value={target.range} onChange={(range) => setTarget({ range })} min={1} max={40} hint="Each weapon finds its own range bracket and minimum range" />,
  }

  return (
    <main className="quick">
      <div className="quick-head">
        <div>
          <h2 className="quick-name">{unit.attacker.name}</h2>
          <span className="muted small-text">{unit.attacker.tonnage} tons</span>
        </div>
        <button type="button" className="small ghost" onClick={() => setEditing(true)} title="Edit the 'Mech's weapons and record sheet data">
          Edit 'Mech
        </button>
      </div>
      {editing && (
        <MechDialog
          title="Edit 'Mech"
          submitLabel="Save"
          attacker={unit.attacker}
          weapons={weapons}
          targetId={target.id}
          onSave={(a, w) => set({ attacker: a, weapons: w })}
          onClose={() => setEditing(false)}
        />
      )}

      <div className="quick-chips" role="group" aria-label="To-hit modifiers">
        {chips.map((c) => (
          <button
            key={c.gator}
            type="button"
            className={`quick-chip ${open === c.gator ? 'active' : ''}`}
            aria-expanded={open === c.gator}
            aria-label={`${GATOR_NAMES[c.gator]}: ${c.value}`}
            onClick={() => setOpen(open === c.gator ? null : c.gator)}
          >
            <span className="quick-chip-letter">{c.gator}</span>
            <span className="quick-chip-value">{c.value}</span>
            <span className="quick-chip-detail">{c.detail}</span>
          </button>
        ))}
      </div>
      {open && (
        <section className="quick-panel" aria-label={GATOR_NAMES[open]}>
          {panels[open]}
        </section>
      )}

      <ul className="quick-weapons">
        {weapons.length === 0 && <li className="muted">No weapons. Add them with Edit 'Mech.</li>}
        {weapons.map((w) => {
          const r = results.get(w.id)
          if (!r) return null
          const bracket = rangeBracket(r.spec, target.range)
          const isOpen = expanded === w.id
          return (
            <li key={w.id} className={`quick-weapon ${w.fire ? 'firing' : ''}`}>
              <div className="quick-weapon-row">
                <button type="button" className="quick-weapon-main" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : w.id)}>
                  <span className="quick-weapon-name">
                    {r.spec.name}
                    <span className="muted small-text">
                      {LOCATION_NAMES[w.location]}
                      {w.rear ? ' (rear)' : ''} · {BRACKET_NAMES[bracket]} · {r.spec.heat} heat
                    </span>
                  </span>
                  <TargetNumber result={r} />
                </button>
                <button type="button" className={`quick-fire ${w.fire ? 'active' : ''}`} aria-pressed={w.fire} title={w.fire ? 'Firing this turn: tap to hold fire' : 'Holding fire: tap to fire this turn'} onClick={() => set({ weapons: weapons.map((x) => (x.id === w.id ? { ...x, fire: !x.fire } : x)) })}>
                  {w.fire ? 'Firing' : 'Hold'}
                </button>
              </div>
              {!r.allowed && !isOpen && <p className="quick-reason">{r.reasons[0]}</p>}
              {isOpen && (
                <div className="quick-breakdown">
                  <ModifierList modifiers={r.modifiers} />
                  <Messages result={r} />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <p className="quick-heat">
        Heat {attacker.heat} + {heat.generated} – {heat.dissipated} sinks: <strong className={heat.next > 0 ? 'msg-warn-text' : 'quick-ok'}>{heat.next}</strong> next turn
        {heat.effects.length > 0 && <span className="msg-warn-text"> · {heat.effects.join(', ')}</span>}
      </p>
    </main>
  )
}
