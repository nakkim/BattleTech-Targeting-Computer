import { defineMech } from './defineMech'

/** SHD-2D Shadow Hawk: 55 tons, walk 5 / jump 3. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Shadow Hawk SHD-2D',
  tonnage: 55,
  heatSinks: 14,
  armor: { HD: 6, CT: 12, CTR: 6, LT: 9, LTR: 5, RT: 9, RTR: 5, LA: 5, RA: 5, LL: 5, RL: 5 },
  weapons: [
    ['ML', 'LA'],
    ['ML', 'RA'],
    ['AC5', 'LT'],
    ['LRM5', 'RT'],
    ['SRM2', 'CT'],
    ['SRM2', 'HD'],
  ],
  ammo: [
    ['AC5', 'LT'],
    ['SRM2', 'LT'],
    ['LRM5', 'RT'],
    ['SRM2', 'RT'],
  ],
})
