import { useState } from "react";
import { targetMovementModifier } from "../rules/tables";
import type { Attacker, MountedWeapon, Target } from "../rules/types";
import { woodsModifier } from "../rules/weaponAttack";
import { createTarget } from "../state/defaults";
import { ArcDiagram } from "./diagrams/ArcDiagram";
import { AttackDirectionDiagram } from "./diagrams/AttackDirectionDiagram";
import { RangeDiagram } from "./diagrams/RangeDiagram";
import { WaterDiagram } from "./diagrams/WaterDiagram";
import { WoodsDiagram } from "./diagrams/WoodsDiagram";
import { InfoButton } from "./InfoDialog";
import { ARC_OPTIONS, TERRAIN_OPTIONS, WATER_OPTIONS } from "./options";
import {
  CollapsiblePanel,
  NumberField,
  Panel,
  Segmented,
  Toggle,
} from "./fields";

interface Props {
  targets: Target[];
  selectedId: string;
  attacker: Attacker;
  weapons: MountedWeapon[];
  onSelect: (id: string) => void;
  onChange: (targets: Target[]) => void;
}

export const TargetsPanel = ({
  targets,
  selectedId,
  attacker,
  weapons,
  onSelect,
  onChange,
}: Props) => {
  const torsoTwisted = attacker.torsoTwisted;
  const target = targets.find((t) => t.id === selectedId) ?? targets[0];
  const update = (patch: Partial<Target>) =>
    onChange(targets.map((t) => (t.id === target.id ? { ...t, ...patch } : t)));
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const startRename = (t: Target) => {
    onSelect(t.id);
    setDraftName(t.name);
    setRenamingId(t.id);
  };
  const commitRename = () => {
    const name = draftName.trim();
    if (renamingId && name)
      onChange(targets.map((t) => (t.id === renamingId ? { ...t, name } : t)));
    setRenamingId(null);
  };
  const makePrimary = () =>
    onChange(targets.map((t) => ({ ...t, primary: t.id === target.id })));

  const add = () => {
    const t = createTarget({
      name: `Target ${targets.length + 1}`,
      primary: false,
    });
    onChange([...targets, t]);
    onSelect(t.id);
  };
  const remove = () => {
    if (targets.length <= 1) return;
    const rest = targets.filter((t) => t.id !== target.id);
    if (target.primary) rest[0] = { ...rest[0], primary: true };
    onChange(rest);
    onSelect(rest[0].id);
  };

  const tmm =
    targetMovementModifier(target.hexesMoved) + (target.jumped ? 1 : 0);
  const woods = woodsModifier(target);

  return (
    <Panel
      title="Targets"
      className="targets"
      actions={
        <button type="button" className="small" onClick={add}>
          + Add target
        </button>
      }
    >
      <div className="tabs" role="tablist">
        {targets.map((t) =>
          t.id === renamingId ? (
            <input
              key={t.id}
              className="tab-rename"
              value={draftName}
              autoFocus
              aria-label="Target name"
              onFocus={(e) => e.target.select()}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenamingId(null);
              }}
            />
          ) : (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === target.id}
              className={t.id === target.id ? "active" : ""}
              onClick={() => onSelect(t.id)}
              onDoubleClick={() => startRename(t)}
              title="Double-click to rename"
            >
              {t.primary && (
                <span className="primary-dot" title="Primary target" />
              )}
              {t.name || "Unnamed"}
            </button>
          )
        )}
      </div>

      <div className="inline-actions">
        <button
          type="button"
          className="small ghost"
          onClick={() => startRename(target)}
        >
          Rename
        </button>
        {target.primary ? (
          <span className="badge">Primary target</span>
        ) : (
          <button type="button" className="small" onClick={makePrimary}>
            Make primary
          </button>
        )}
        {targets.length > 1 && (
          <button type="button" className="small danger" onClick={remove}>
            Remove
          </button>
        )}
      </div>

      <div className="grid-3">
        <NumberField
          label="Range (hexes)"
          value={target.range}
          onChange={(v) => update({ range: v })}
          min={1}
          max={40}
          info={
            <InfoButton title="Range brackets">
              <RangeDiagram
                gunnery={attacker.gunnery}
                target={target}
                weapons={weapons}
              />
            </InfoButton>
          }
        />
        <NumberField
          label="Hexes moved"
          value={target.hexesMoved}
          onChange={(v) => update({ hexesMoved: v })}
          max={40}
          hint={`TMM +${tmm}`}
        />
        <NumberField
          label="Level difference"
          value={target.levelDifference}
          onChange={(v) => update({ levelDifference: v })}
          min={-10}
          max={10}
          hint="Target hex – attacker hex"
        />
      </div>
      <div className="toggles">
        <Toggle
          label="Jumped"
          checked={target.jumped}
          onChange={(v) => update({ jumped: v })}
        />
        <Toggle
          label="Prone"
          checked={target.prone}
          onChange={(v) => update({ prone: v })}
        />
        <Toggle
          label="Immobile"
          checked={target.immobile}
          onChange={(v) => update({ immobile: v })}
        />
        <Toggle
          label="Partial cover"
          checked={target.partialCover}
          onChange={(v) => update({ partialCover: v })}
        />
      </div>

      <Segmented
        label="Target hex"
        value={target.terrain}
        options={TERRAIN_OPTIONS}
        onChange={(v) => update({ terrain: v })}
        info={
          <InfoButton title="Woods along the line of fire">
            <WoodsDiagram target={target} />
          </InfoButton>
        }
      />
      <div className="grid-3">
        <NumberField
          label="Intervening light woods"
          value={target.interveningLight}
          onChange={(v) => update({ interveningLight: v })}
          max={10}
        />
        <NumberField
          label="Intervening heavy woods"
          value={target.interveningHeavy}
          onChange={(v) => update({ interveningHeavy: v })}
          max={10}
        />
        <div className="field">
          <span className="field-label">
            Woods total
            <InfoButton title="Woods along the line of fire">
              <WoodsDiagram target={target} />
            </InfoButton>
          </span>
          <span className={`readout ${woods > 2 ? "readout-bad" : ""}`}>
            {woods > 2 ? `+${woods} LOS blocked` : `+${woods}`}
          </span>
        </div>
      </div>
      <Segmented
        label="Water"
        value={target.waterDepth}
        options={WATER_OPTIONS}
        onChange={(v) => update({ waterDepth: v })}
        info={
          <InfoButton title="Target in water">
            <WaterDiagram target={target} />
          </InfoButton>
        }
      />

      <Segmented
        label={
          torsoTwisted
            ? "Target in attacker arc (torso)"
            : "Target in attacker arc"
        }
        value={target.arc}
        options={ARC_OPTIONS}
        onChange={(v) =>
          update({ arc: v, legArc: torsoTwisted ? target.legArc : v })
        }
        info={
          <InfoButton title="Firing arcs">
            <ArcDiagram attacker={attacker} target={target} weapons={weapons} />
          </InfoButton>
        }
      />
      {torsoTwisted && (
        <Segmented
          label="Target in attacker arc (legs / feet)"
          value={target.legArc}
          options={ARC_OPTIONS}
          onChange={(v) => update({ legArc: v })}
        />
      )}
      <Segmented
        label="Attack strikes target's"
        value={target.attackDirection}
        options={ARC_OPTIONS}
        onChange={(v) => update({ attackDirection: v })}
        info={
          <InfoButton title="Attack direction">
            <AttackDirectionDiagram target={target} />
          </InfoButton>
        }
      />
    </Panel>
  );
};

interface TargetDataProps {
  target: Target;
  onChange: (target: Target) => void;
}

/** Target data that stays fixed during a game (used by charge, DFA and the tab name). */
export const TargetDataPanel = ({ target, onChange }: TargetDataProps) => {
  const update = (patch: Partial<Target>) => onChange({ ...target, ...patch });
  return (
    <CollapsiblePanel
      id="target-data"
      title={`Target data · ${target.name || "Unnamed"}`}
      className="target-data"
      summary={
        <>
          P{target.piloting} · {target.tonnage}t
        </>
      }
    >
      <label className="field name-field">
        <span className="field-label">Name</span>
        <input
          value={target.name}
          onChange={(e) => update({ name: e.target.value })}
        />
      </label>
      <div className="grid-3">
        <NumberField
          label="Piloting"
          value={target.piloting}
          onChange={(v) => update({ piloting: v })}
          max={8}
          hint="Charge / DFA"
        />
        <NumberField
          label="Tonnage"
          value={target.tonnage}
          onChange={(v) => update({ tonnage: v })}
          min={20}
          max={100}
          hint="Charge damage"
        />
      </div>
    </CollapsiblePanel>
  );
};
