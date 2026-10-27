import { defineMech } from './defineMech'

/** WVR-6M Wolverine: 55 tons, walk 5 / jump 5. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Wolverine WVR-6M',
  tonnage: 55,
  heatSinks: 14,
  armor: { HD: 9, CT: 25, CTR: 8, LT: 20, LTR: 6, RT: 20, RTR: 6, LA: 18, RA: 18, LL: 19, RL: 19 },
  weapons: [
    ['LL', 'RA'],
    ['ML', 'RA'],
    ['SRM6', 'LT'],
    ['ML', 'HD'],
  ],
  ammo: [
    ['SRM6', 'RT'],
  ],
})
