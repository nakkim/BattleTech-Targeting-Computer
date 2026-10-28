import { defineMech } from './defineMech'

/** TDR-5SS Thunderbolt: 65 tons, walk 4. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Thunderbolt TDR-5SS',
  tonnage: 65,
  heatSinks: 21,
  armor: { HD: 9, CT: 30, CTR: 11, LT: 24, LTR: 6, RT: 24, RTR: 6, LA: 20, RA: 20, LL: 29, RL: 29 },
  weapons: [
    ['PPC', 'RA'],
    ['SRM6', 'LT'],
    ['ML', 'LT'],
    ['ML', 'LT'],
    ['ML', 'LT'],
    ['FL', 'RT'],
  ],
  ammo: [
    ['SRM6', 'CT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Heat Sink', 'Ammo SRM6'],
    LT: ['Heat Sink', 'SRM6', 'SRM6', 'ML', 'ML', 'ML', null, null, null, null, null, null],
    RT: ['Heat Sink', 'Heat Sink', 'Heat Sink', 'Heat Sink', 'Heat Sink', 'FL', null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', null, null, null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'PPC', 'PPC', 'PPC', null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
  },
})
