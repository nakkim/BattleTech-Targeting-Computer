import { defineMech } from './defineMech'

/** GRF-1S Griffin: 55 tons, walk 5 / jump 5. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Griffin GRF-1S',
  tonnage: 55,
  heatSinks: 16,
  armor: { HD: 9, CT: 20, CTR: 7, LT: 20, LTR: 6, RT: 20, RTR: 6, LA: 14, RA: 14, LL: 18, RL: 18 },
  weapons: [
    ['LL', 'RA'],
    ['ML', 'RA'],
    ['ML', 'RA'],
    ['LRM5', 'LT'],
  ],
  ammo: [
    ['LRM5', 'RT'],
  ],
})
