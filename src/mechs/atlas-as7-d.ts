import { defineMech } from './defineMech'

/** AS7-D Atlas: 100 tons, walk 3. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Atlas AS7-D',
  tonnage: 100,
  heatSinks: 20,
  armor: { HD: 9, CT: 47, CTR: 14, LT: 32, LTR: 10, RT: 32, RTR: 10, LA: 34, RA: 34, LL: 41, RL: 41 },
  weapons: [
    ['ML', 'LA'],
    ['ML', 'RA'],
    ['LRM20', 'LT'],
    ['SRM6', 'LT'],
    ['AC20', 'RT'],
    ['ML', 'CT', 'rear'],
    ['ML', 'CT', 'rear'],
  ],
  ammo: [
    ['LRM20', 'LT'],
    ['LRM20', 'LT'],
    ['SRM6', 'LT'],
    ['AC20', 'RT'],
    ['AC20', 'RT'],
  ],
})
