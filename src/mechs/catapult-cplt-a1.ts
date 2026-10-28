import { defineMech } from './defineMech'

/** CPLT-A1 Catapult: 65 tons, walk 4 / jump 4. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Catapult CPLT-A1',
  tonnage: 65,
  heatSinks: 15,
  leftArm: { hasLowerArm: false, hasHand: false },
  rightArm: { hasLowerArm: false, hasHand: false },
  armor: { HD: 9, CT: 24, CTR: 11, LT: 21, LTR: 9, RT: 21, RTR: 9, LA: 20, RA: 20, LL: 24, RL: 24 },
  weapons: [
    ['LRM15', 'LA'],
    ['LRM15', 'RA'],
  ],
  ammo: [
    ['LRM15', 'LT'],
    ['LRM15', 'LT'],
    ['LRM15', 'RT'],
    ['LRM15', 'RT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Heat Sink', null],
    LT: ['Jump Jet', 'Jump Jet', 'Ammo LRM15', 'Ammo LRM15', null, null, null, null, null, null, null, null],
    RT: ['Jump Jet', 'Jump Jet', 'Ammo LRM15', 'Ammo LRM15', null, null, null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'LRM15', 'LRM15', 'LRM15', null, null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'LRM15', 'LRM15', 'LRM15', null, null, null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
  },
})
