import { defineMech } from './defineMech'

/** AS7-RS Atlas: 100 tons, walk 3. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Atlas AS7-RS',
  tonnage: 100,
  heatSinks: 20,
  armor: { HD: 9, CT: 47, CTR: 14, LT: 32, LTR: 10, RT: 32, RTR: 10, LA: 34, RA: 34, LL: 41, RL: 41 },
  weapons: [
    ['LL', 'LA'],
    ['LL', 'RA'],
    ['LRM15', 'LT'],
    ['SRM4', 'LT'],
    ['AC10', 'RT'],
  ],
  ammo: [
    ['LRM15', 'LT'],
    ['LRM15', 'LT'],
    ['SRM4', 'LT'],
    ['AC10', 'RT'],
    ['AC10', 'RT'],
  ],
})
