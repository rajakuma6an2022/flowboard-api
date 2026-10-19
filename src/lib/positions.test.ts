import { describe, expect, it } from 'vitest'
import { GAP, positionBetween } from './positions'

describe('positionBetween', () => {
  it('uses GAP for an empty column', () => {
    expect(positionBetween(undefined, undefined)).toBe(GAP)
  })

  it('goes above the first card and below the last card', () => {
    expect(positionBetween(undefined, 1024)).toBe(0)
    expect(positionBetween(2048, undefined)).toBe(3072)
  })

  it('returns the midpoint between two neighbours', () => {
    expect(positionBetween(1024, 2048)).toBe(1536)
    expect(positionBetween(1, 2)).toBe(1.5)
  })

  it('asks for a rebalance when there is no room left', () => {
    expect(positionBetween(1, 1)).toBeNull()
    expect(positionBetween(1, 1 + 1e-9)).toBeNull()
  })

  it('always returns a value strictly between its neighbours', () => {
    const p = positionBetween(10, 12)
    expect(p).not.toBeNull()
    expect(p!).toBeGreaterThan(10)
    expect(p!).toBeLessThan(12)
  })
})
