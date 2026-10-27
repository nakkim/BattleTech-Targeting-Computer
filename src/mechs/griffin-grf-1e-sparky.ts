import { defineMech } from './defineMech'

/** GRF-1E 'Sparky' Griffin: 55 tons, walk 5 / jump 5. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: "Griffin GRF-1E 'Sparky'",
  tonnage: 55,
  heatSinks: 13,
  armor: { HD: 9, CT: 24, CTR: 7, LT: 20, LTR: 6, RT: 20, RTR: 6, LA: 18, RA: 18, LL: 20, RL: 20 },
  weapons: [
    ['ML', 'LA'],
    ['ML', 'LA'],
    ['PPC', 'RA'],
    ['ML', 'RA'],
    ['ML', 'LT'],
    ['ML', 'RT'],
  ],
})
