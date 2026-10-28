import { defineMech } from './defineMech'

/** AS7-RS Atlas: 100 tons, walk 3. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Atlas AS7-RS',
  tonnage: 100,
  heatSinks: 20,
  armor: { HD: 9, CT: 47, CTR: 14, LT: 32, LTR: 10, RT: 32, RTR: 10, LA: 34, RA: 34, LL: 41, RL: 41 },
  weapons: [
    ['LL', 'LA'],
    ['LL', 'RA'],
    ['LRM15', 'LT'],
    ['SRM4', 'LT'],
    ['AC10', 'RT'],
  ],
  ammo: [
    ['LRM15', 'LT'],
    ['LRM15', 'LT'],
    ['SRM4', 'LT'],
    ['AC10', 'RT'],
    ['AC10', 'RT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', 'Heat Sink', 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', null, null],
    LT: ['Heat Sink', 'LRM15', 'LRM15', 'LRM15', 'SRM4', 'Ammo LRM15', 'Ammo LRM15', 'Ammo SRM4', null, null, null, null],
    RT: ['AC10', 'AC10', 'AC10', 'AC10', 'AC10', 'AC10', 'AC10', 'Ammo AC10', 'Ammo AC10', null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'Heat Sink', 'LL', 'LL', null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'Heat Sink', 'LL', 'LL', null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
  },
})
