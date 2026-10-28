import { defineMech } from './defineMech'

/** TDR-5SE Thunderbolt: 65 tons, walk 4 / jump 4. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Thunderbolt TDR-5SE',
  tonnage: 65,
  heatSinks: 17,
  armor: { HD: 9, CT: 30, CTR: 11, LT: 24, LTR: 6, RT: 24, RTR: 6, LA: 20, RA: 20, LL: 29, RL: 29 },
  weapons: [
    ['LL', 'RA'],
    ['LRM10', 'LT'],
    ['ML', 'LT'],
    ['ML', 'LT'],
    ['ML', 'LT'],
  ],
  ammo: [
    ['LRM10', 'CT'],
    ['LRM10', 'CT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Ammo LRM10', 'Ammo LRM10'],
    LT: ['Jump Jet', 'Jump Jet', 'LRM10', 'LRM10', 'ML', 'ML', 'ML', null, null, null, null, null],
    RT: ['Heat Sink', 'Heat Sink', 'Heat Sink', 'Jump Jet', 'Jump Jet', null, null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', null, null, null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'LL', 'LL', null, null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
  },
})
