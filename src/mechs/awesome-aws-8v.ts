import { defineMech } from './defineMech'

/** AWS-8V Awesome: 80 tons, walk 3. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Awesome AWS-8V',
  tonnage: 80,
  heatSinks: 28,
  rightArm: { hasHand: false },
  armor: { HD: 9, CT: 30, CTR: 19, LT: 24, LTR: 10, RT: 24, RTR: 10, LA: 24, RA: 24, LL: 33, RL: 33 },
  weapons: [
    ['PPC', 'RA'],
    ['LL', 'LT'],
    ['LRM15', 'RT'],
    ['SL', 'HD'],
  ],
  ammo: [
    ['LRM15', 'CT'],
    ['LRM15', 'CT'],
  ],
})
