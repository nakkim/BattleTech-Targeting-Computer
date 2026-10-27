import { defineMech } from './defineMech'

/** BLR-1G BattleMaster: 85 tons, walk 4. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'BattleMaster BLR-1G',
  tonnage: 85,
  heatSinks: 18,
  armor: { HD: 9, CT: 40, CTR: 11, LT: 28, LTR: 8, RT: 28, RTR: 8, LA: 24, RA: 24, LL: 26, RL: 26 },
  weapons: [
    ['MG', 'LA'],
    ['MG', 'LA'],
    ['PPC', 'RA'],
    ['SRM6', 'LT'],
    ['ML', 'LT', 'rear'],
    ['ML', 'LT'],
    ['ML', 'LT'],
    ['ML', 'RT', 'rear'],
    ['ML', 'RT'],
    ['ML', 'RT'],
  ],
  ammo: [
    ['SRM6', 'LT'],
    ['SRM6', 'LT'],
    ['MG', 'LT'],
  ],
})
