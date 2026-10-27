import { defineMech } from './defineMech'

/** HGN-733 Highlander: 90 tons, walk 3 / jump 3. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Highlander HGN-733',
  tonnage: 90,
  heatSinks: 13,
  rightArm: { hasHand: false },
  armor: { HD: 9, CT: 41, CTR: 17, LT: 28, LTR: 10, RT: 28, RTR: 10, LA: 30, RA: 30, LL: 38, RL: 38 },
  weapons: [
    ['SRM6', 'LA'],
    ['AC10', 'RA'],
    ['LRM20', 'LT'],
    ['ML', 'RT'],
    ['ML', 'RT'],
  ],
  ammo: [
    ['SRM6', 'LT'],
    ['SRM6', 'LT'],
    ['LRM20', 'LT'],
    ['LRM20', 'LT'],
    ['LRM20', 'LT'],
    ['AC10', 'RT'],
    ['AC10', 'RT'],
  ],
})
