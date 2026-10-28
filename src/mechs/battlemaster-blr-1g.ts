import { defineMech } from './defineMech'

/** BLR-1G BattleMaster: 85 tons, walk 4. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'BattleMaster BLR-1G',
  tonnage: 85,
  heatSinks: 18,
  armor: { HD: 9, CT: 40, CTR: 11, LT: 28, LTR: 8, RT: 28, RTR: 8, LA: 24, RA: 24, LL: 26, RL: 26 },
  weapons: [
    ['MG', 'LA'],
    ['MG', 'LA'],
    ['PPC', 'RA'],
    ['SRM6', 'LT'],
    ['ML', 'LT', 'rear'],
    ['ML', 'LT'],
    ['ML', 'LT'],
    ['ML', 'RT', 'rear'],
    ['ML', 'RT'],
    ['ML', 'RT'],
  ],
  ammo: [
    ['SRM6', 'LT'],
    ['SRM6', 'LT'],
    ['MG', 'LT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', null, null],
    LT: ['SRM6', 'SRM6', 'ML', 'ML', 'ML (R)', 'Ammo SRM6', 'Ammo SRM6', 'Ammo MG', null, null, null, null],
    RT: ['Heat Sink', 'ML', 'ML', 'ML (R)', null, null, null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'MG', 'MG', null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'PPC', 'PPC', 'PPC', null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
  },
})
