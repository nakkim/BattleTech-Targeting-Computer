import { defineMech } from './defineMech'

/** AWS-8V Awesome: 80 tons, walk 3. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Awesome AWS-8V',
  tonnage: 80,
  heatSinks: 28,
  rightArm: { hasHand: false },
  armor: { HD: 9, CT: 30, CTR: 19, LT: 24, LTR: 10, RT: 24, RTR: 10, LA: 24, RA: 24, LL: 33, RL: 33 },
  weapons: [
    ['PPC', 'RA'],
    ['LL', 'LT'],
    ['LRM15', 'RT'],
    ['SL', 'HD'],
  ],
  ammo: [
    ['LRM15', 'CT'],
    ['LRM15', 'CT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', 'SL', 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Ammo LRM15', 'Ammo LRM15'],
    LT: ['Heat Sink', 'Heat Sink', 'Heat Sink', 'Heat Sink', 'Heat Sink', 'Heat Sink', 'Heat Sink', 'LL', 'LL', null, null, null],
    RT: ['Heat Sink', 'Heat Sink', 'Heat Sink', 'Heat Sink', 'Heat Sink', 'Heat Sink', 'LRM15', 'LRM15', 'LRM15', null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'Heat Sink', 'Heat Sink', null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'PPC', 'PPC', 'PPC', null, null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
  },
})
