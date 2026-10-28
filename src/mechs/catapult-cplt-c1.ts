import { defineMech } from './defineMech'

/** CPLT-C1 Catapult: 65 tons, walk 4 / jump 4. Source: MegaMek mm-data, 3039u. */
export default defineMech({
  name: 'Catapult CPLT-C1',
  tonnage: 65,
  heatSinks: 15,
  leftArm: { hasLowerArm: false, hasHand: false },
  rightArm: { hasLowerArm: false, hasHand: false },
  armor: { HD: 9, CT: 24, CTR: 11, LT: 19, LTR: 8, RT: 19, RTR: 8, LA: 13, RA: 13, LL: 18, RL: 18 },
  weapons: [
    ['LRM15', 'LA'],
    ['LRM15', 'RA'],
    ['ML', 'LT'],
    ['ML', 'RT'],
    ['ML', 'CT'],
    ['ML', 'CT'],
  ],
  ammo: [
    ['LRM15', 'LT'],
    ['LRM15', 'RT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', 'Heat Sink', 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'ML', 'ML'],
    LT: ['Jump Jet', 'Jump Jet', 'ML', 'Ammo LRM15', null, null, null, null, null, null, null, null],
    RT: ['Jump Jet', 'Jump Jet', 'ML', 'Ammo LRM15', null, null, null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'LRM15', 'LRM15', 'LRM15', null, null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'LRM15', 'LRM15', 'LRM15', null, null, null, null, null, null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', 'Heat Sink'],
  },
})
