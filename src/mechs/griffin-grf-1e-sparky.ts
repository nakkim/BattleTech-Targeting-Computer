import { defineMech } from './defineMech'

/** GRF-1E 'Sparky' Griffin: 55 tons, walk 5 / jump 5. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: "Griffin GRF-1E 'Sparky'",
  tonnage: 55,
  heatSinks: 13,
  armor: { HD: 9, CT: 24, CTR: 7, LT: 20, LTR: 6, RT: 20, RTR: 6, LA: 18, RA: 18, LL: 20, RL: 20 },
  weapons: [
    ['ML', 'LA'],
    ['ML', 'LA'],
    ['PPC', 'RA'],
    ['ML', 'RA'],
    ['ML', 'LT'],
    ['ML', 'RT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', 'Heat Sink', 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Heat Sink', 'Jump Jet'],
    LT: ['Jump Jet', 'Jump Jet', 'ML', null, null, null, null, null, null, null, null, null],
    RT: ['Jump Jet', 'Jump Jet', 'ML', null, null, null, null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'ML', 'ML', null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'PPC', 'PPC', 'PPC', 'ML', null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', null, null],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', null, null],
  },
})
