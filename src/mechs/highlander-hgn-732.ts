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
})
