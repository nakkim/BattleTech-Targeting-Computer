import { defineMech } from './defineMech'

/** COM-1D Commando: 25 tons, walk 6. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Commando COM-1D',
  tonnage: 25,
  heatSinks: 10,
  armor: { HD: 6, CT: 6, CTR: 2, LT: 5, LTR: 2, RT: 5, RTR: 2, LA: 4, RA: 4, LL: 6, RL: 6 },
  weapons: [
    ['LL', 'RA'],
    ['SRM6', 'CT'],
  ],
  ammo: [
    ['SRM6', 'LT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'SRM6', 'SRM6'],
    LT: ['Heat Sink', 'Heat Sink', 'Ammo SRM6', null, null, null, null, null, null, null, null, null],
    RT: ['Heat Sink', 'Heat Sink', null, null, null, null, null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', null, null, null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'LL', 'LL', null, null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', null, null],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', null, null],
  },
})
