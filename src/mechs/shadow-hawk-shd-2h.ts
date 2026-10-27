import { defineMech } from './defineMech'

/** SHD-2H Shadow Hawk: 55 tons, walk 5 / jump 3. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Shadow Hawk SHD-2H',
  tonnage: 55,
  heatSinks: 12,
  armor: { HD: 9, CT: 23, CTR: 8, LT: 18, LTR: 6, RT: 18, RTR: 6, LA: 16, RA: 16, LL: 16, RL: 16 },
  weapons: [
    ['ML', 'RA'],
    ['AC5', 'LT'],
    ['LRM5', 'RT'],
    ['SRM2', 'HD'],
  ],
  ammo: [
    ['AC5', 'LT'],
    ['LRM5', 'RT'],
    ['SRM2', 'CT'],
  ],
})
