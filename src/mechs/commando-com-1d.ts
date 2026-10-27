import { defineMech } from './defineMech'

/** COM-1D Commando: 25 tons, walk 6. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Commando COM-1D',
  tonnage: 25,
  heatSinks: 10,
  armor: { HD: 6, CT: 6, CTR: 2, LT: 5, LTR: 2, RT: 5, RTR: 2, LA: 4, RA: 4, LL: 6, RL: 6 },
  weapons: [
    ['LL', 'RA'],
    ['SRM6', 'CT'],
  ],
  ammo: [
    ['SRM6', 'LT'],
  ],
})
