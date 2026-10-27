import { defineMech } from './defineMech'

/** SHD-2K Shadow Hawk: 55 tons, walk 5 / jump 3. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Shadow Hawk SHD-2K',
  tonnage: 55,
  heatSinks: 17,
  armor: { HD: 9, CT: 23, CTR: 8, LT: 18, LTR: 6, RT: 18, RTR: 6, LA: 16, RA: 16, LL: 16, RL: 16 },
  weapons: [
    ['PPC', 'LT'],
    ['LRM5', 'RT'],
  ],
  ammo: [
    ['LRM5', 'RT'],
  ],
})
