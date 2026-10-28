import { defineMech } from './defineMech'

/** WVR-6K Wolverine: 55 tons, walk 5. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Wolverine WVR-6K',
  tonnage: 55,
  heatSinks: 14,
  armor: { HD: 9, CT: 25, CTR: 10, LT: 20, LTR: 6, RT: 20, RTR: 6, LA: 18, RA: 18, LL: 26, RL: 26 },
  weapons: [
    ['LL', 'RA'],
    ['ML', 'RA'],
    ['SL', 'RA'],
    ['SRM6', 'LT'],
    ['ML', 'HD'],
  ],
  ammo: [
    ['SRM6', 'RT'],
    ['SRM6', 'RT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', 'ML', 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Heat Sink', null],
    LT: ['SRM6', 'SRM6', null, null, null, null, null, null, null, null, null, null],
    RT: ['Ammo SRM6', 'Ammo SRM6', null, null, null, null, null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', null, null, null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'LL', 'LL', 'ML', 'SL', null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', null],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', null],
  },
})
