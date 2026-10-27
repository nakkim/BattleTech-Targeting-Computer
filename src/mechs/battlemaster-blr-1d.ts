import { defineMech } from './defineMech'

/** BLR-1D BattleMaster: 85 tons, walk 4. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'BattleMaster BLR-1D',
  tonnage: 85,
  heatSinks: 24,
  armor: { HD: 9, CT: 40, CTR: 11, LT: 28, LTR: 8, RT: 28, RTR: 8, LA: 27, RA: 27, LL: 31, RL: 31 },
  weapons: [
    ['MG', 'LA'],
    ['MG', 'LA'],
    ['PPC', 'RA'],
    ['ML', 'LT'],
    ['ML', 'LT'],
    ['ML', 'RT'],
    ['ML', 'RT'],
  ],
  ammo: [
    ['MG', 'RT'],
  ],
})
