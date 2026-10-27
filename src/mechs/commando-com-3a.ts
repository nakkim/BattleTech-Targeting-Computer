import { defineMech } from './defineMech'

/** COM-3A Commando: 25 tons, walk 6. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Commando COM-3A',
  tonnage: 25,
  heatSinks: 10,
  armor: { HD: 4, CT: 6, CTR: 4, LT: 4, LTR: 3, RT: 4, RTR: 3, LA: 4, RA: 4, LL: 6, RL: 6 },
  weapons: [
    ['ML', 'LA'],
    ['SRM6', 'RA'],
    ['FL', 'RA'],
    ['SRM6', 'CT'],
  ],
  ammo: [
    ['SRM6', 'RT'],
  ],
})
