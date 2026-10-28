import { defineMech } from './defineMech'

/** SHD-2H Shadow Hawk: 55 tons, walk 5 / jump 3. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Shadow Hawk SHD-2H',
  tonnage: 55,
  heatSinks: 12,
  armor: { HD: 9, CT: 23, CTR: 8, LT: 18, LTR: 6, RT: 18, RTR: 6, LA: 16, RA: 16, LL: 16, RL: 16 },
  weapons: [
    ['ML', 'RA'],
    ['AC5', 'LT'],
    ['LRM5', 'RT'],
    ['SRM2', 'HD'],
  ],
  ammo: [
    ['AC5', 'LT'],
    ['LRM5', 'RT'],
    ['SRM2', 'CT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', 'SRM2', 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Jump Jet', 'Ammo SRM2'],
    LT: ['Jump Jet', 'AC5', 'AC5', 'AC5', 'AC5', 'Ammo AC5', null, null, null, null, null, null],
    RT: ['Heat Sink', 'Jump Jet', 'LRM5', 'Ammo LRM5', null, null, null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', null, null, null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'ML', null, null, null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', null, null],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', null, null],
  },
})
