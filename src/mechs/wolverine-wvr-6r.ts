import { defineMech } from './defineMech'

/** WVR-6R Wolverine: 55 tons, walk 5 / jump 5. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Wolverine WVR-6R',
  tonnage: 55,
  heatSinks: 12,
  armor: { HD: 8, CT: 20, CTR: 8, LT: 20, LTR: 6, RT: 20, RTR: 6, LA: 16, RA: 16, LL: 16, RL: 16 },
  weapons: [
    ['AC5', 'RA'],
    ['SRM6', 'LT'],
    ['ML', 'HD'],
  ],
  ammo: [
    ['AC5', 'RA'],
    ['SRM6', 'LT'],
  ],
})
