import { defineMech } from './defineMech'

/** GRF-1S Griffin: 55 tons, walk 5 / jump 5. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Griffin GRF-1S',
  tonnage: 55,
  heatSinks: 16,
  armor: { HD: 9, CT: 20, CTR: 7, LT: 20, LTR: 6, RT: 20, RTR: 6, LA: 14, RA: 14, LL: 18, RL: 18 },
  weapons: [
    ['LL', 'RA'],
    ['ML', 'RA'],
    ['ML', 'RA'],
    ['LRM5', 'LT'],
  ],
  ammo: [
    ['LRM5', 'RT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', 'Heat Sink', 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Jump Jet', null],
    LT: ['Jump Jet', 'Jump Jet', 'LRM5', null, null, null, null, null, null, null, null, null],
    RT: ['Jump Jet', 'Jump Jet', 'Ammo LRM5', null, null, null, null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', null, null, null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'LL', 'LL', 'ML', 'ML', null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
  },
})
