import { defineMech } from './defineMech'

/** BLR-1S BattleMaster: 85 tons, walk 4. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'BattleMaster BLR-1S',
  tonnage: 85,
  heatSinks: 20,
  armor: { HD: 9, CT: 40, CTR: 11, LT: 28, LTR: 8, RT: 28, RTR: 8, LA: 24, RA: 24, LL: 26, RL: 26 },
  weapons: [
    ['LRM15', 'LA'],
    ['SRM2', 'RA'],
    ['ML', 'LT'],
    ['ML', 'LT'],
    ['LRM5', 'LT'],
    ['SRM2', 'LT'],
    ['ML', 'RT'],
    ['ML', 'RT'],
  ],
  ammo: [
    ['LRM15', 'LA'],
    ['LRM5', 'LT'],
    ['SRM2', 'RT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', null, null],
    LT: ['Heat Sink', 'ML', 'ML', 'LRM5', 'SRM2', 'Ammo LRM5', null, null, null, null, null, null],
    RT: ['Heat Sink', 'Heat Sink', 'ML', 'ML', 'Ammo SRM2', null, null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'LRM15', 'LRM15', 'LRM15', 'Ammo LRM15', null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'SRM2', null, null, null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
  },
})
