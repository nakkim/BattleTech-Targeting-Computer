import { defineMech } from './defineMech'

/** CPLT-K2 Catapult: 65 tons, walk 4. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Catapult CPLT-K2',
  tonnage: 65,
  heatSinks: 20,
  leftArm: { hasLowerArm: false, hasHand: false },
  rightArm: { hasLowerArm: false, hasHand: false },
  armor: { HD: 9, CT: 24, CTR: 11, LT: 20, LTR: 8, RT: 20, RTR: 8, LA: 18, RA: 18, LL: 20, RL: 20 },
  weapons: [
    ['PPC', 'LA'],
    ['PPC', 'RA'],
    ['ML', 'LT'],
    ['MG', 'LT'],
    ['ML', 'RT'],
    ['MG', 'RT'],
  ],
  ammo: [
    ['MG', 'CT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Heat Sink', 'Ammo MG'],
    LT: ['Heat Sink', 'Heat Sink', 'ML', 'MG', null, null, null, null, null, null, null, null],
    RT: ['Heat Sink', 'Heat Sink', 'Heat Sink', 'ML', 'MG', null, null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'PPC', 'PPC', 'PPC', null, null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'PPC', 'PPC', 'PPC', null, null, null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
  },
})
