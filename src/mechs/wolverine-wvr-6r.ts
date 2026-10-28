import { defineMech } from './defineMech'

/** WVR-6R Wolverine: 55 tons, walk 5 / jump 5. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Wolverine WVR-6R',
  tonnage: 55,
  heatSinks: 12,
  armor: { HD: 8, CT: 20, CTR: 8, LT: 20, LTR: 6, RT: 20, RTR: 6, LA: 16, RA: 16, LL: 16, RL: 16 },
  weapons: [
    ['AC5', 'RA'],
    ['SRM6', 'LT'],
    ['ML', 'HD'],
  ],
  ammo: [
    ['AC5', 'RA'],
    ['SRM6', 'LT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', 'ML', 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Jump Jet', null],
    LT: ['SRM6', 'SRM6', 'Ammo SRM6', null, null, null, null, null, null, null, null, null],
    RT: ['Heat Sink', null, null, null, null, null, null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', null, null, null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'AC5', 'AC5', 'AC5', 'AC5', 'Ammo AC5', null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Jump Jet', 'Jump Jet'],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Jump Jet', 'Jump Jet'],
  },
})
