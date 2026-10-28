import { defineMech } from './defineMech'

/** BLR-1D BattleMaster: 85 tons, walk 4. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'BattleMaster BLR-1D',
  tonnage: 85,
  heatSinks: 24,
  armor: { HD: 9, CT: 40, CTR: 11, LT: 28, LTR: 8, RT: 28, RTR: 8, LA: 27, RA: 27, LL: 31, RL: 31 },
  weapons: [
    ['MG', 'LA'],
    ['MG', 'LA'],
    ['PPC', 'RA'],
    ['ML', 'LT'],
    ['ML', 'LT'],
    ['ML', 'RT'],
    ['ML', 'RT'],
  ],
  ammo: [
    ['MG', 'RT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Heat Sink', 'Heat Sink'],
    LT: ['Heat Sink', 'Heat Sink', 'Heat Sink', 'ML', 'ML', null, null, null, null, null, null, null],
    RT: ['Heat Sink', 'Heat Sink', 'ML', 'ML', 'Ammo MG', null, null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'MG', 'MG', null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'PPC', 'PPC', 'PPC', null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
  },
})
