# 'Mech models

Each file in this folder is one 'Mech model. The app loads every file here automatically, and the models appear in the **Model** list of the Add 'Mech dialog, lightest first. The list ends with **Other**, a blank 50-ton 'Mech (`OTHER_MECH` in `src/state/mechCatalog.ts`).

## Adding a 'Mech

1. Copy an existing file, e.g. `griffin-grf-1n.ts`, and rename it after the new model (`marauder-mad-3r.ts`).
2. Fill in the values from the record sheet (the numbers below are only an example):

```ts
import { defineMech } from './defineMech'

/** MAD-3R Marauder: 75 tons, walk 4. */
export default defineMech({
  name: 'Marauder MAD-3R',
  tonnage: 75,
  heatSinks: 16,
  // Only what differs from a full arm with shoulder, upper arm, lower arm and hand.
  leftArm: { hasHand: false },
  rightArm: { hasHand: false },
  // Front armor per location, plus rear torso armor (CTR, LTR, RTR).
  armor: { HD: 9, CT: 35, CTR: 10, LT: 25, LTR: 8, RT: 25, RTR: 8, LA: 22, RA: 22, LL: 26, RL: 26 },
  // [weapon, location], or [weapon, location, 'rear'] for a rear-firing mount.
  weapons: [
    ['PPC', 'LA'],
    ['PPC', 'RA'],
    ['AC5', 'RT'],
    ['ML', 'LA'],
    ['ML', 'RA'],
  ],
  // One entry per full ton of ammunition: [weapon, location].
  ammo: [
    ['AC5', 'RT'],
    ['AC5', 'RT'],
  ],
  // Optional: the Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  // 6 slots for HD, LL and RL, 12 for the rest. Without it, players pick critical hits off their record sheet.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
    // ...one line per location, e.g.
    RT: ['AC5', 'AC5', 'AC5', 'AC5', 'Ammo AC5', 'Ammo AC5', 'Heat Sink', null, null, null, null, null],
  },
})
```

3. Run `npm test`. The catalog test checks every model: known weapon keys, locations the 'Mech has, ammo only for weapons it mounts, armor within the maximum for its tonnage, and a Critical Hit Table with a slot for every weapon and ton of ammo.

**Reference:**
- **Locations:** `HD`, `CT`, `LT`, `RT`, `LA`, `RA`, `LL`, `RL`.
- **Weapon keys:** `SL`, `ML`, `LL`, `PPC`, `FL` (flamer), `MG`, `AC2`, `AC5`, `AC10`, `AC20`, `GAUSS`, `LRM5`, `LRM10`, `LRM15`, `LRM20`, `SRM2`, `SRM4`, `SRM6`. They are defined in `WEAPONS` in `src/rules/tables.ts`.
- **A 'Mech without an arm:** `leftArm: { present: false }`.
- **Critical slots:** actuators `'Shoulder'`, `'Upper Arm'`, `'Lower Arm'`, `'Hand'`, `'Hip'`, `'Upper Leg'`, `'Lower Leg'`, `'Foot'`; `'Engine'`, `'Gyro'`, `'Sensors'`, `'Cockpit'`, `'Life Support'`, `'Heat Sink'`, `'Jump Jet'`, `'CASE'`; a weapon key, one slot per slot it fills (`'PPC'` three times), with `' (R)'` for a rear mount (`'ML (R)'`); ammo as `'Ammo LRM20'`.
- **Data source:** the models here come from the MegaMek unit files (`mm-data`, `data/mekfiles/meks/`). The `.mtf` files list armor, weapons, heat sinks and every critical slot, including ammo locations and rear mounts marked `(R)`.

The default 'Mech for a new lance is set by `DEFAULT_MECH_NAME` in `src/state/mechCatalog.ts`.
