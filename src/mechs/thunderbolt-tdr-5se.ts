import { defineMech } from './defineMech'

/** TDR-5SE Thunderbolt: 65 tons, walk 4 / jump 4. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Thunderbolt TDR-5SE',
  tonnage: 65,
  heatSinks: 17,
  armor: { HD: 9, CT: 30, CTR: 11, LT: 24, LTR: 6, RT: 24, RTR: 6, LA: 20, RA: 20, LL: 29, RL: 29 },
  weapons: [
    ['LL', 'RA'],
    ['LRM10', 'LT'],
    ['ML', 'LT'],
    ['ML', 'LT'],
    ['ML', 'LT'],
  ],
  ammo: [
    ['LRM10', 'CT'],
    ['LRM10', 'CT'],
  ],
})
