/** Distance between neighbours when positions are (re)assigned. */
export const GAP = 1024
/** Below this distance two positions are too close to split again, so we rebalance. */
export const MIN_GAP = 1e-6

/**
 * Pure function: the position that sorts strictly between `before` and `after`.
 * Returns null when there is no room left and the column must be rebalanced.
 */
export function positionBetween(
  before: number | undefined,
  after: number | undefined,
): number | null {
  if (before === undefined && after === undefined) return GAP
  if (before === undefined) return (after as number) - GAP
  if (after === undefined) return before + GAP
  if (after - before < MIN_GAP) return null
  const mid = (before + after) / 2
  return mid > before && mid < after ? mid : null
}
