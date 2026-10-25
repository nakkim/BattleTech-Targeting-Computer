import { ARC_NAMES, tableColumn } from "../../rules/tables";
import type { Arc, Target } from "../../rules/types";
import { bearing, flatHexCenter, flatHexPoints, hexesWithin } from "./hex";

const SIZE = 22;
const RADIUS = 4;
const EPS = 1e-6;

/** Hit zone of an attack coming from a hex, or 'choice' when the line runs along a zone border. */
function zoneOf(q: number, r: number): Arc | "choice" | null {
  if (q === 0 && r === 0) return null;
  const a = Math.abs(bearing(flatHexCenter(q, r, SIZE)));
  if (Math.abs(a - 90) < EPS || Math.abs(a - 150) < EPS) return "choice";
  if (a < 90) return "front";
  if (a < 150) return bearing(flatHexCenter(q, r, SIZE)) > 0 ? "right" : "left";
  return "rear";
}

const LABELS: Record<Arc, { x: number; y: number; lines: string[] }> = {
  front: { x: 0, y: -SIZE * 4.6, lines: ["FRONT HIT ZONE"] },
  left: { x: -SIZE * 4.1, y: SIZE * 1.9, lines: ["LEFT SIDE", "HIT ZONE"] },
  right: { x: SIZE * 4.1, y: SIZE * 1.9, lines: ["RIGHT SIDE", "HIT ZONE"] },
  rear: { x: 0, y: SIZE * 5.4, lines: ["REAR HIT ZONE"] },
};

const COLUMN_NAMES = {
  left: "Left Side",
  front: "Front/Rear",
  right: "Right Side",
};

/** Hit zones around the target, like the rulebook's Attack Direction Diagram (p. 22). */
export function AttackDirectionDiagram({ target }: { target: Target }) {
  const hexes = hexesWithin(RADIUS);
  const w = SIZE * (1.5 * RADIUS + 1) + 4;
  const h = SIZE * Math.sqrt(3) * (RADIUS + 0.5) + 4;
  const selected = target.attackDirection;
  /** Border lines stop at the outer ring of hexes. */
  const edge = SIZE * 1.5 * RADIUS + SIZE * 0.6;

  return (
    <div className="diagram">
      <svg
        viewBox={`${-w} ${-h} ${w * 2} ${h * 2}`}
        className="arc-svg"
        role="img"
        aria-label={`Attack strikes the target's ${ARC_NAMES[
          selected
        ].toLowerCase()}`}
      >
        {hexes.map(({ q, r }) => {
          const c = flatHexCenter(q, r, SIZE);
          const zone = zoneOf(q, r);
          const cls =
            zone === null
              ? "hex hex-self"
              : zone === "choice"
              ? "hex hex-choice"
              : `hex arc-${zone} ${zone === selected ? "selected" : "dimmed"}`;
          return (
            <polygon
              key={`${q},${r}`}
              points={flatHexPoints(c, SIZE - 1)}
              className={cls}
            />
          );
        })}
        {/* Zone borders: the side line and the edges of the rear wedge. */}
        <g className="zone-lines">
          <line x1={-edge} y1={0} x2={edge} y2={0} />
          <line
            x1={0}
            y1={0}
            x2={-edge * Math.sin(Math.PI / 6)}
            y2={edge * Math.cos(Math.PI / 6)}
          />
          <line
            x1={0}
            y1={0}
            x2={edge * Math.sin(Math.PI / 6)}
            y2={edge * Math.cos(Math.PI / 6)}
          />
        </g>
        <polygon points="0,-13 8,7 0,3 -8,7" className="facing-arrow" />
        {(Object.keys(LABELS) as Arc[]).map((arc) => {
          const { x, y, lines } = LABELS[arc];
          return (
            <text
              key={arc}
              x={x}
              y={y - ((lines.length - 1) * 11) / 2}
              className={`arc-label ${arc === selected ? "" : "dimmed-label"}`}
            >
              {lines.map((line, i) => (
                <tspan key={i} x={x} dy={i === 0 ? 0 : 11}>
                  {line}
                </tspan>
              ))}
            </text>
          );
        })}
      </svg>
      <p className="diagram-caption">
        <strong>{target.name}</strong> faces up. Draw a line from the
        attacker&apos;s hex to the target: the zone it comes from sets the{" "}
        <strong>{COLUMN_NAMES[tableColumn(selected)]}</strong> column of the Hit
        Location Table
        {selected === "rear" ? ", and torso hits strike the rear armor" : ""}.
      </p>
      <ul className="arc-legend">
        <li>
          <span className="swatch hex-choice-swatch" />
          <span className="arc-legend-name">White hexes</span>
          <span className="arc-legend-weapons">
            Line runs along a zone border: the target&apos;s controller chooses
            the side.
          </span>
        </li>
        <li>
          <span className="swatch hex-self-swatch" />
          <span className="arc-legend-name">Facing</span>
          <span className="arc-legend-weapons">
            Use the direction of the feet; torso twists do not change the hit
            zone. A prone &apos;Mech uses the side its top points to.
          </span>
        </li>
      </ul>
    </div>
  );
}
