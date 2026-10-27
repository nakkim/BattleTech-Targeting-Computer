import type { Target } from '../rules/types'

/** Default targets, per MegaMek unit files (mm-data) and Sarna.net. Attacker 'Mechs are in src/mechs/. */

/** HBK-4G Hunchback: 50 tons, walk 4. AC/20 (RT), medium lasers (LA, RA), small laser (HD). */
export const HUNCHBACK_HBK_4G: Partial<Target> = { name: 'Hunchback HBK-4G', tonnage: 50 }

/** LCT-1V Locust: 20 tons, walk 8. Medium laser (CT), machine guns (LA, RA). */
export const LOCUST_LCT_1V: Partial<Target> = { name: 'Locust LCT-1V', tonnage: 20 }
