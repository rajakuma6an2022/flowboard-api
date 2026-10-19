import { describe, expect, it } from 'vitest'
import { escapeRegex, parseId } from './ids'

describe('parseId', () => {
  it('accepts a 24 character hex id', () => {
    expect(parseId('665f1c2e8b1e4a0012a4b001')).toBe('665f1c2e8b1e4a0012a4b001')
  })

  it('rejects anything else, including 12 character strings', () => {
    for (const bad of ['abc', '123456789012', '665f1c2e8b1e4a0012a4b00z', undefined, 42]) {
      expect(() => parseId(bad)).toThrow('Invalid card id.')
    }
  })
})

describe('escapeRegex', () => {
  it('escapes regex metacharacters so input is matched literally', () => {
    expect(escapeRegex('.*')).toBe('\\.\\*')
    expect(escapeRegex('a+b(c)')).toBe('a\\+b\\(c\\)')
  })
})
