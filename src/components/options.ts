import { ARC_NAMES } from '../rules/tables'
import type { Arc, Terrain } from '../rules/types'

/** Segmented options with color tones matching the hex diagrams. */
export interface ToneOption<T> {
  value: T
  label: string
  tone?: string
}

export const ARC_OPTIONS: ToneOption<Arc>[] = (Object.keys(ARC_NAMES) as Arc[]).map((a) => ({
  value: a,
  label: ARC_NAMES[a],
  tone: a === 'left' || a === 'right' ? 'side' : a,
}))

export const TERRAIN_OPTIONS: ToneOption<Terrain>[] = [
  { value: 'clear', label: 'Clear', tone: 'clear' },
  { value: 'light', label: 'Light woods', tone: 'light' },
  { value: 'heavy', label: 'Heavy woods', tone: 'heavy' },
]

export const WATER_OPTIONS: ToneOption<number>[] = [
  { value: 0, label: 'None', tone: 'clear' },
  { value: 1, label: 'Depth 1', tone: 'water1' },
  { value: 2, label: 'Depth 2+', tone: 'water2' },
]
