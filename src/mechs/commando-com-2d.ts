import { defineMech } from './defineMech'

/** COM-2D Commando: 25 tons, walk 6. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Commando COM-2D',
  tonnage: 25,
  heatSinks: 10,
  armor: { HD: 6, CT: 8, CTR: 4, LT: 6, LTR: 3, RT: 6, RTR: 3, LA: 6, RA: 6, LL: 8, RL: 8 },
  weapons: [
    ['ML', 'LA'],
    ['SRM4', 'RA'],
    ['SRM6', 'CT'],
  ],
  ammo: [
    ['SRM6', 'LT'],
    ['SRM4', 'RT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'SRM6', 'SRM6'],
    LT: ['Heat Sink', 'Heat Sink', 'Ammo SRM6', null, null, null, null, null, null, null, null, null],
    RT: ['Heat Sink', 'Heat Sink', 'Ammo SRM4', null, null, null, null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'ML', null, null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'SRM4', null, null, null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', null, null],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', null, null],
  },
})
