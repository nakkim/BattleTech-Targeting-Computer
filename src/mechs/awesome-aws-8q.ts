import { defineMech } from './defineMech'

/** AWS-8Q Awesome: 80 tons, walk 3. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Awesome AWS-8Q',
  tonnage: 80,
  heatSinks: 28,
  rightArm: { hasHand: false },
  armor: { HD: 9, CT: 30, CTR: 19, LT: 24, LTR: 10, RT: 24, RTR: 10, LA: 24, RA: 24, LL: 33, RL: 33 },
  weapons: [
    ['PPC', 'RA'],
    ['PPC', 'LT'],
    ['PPC', 'RT'],
    ['SL', 'HD'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', 'SL', 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Heat Sink', 'Heat Sink'],
    LT: ['Heat Sink', 'Heat Sink', 'Heat Sink', 'Heat Sink', 'Heat Sink', 'PPC', 'PPC', 'PPC', null, null, null, null],
    RT: ['Heat Sink', 'Heat Sink', 'Heat Sink', 'PPC', 'PPC', 'PPC', null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', null, null, null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Heat Sink', 'Heat Sink', 'Heat Sink', 'Heat Sink', 'Heat Sink', 'PPC', 'PPC', 'PPC', null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
  },
})
