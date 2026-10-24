# BattleTech Targeting Computer

A React + TypeScript + Vite tool that calculates attack phase values for *BattleTech: A Game of Armored Combat* (box set rulebook in this folder).

## Features

- **Weapon attacks**: G.A.T.O.R. Target Number per weapon with a full modifier breakdown, the 2D6 hit chance and the expected damage.
  - Gunnery, attacker movement, prone attacker, target movement (TMM), jumping, prone and immobile targets.
  - Woods, partial cover, water, LOS blocking (woods above +2, submerged units).
  - Range brackets and minimum range, firing arcs (arms, torso, legs, rear mounts, torso twist, flipped arms).
  - Sensor and arm actuator damage, heat modifiers, secondary targets, indirect LRM fire with a spotter, and aimed shots.
- **Physical attacks**: punch, kick, club, hatchet, push, charge and DFA. Shows Target Numbers, damage groups, hit tables, level differences and actuator damage.
- **Hit location**: chance of each location by attack direction (standard, punch and kick tables), plus the Cluster Hits Table.
- **Heat**: projects heat after the Heat Phase and shows the heat effects.
- The app saves its state in localStorage. **Next turn** clears movement and carries the projected heat into the next turn.

## Development

Requires Node 20.19+ or 22.12+ (see `.nvmrc`).

```sh
nvm use
npm install
npm run dev      # start dev server
npm test         # rules unit tests (vitest)
npm run build    # type-check and production build
```

The rules engine lives in `src/rules/` as pure functions. Its tests check the rulebook's worked examples (p. 18, 26, 28).
