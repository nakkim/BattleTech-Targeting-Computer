# BattleTech Targeting Computer

A React + TypeScript + Vite tool that calculates attack phase values for *BattleTech: A Game of Armored Combat* (box set rulebook in this folder).

## Features

- **Lance**: track several 'Mechs, one tab each. Every 'Mech has its own targets, weapons, heat and damage.
  - The **Add 'Mech** dialog starts from one of 33 'Mech models, three variants each of 11 'Mechs (the eight used in the rulebook's examples, plus Highlander, Catapult and Atlas), or **Other** for a blank 'Mech, then sets name, skills, tonnage, heat sinks, arms (a 'Mech may have no arms or no lower arm, hand or hatchet), armor, weapons and ammo bins.
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
- **Critical damage**: mark destroyed locations, damaged actuators, destroyed heat sinks, engine hits (destroyed at 3), gyro hits, damaged life support and a destroyed cockpit. A side torso takes its arm with it, and a destroyed head or center torso destroys the 'Mech.
- **Physical attacks**: punch, kick, club, hatchet, push, charge and DFA. Shows Target Numbers, damage groups, hit tables, level differences and actuator damage.
- **Hit location**: chance of each location by attack direction (standard, punch and kick tables), plus the Cluster Hits Table.
- **Heat**: projects heat after the Heat Phase and shows the heat effects. At 19 heat or more it shows the roll to avoid an ammo explosion and which bin would explode.
- **Next turn** advances the turn counter. For every 'Mech it clears movement, carries the projected heat into the next turn and removes the ammo fired. In Track stats mode it stays disabled ("Resolve heat phase") until every Heat Phase roll is entered and its damage applied.
- **Heat Phase rolls** (Track stats mode): all dice are rolled on the table. After **Next turn**, the Heat card lists the rolls the Heat Phase needs, and you click each 2D6 result:
  - **Shutdown** at 14 heat or more, automatic at 30. A shut down 'Mech cannot move or attack, and tries to restart in the following Heat Phases (automatically below 14 heat).
  - A standing 'Mech that shuts down gets a Piloting Skill Roll at +3 on the Piloting Skill Rolls card.
  - **Ammo explosion** at 19 heat or more. On a failure it explodes the bin with the most damage per shot, or the one you pick between equal ones, with Undo.
  - Lance tabs show **ROLL n** while results are missing, and **SHUT DOWN** for a shut down 'Mech. The 'Mech card also has a **Shut down** switch for corrections and voluntary shutdown.
  - In Plain 2D6 mode the Heat card only lists the rolls the Heat Phase calls for; you resolve them on the record sheet.
- **Piloting Skill Rolls** (Track stats mode): a card lists the turn's Piloting Skill Rolls, made with physical dice.
  - **Added automatically** from tracked damage: 20+ damage in a phase, each damaged leg or foot actuator and hip, a lost leg, and gyro hits. A switch on the card sets whether new damage happens in the Weapon or Physical Attack Phase; heat explosions count toward the Heat Phase. Undoing or repairing the damage, or unticking the hit, removes the roll.
  - **Add roll** adds the other events (kicked, pushed, charged, missed kick or death from above, standing up, water, rubble and more) with their phase.
  - Each roll shows its Target Number: Piloting skill, every event of the same phase (all of an attack phase, since those rolls come at its end), and leg damage from Critical damage. Entering a result fixes its modifiers.
  - A prone 'Mech only rolls to stand, a shut down 'Mech fails every roll, and a Target Number above 12, a missed death from above (a 2-level fall on the rear), a lost leg or a destroyed gyro fall automatically; the other rolls of that attack phase are then not needed. A 'Mech with a destroyed gyro cannot stand.
  - After a fall: the MechWarrior's roll to avoid 1 damage, then the 1D6 Facing After Fall roll and a 2D6 hit location roll for each 5-point group. **Apply falling damage** applies each group, with Undo. Correcting or removing the roll takes the fall back.
  - **Next turn** clears the rolls, and stays disabled until they are resolved.
- **MechWarrior** (Track stats mode): a card with the record sheet's damage track and consciousness numbers (3, 5, 7, 10, 11, dead at 6).
  - Head hits (Take damage and falls), ammo explosions (2) and failed or automatic MechWarrior rolls after a fall add damage automatically, and their Undo takes it back. **Add damage** covers the rest, such as heat with a damaged life support system.
  - Each point of damage asks for a 2D6 Consciousness Roll; once the MechWarrior is unconscious, no more rolls that turn.
  - An unconscious or dead MechWarrior makes the 'Mech immobile: no weapon or physical attacks, and every Piloting Skill Roll fails. A fall cannot make its own roll fail.
  - After a full turn unconscious, the turn after shows the End Phase roll to wake up. Lance tabs show **UNCONSCIOUS** or **PILOT KILLED**, and **Heal** clears the damage.
- **Critical hits** (Track stats mode): each location whose internal structure takes damage, and each hit location roll of 2 (tick **Hit location roll of 2** under Take damage; falls check theirs), gets a Determining Critical Hits roll.
  - Catalog 'Mechs carry their real Critical Hit Table, from the MegaMek unit files. The card shows it, asks for the 1D6 block and slot rolls, rolls again on empty or already hit slots, and transfers or loses hits with nothing left to hit.
  - **Apply critical hit** applies the effect: actuators (with their Piloting Skill Rolls), engine (destroyed at 3), gyro, sensors, cockpit, life support, heat sinks, weapons (they can no longer fire) and ammo, which explodes for its damage and 2 MechWarrior damage. A 12 blows off a limb or the head. Every step has Undo.
  - A destroyed location only checks when it holds ammo that can explode; hits on anything else are discarded.
  - Without a known table (a custom 'Mech), you roll on your record sheet and pick what the slot holds.
  - Damaged life support hurts the MechWarrior in the Heat Phase: 1 damage at 15–25 heat, 2 at 26+.
- **Collapsible cards**: Critical hits, Piloting Skill Rolls and MechWarrior fold up like the other cards, showing what is left to resolve.
- **Modes**: the header switch picks between **Track stats** and **Plain 2D6**. Plain 2D6 only works out hit or miss: ammo never runs out, and the armor, ammunition and ammo explosion parts are hidden. Tracked values are kept for switching back.
- **Theme**: a header switch picks light or dark. The first visit follows the system setting.
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

The rules engine lives in `src/rules/` as pure functions. Its tests check the rulebook's worked examples (p. 18, 26, 28), plus ammo, damage transfer and ammo explosions. 'Mech models are in `src/mechs/`, one file each; see `src/mechs/README.md` for adding one.
