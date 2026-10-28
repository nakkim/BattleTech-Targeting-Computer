import { defineMech } from './defineMech'

/** AS7-D Atlas: 100 tons, walk 3. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Atlas AS7-D',
  tonnage: 100,
  heatSinks: 20,
  armor: { HD: 9, CT: 47, CTR: 14, LT: 32, LTR: 10, RT: 32, RTR: 10, LA: 34, RA: 34, LL: 41, RL: 41 },
  weapons: [
    ['ML', 'LA'],
    ['ML', 'RA'],
    ['LRM20', 'LT'],
    ['SRM6', 'LT'],
    ['AC20', 'RT'],
    ['ML', 'CT', 'rear'],
    ['ML', 'CT', 'rear'],
  ],
  ammo: [
    ['LRM20', 'LT'],
    ['LRM20', 'LT'],
    ['SRM6', 'LT'],
    ['AC20', 'RT'],
    ['AC20', 'RT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', 'Heat Sink', 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'ML (R)', 'ML (R)'],
    LT: ['Heat Sink', 'LRM20', 'LRM20', 'LRM20', 'LRM20', 'LRM20', 'SRM6', 'SRM6', 'Ammo LRM20', 'Ammo LRM20', 'Ammo SRM6', null],
    RT: ['AC20', 'AC20', 'AC20', 'AC20', 'AC20', 'AC20', 'AC20', 'AC20', 'AC20', 'AC20', 'Ammo AC20', 'Ammo AC20'],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'Heat Sink', 'ML', null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'Heat Sink', 'ML', null, null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
  },
})
