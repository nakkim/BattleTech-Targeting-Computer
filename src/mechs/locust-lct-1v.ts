import { defineMech } from './defineMech'

/** LCT-1V Locust: 20 tons, walk 8. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Locust LCT-1V',
  tonnage: 20,
  heatSinks: 10,
  leftArm: { hasLowerArm: false, hasHand: false },
  rightArm: { hasLowerArm: false, hasHand: false },
  armor: { HD: 8, CT: 10, CTR: 2, LT: 8, LTR: 2, RT: 8, RTR: 2, LA: 4, RA: 4, LL: 8, RL: 8 },
  weapons: [
    ['MG', 'LA'],
    ['MG', 'RA'],
    ['ML', 'CT'],
  ],
  ammo: [
    ['MG', 'CT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'ML', 'Ammo MG'],
    LT: [null, null, null, null, null, null, null, null, null, null, null, null],
    RT: [null, null, null, null, null, null, null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'MG', null, null, null, null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'MG', null, null, null, null, null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
  },
})
