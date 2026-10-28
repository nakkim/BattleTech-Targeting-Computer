import { defineMech } from './defineMech'

/** SHD-2K Shadow Hawk: 55 tons, walk 5 / jump 3. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Shadow Hawk SHD-2K',
  tonnage: 55,
  heatSinks: 17,
  armor: { HD: 9, CT: 23, CTR: 8, LT: 18, LTR: 6, RT: 18, RTR: 6, LA: 16, RA: 16, LL: 16, RL: 16 },
  weapons: [
    ['PPC', 'LT'],
    ['LRM5', 'RT'],
  ],
  ammo: [
    ['LRM5', 'RT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Jump Jet', null],
    LT: ['Heat Sink', 'Jump Jet', 'PPC', 'PPC', 'PPC', null, null, null, null, null, null, null],
    RT: ['Heat Sink', 'Jump Jet', 'LRM5', 'Ammo LRM5', null, null, null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', null, null, null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', null, null, null, null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
  },
})
