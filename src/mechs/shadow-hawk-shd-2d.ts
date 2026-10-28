import { defineMech } from './defineMech'

/** SHD-2D Shadow Hawk: 55 tons, walk 5 / jump 3. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Shadow Hawk SHD-2D',
  tonnage: 55,
  heatSinks: 14,
  armor: { HD: 6, CT: 12, CTR: 6, LT: 9, LTR: 5, RT: 9, RTR: 5, LA: 5, RA: 5, LL: 5, RL: 5 },
  weapons: [
    ['ML', 'LA'],
    ['ML', 'RA'],
    ['AC5', 'LT'],
    ['LRM5', 'RT'],
    ['SRM2', 'CT'],
    ['SRM2', 'HD'],
  ],
  ammo: [
    ['AC5', 'LT'],
    ['SRM2', 'LT'],
    ['LRM5', 'RT'],
    ['SRM2', 'RT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', 'SRM2', 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Jump Jet', 'SRM2'],
    LT: ['Jump Jet', 'AC5', 'AC5', 'AC5', 'AC5', 'Ammo AC5', 'Ammo SRM2', null, null, null, null, null],
    RT: ['Heat Sink', 'Heat Sink', 'Heat Sink', 'Jump Jet', 'LRM5', 'Ammo LRM5', 'Ammo SRM2', null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'ML', null, null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'ML', null, null, null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', null, null],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', null, null],
  },
})
