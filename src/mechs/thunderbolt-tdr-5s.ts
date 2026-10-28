import { defineMech } from './defineMech'

/** TDR-5S Thunderbolt: 65 tons, walk 4. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Thunderbolt TDR-5S',
  tonnage: 65,
  heatSinks: 15,
  armor: { HD: 9, CT: 30, CTR: 11, LT: 24, LTR: 6, RT: 24, RTR: 6, LA: 20, RA: 20, LL: 29, RL: 29 },
  weapons: [
    ['MG', 'LA'],
    ['MG', 'LA'],
    ['LL', 'RA'],
    ['ML', 'LT'],
    ['ML', 'LT'],
    ['ML', 'LT'],
    ['LRM15', 'RT'],
    ['SRM2', 'RT'],
  ],
  ammo: [
    ['MG', 'LA'],
    ['SRM2', 'RT'],
    ['LRM15', 'CT'],
    ['LRM15', 'CT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', 'Heat Sink', 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Ammo LRM15', 'Ammo LRM15'],
    LT: ['ML', 'ML', 'ML', null, null, null, null, null, null, null, null, null],
    RT: ['LRM15', 'LRM15', 'LRM15', 'SRM2', 'Ammo SRM2', null, null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'MG', 'MG', 'Ammo MG', null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'LL', 'LL', null, null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
  },
})
