import { defineMech } from './defineMech'

/** GRF-1N Griffin: 55 tons, walk 5 / jump 5. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Griffin GRF-1N',
  tonnage: 55,
  heatSinks: 12,
  armor: { HD: 9, CT: 20, CTR: 7, LT: 20, LTR: 6, RT: 20, RTR: 6, LA: 14, RA: 14, LL: 18, RL: 18 },
  weapons: [
    ['PPC', 'RA'],
    ['LRM10', 'RT'],
  ],
  ammo: [
    ['LRM10', 'RT'],
    ['LRM10', 'RT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Heat Sink', 'Jump Jet'],
    LT: ['Jump Jet', 'Jump Jet', null, null, null, null, null, null, null, null, null, null],
    RT: ['Jump Jet', 'Jump Jet', 'LRM10', 'LRM10', 'Ammo LRM10', 'Ammo LRM10', null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', null, null, null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'PPC', 'PPC', 'PPC', null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', null, null],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', null, null],
  },
})
