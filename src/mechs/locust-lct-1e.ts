import { defineMech } from './defineMech'

/** LCT-1E Locust: 20 tons, walk 8. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Locust LCT-1E',
  tonnage: 20,
  heatSinks: 10,
  leftArm: { hasLowerArm: false, hasHand: false },
  rightArm: { hasLowerArm: false, hasHand: false },
  armor: { HD: 8, CT: 10, CTR: 2, LT: 8, LTR: 2, RT: 8, RTR: 2, LA: 4, RA: 4, LL: 8, RL: 8 },
  weapons: [
    ['ML', 'LA'],
    ['SL', 'LA'],
    ['ML', 'RA'],
    ['SL', 'RA'],
  ],
})
