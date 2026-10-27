import { defineMech } from './defineMech'

/** BLR-1S BattleMaster: 85 tons, walk 4. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'BattleMaster BLR-1S',
  tonnage: 85,
  heatSinks: 20,
  armor: { HD: 9, CT: 40, CTR: 11, LT: 28, LTR: 8, RT: 28, RTR: 8, LA: 24, RA: 24, LL: 26, RL: 26 },
  weapons: [
    ['LRM15', 'LA'],
    ['SRM2', 'RA'],
    ['ML', 'LT'],
    ['ML', 'LT'],
    ['LRM5', 'LT'],
    ['SRM2', 'LT'],
    ['ML', 'RT'],
    ['ML', 'RT'],
  ],
  ammo: [
    ['LRM15', 'LA'],
    ['LRM5', 'LT'],
    ['SRM2', 'RT'],
  ],
})
