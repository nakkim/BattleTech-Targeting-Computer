import { defineMech } from './defineMech'

/** HGN-732 Highlander: 90 tons, walk 3 / jump 3. Source: MegaMek mm-data, 3050U. Both torsos have CASE (not used by these rules). */
export default defineMech({
  name: 'Highlander HGN-732',
  tonnage: 90,
  heatSinks: 12,
  rightArm: { hasHand: false },
  armor: { HD: 9, CT: 40, CTR: 16, LT: 28, LTR: 10, RT: 28, RTR: 10, LA: 30, RA: 30, LL: 38, RL: 38 },
  weapons: [
    ['SRM6', 'LA'],
    ['GAUSS', 'RA'],
    ['LRM20', 'LT'],
    ['ML', 'RT'],
    ['ML', 'RT'],
  ],
  ammo: [
    ['SRM6', 'LT'],
    ['SRM6', 'LT'],
    ['LRM20', 'LT'],
    ['LRM20', 'LT'],
    ['GAUSS', 'RT'],
    ['GAUSS', 'RT'],
  ],
  // Critical Hit Table, slot by slot from the top; null is an empty (Roll Again) slot.
  criticalSlots: {
    HD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
    CT: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Jump Jet', null],
    LT: ['Jump Jet', 'LRM20', 'LRM20', 'LRM20', 'LRM20', 'LRM20', 'Ammo SRM6', 'Ammo SRM6', 'Ammo LRM20', 'Ammo LRM20', 'CASE', null],
    RT: ['Jump Jet', 'ML', 'ML', 'Ammo GAUSS', 'Ammo GAUSS', 'CASE', null, null, null, null, null, null],
    LA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand', 'SRM6', 'SRM6', null, null, null, null, null, null],
    RA: ['Shoulder', 'Upper Arm', 'Lower Arm', 'GAUSS', 'GAUSS', 'GAUSS', 'GAUSS', 'GAUSS', 'GAUSS', 'GAUSS', null, null],
    LL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', null],
    RL: ['Hip', 'Upper Leg', 'Lower Leg', 'Foot', 'Heat Sink', null],
  },
})
