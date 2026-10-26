# BattleTech Targeting Computer

A React + TypeScript + Vite tool that calculates attack phase values for *BattleTech: A Game of Armored Combat* (box set rulebook in this folder).

## Features

- **Lance**: track several 'Mechs, one tab each. Every 'Mech has its own targets, weapons, heat and damage.
  - The **Add 'Mech** dialog sets name, skills, tonnage, heat sinks, arms (a 'Mech may have no arms or no lower arm, hand or hatchet), armor, weapons and ammo bins. The fields start with an HGN-732 Highlander.
  - The **'Mech data** card shows these values. Its **Edit** button opens the same dialog.
- **Weapon attacks**: G.A.T.O.R. Target Number per weapon with a full modifier breakdown, the 2D6 hit chance and the expected damage.
  - Gunnery, attacker movement, prone attacker, target movement (TMM), jumping, prone and immobile targets.
  - Woods, partial cover, water, LOS blocking (woods above +2, submerged units).
  - Range brackets and minimum range, firing arcs (arms, torso, legs, rear mounts, torso twist, flipped arms).
  - Sensor and arm actuator damage, heat modifiers, secondary targets, indirect LRM fire with a spotter, and aimed shots.
  - Weapons in destroyed or missing locations cannot fire.
- **Ammunition**: one bin per ton, each in a location. Every shot takes ammo from a bin of the same weapon type, starting with the emptiest bin. A weapon with no ammo left cannot fire, and ammo in a destroyed location is lost. Each bin shows the damage it deals if it explodes. Gauss ammo does not explode.
- **Armor & structure**: armor (front and rear) and internal structure per location, with internal structure taken from tonnage.
  - Apply a hit to a location: armor takes it first, then internal structure. A location with no internal structure left is destroyed, and the rest of the damage transfers inward. Rear hits stay on rear armor.
  - Ammo explosions damage internal structure directly, skipping armor.
  - A report lists what each location took, when to roll for critical hits, and MechWarrior damage. **Undo** reverts the last hit and **Repair** clears all damage.
- **Critical damage**: mark destroyed locations, damaged actuators and engine hits. A side torso takes its arm with it, and a destroyed head or center torso destroys the 'Mech.
- **Physical attacks**: punch, kick, club, hatchet, push, charge and DFA. Shows Target Numbers, damage groups, hit tables, level differences and actuator damage.
- **Hit location**: chance of each location by attack direction (standard, punch and kick tables), plus the Cluster Hits Table.
- **Heat**: projects heat after the Heat Phase and shows the heat effects. At 19 heat or more it shows the roll to avoid an ammo explosion and which bin would explode.
- **Next turn** advances the turn counter. For every 'Mech it clears movement, carries the projected heat into the next turn and removes the ammo fired.
- **Modes**: the header switch picks between **Track stats** and **Plain 2D6**. Plain 2D6 only works out hit or miss: ammo never runs out, and the armor, ammunition and ammo explosion parts are hidden. Tracked values are kept for switching back.
- Cards can be hidden, and the app saves its state in localStorage.

Not modeled: CASE, critical hit rolls (reminders only), MechWarrior damage (reported, not tracked), and armor on targets.

## Development

Requires Node 20.19+ or 22.12+ (see `.nvmrc`).

```sh
nvm use
npm install
npm run dev            # start dev server
npm test               # rules unit tests (vitest)
npm run test:coverage  # tests with a coverage report in coverage/
npm run lint           # oxlint
npm run build          # type-check and production build
```

The rules engine lives in `src/rules/` as pure functions. Its tests check the rulebook's worked examples (p. 18, 26, 28), plus ammo, damage transfer and ammo explosions. 'Mech presets are in `src/state/presets.ts`.
