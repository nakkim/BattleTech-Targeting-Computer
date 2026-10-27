import { defineMech } from './defineMech'

/** CPLT-A1 Catapult: 65 tons, walk 4 / jump 4. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Catapult CPLT-A1',
  tonnage: 65,
  heatSinks: 15,
  leftArm: { hasLowerArm: false, hasHand: false },
  rightArm: { hasLowerArm: false, hasHand: false },
  armor: { HD: 9, CT: 24, CTR: 11, LT: 21, LTR: 9, RT: 21, RTR: 9, LA: 20, RA: 20, LL: 24, RL: 24 },
  weapons: [
    ['LRM15', 'LA'],
    ['LRM15', 'RA'],
  ],
  ammo: [
    ['LRM15', 'LT'],
    ['LRM15', 'LT'],
    ['LRM15', 'RT'],
    ['LRM15', 'RT'],
  ],
})
