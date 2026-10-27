import { defineMech } from './defineMech'

/** LCT-1M Locust: 20 tons, walk 8. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Locust LCT-1M',
  tonnage: 20,
  heatSinks: 10,
  leftArm: { hasLowerArm: false, hasHand: false },
  rightArm: { hasLowerArm: false, hasHand: false },
  armor: { HD: 3, CT: 2, CTR: 1, LT: 2, LTR: 1, RT: 2, RTR: 1, LA: 1, RA: 1, LL: 1, RL: 1 },
  weapons: [
    ['LRM5', 'LA'],
    ['LRM5', 'RA'],
    ['ML', 'CT'],
  ],
  ammo: [
    ['LRM5', 'CT'],
  ],
})
