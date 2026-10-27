import { defineMech } from './defineMech'

/** TDR-5SS Thunderbolt: 65 tons, walk 4. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Thunderbolt TDR-5SS',
  tonnage: 65,
  heatSinks: 21,
  armor: { HD: 9, CT: 30, CTR: 11, LT: 24, LTR: 6, RT: 24, RTR: 6, LA: 20, RA: 20, LL: 29, RL: 29 },
  weapons: [
    ['PPC', 'RA'],
    ['SRM6', 'LT'],
    ['ML', 'LT'],
    ['ML', 'LT'],
    ['ML', 'LT'],
    ['FL', 'RT'],
  ],
  ammo: [
    ['SRM6', 'CT'],
  ],
})
