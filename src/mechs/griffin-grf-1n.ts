import { defineMech } from './defineMech'

/** GRF-1N Griffin: 55 tons, walk 5 / jump 5. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Griffin GRF-1N',
  tonnage: 55,
  heatSinks: 12,
  armor: { HD: 9, CT: 20, CTR: 7, LT: 20, LTR: 6, RT: 20, RTR: 6, LA: 14, RA: 14, LL: 18, RL: 18 },
  weapons: [
    ['PPC', 'RA'],
    ['LRM10', 'RT'],
  ],
  ammo: [
    ['LRM10', 'RT'],
    ['LRM10', 'RT'],
  ],
})
