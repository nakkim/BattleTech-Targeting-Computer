/** Number of ways to roll each total on 2D6. */
export const TWO_D6_WAYS: Record<number, number> = {
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
  8: 5,
  9: 4,
  10: 3,
  11: 2,
  12: 1,
}

export function probability2d6(total: number): number {
  return (TWO_D6_WAYS[total] ?? 0) / 36
}

/**
 * Chance to roll the Target Number or higher on 2D6.
 * A Target Number of 2 or less always hits; above 12 always misses (rulebook p. 15).
 */
export function chanceToHit(targetNumber: number): number {
  if (targetNumber <= 2) return 1
  if (targetNumber > 12) return 0
  let ways = 0
  for (let roll = targetNumber; roll <= 12; roll++) ways += TWO_D6_WAYS[roll]
  return ways / 36
}

export function formatPercent(p: number): string {
  if (p === 0) return '0%'
  if (p === 1) return '100%'
  const pct = p * 100
  return `${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`
}
