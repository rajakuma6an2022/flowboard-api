import { describe, expect, it } from 'vitest'
import {
  BoardQuerySchema,
  CardSchema,
  CreateCardInputSchema,
  MoveCardInputSchema,
  parseBoard,
} from './schemas'

const validCard = {
  id: '665f1c2e8b1e4a0012a4b001',
  title: 'Add keyboard sensor',
  description: 'Support Space, arrows and Escape.',
  label: 'feature',
  columnId: 'backlog',
  position: 1024,
  dueDate: '2026-11-20',
  assignee: 'AK',
  version: 1,
}

describe('CardSchema', () => {
  it('accepts a valid card', () => {
    expect(CardSchema.safeParse(validCard).success).toBe(true)
  })

  it('accepts a fractional or negative position (fractional ordering, ADR-004)', () => {
    expect(CardSchema.safeParse({ ...validCard, position: 1536.5 }).success).toBe(true)
    expect(CardSchema.safeParse({ ...validCard, position: -1024 }).success).toBe(true)
  })

  it('rejects an unknown column, an empty title and a non-finite position', () => {
    expect(CardSchema.safeParse({ ...validCard, columnId: 'archived' }).success).toBe(false)
    expect(CardSchema.safeParse({ ...validCard, title: '' }).success).toBe(false)
    expect(CardSchema.safeParse({ ...validCard, position: Infinity }).success).toBe(false)
  })
})

describe('input schemas', () => {
  it('reports a friendly message for an empty title', () => {
    const result = CreateCardInputSchema.safeParse({ title: '   ', label: 'bug' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Title is required')
  })

  it('requires a non-negative integer index to move a card', () => {
    expect(
      MoveCardInputSchema.safeParse({ toColumnId: 'done', toIndex: 0, version: 1 }).success,
    ).toBe(true)
    expect(
      MoveCardInputSchema.safeParse({ toColumnId: 'done', toIndex: -1, version: 1 }).success,
    ).toBe(false)
    expect(
      MoveCardInputSchema.safeParse({ toColumnId: 'done', toIndex: 1.5, version: 1 }).success,
    ).toBe(false)
  })

  it('rejects non-string query values (blocks operator injection like q[$ne]=x)', () => {
    expect(BoardQuerySchema.safeParse({ q: { $ne: 'x' } }).success).toBe(false)
    expect(BoardQuerySchema.safeParse({ label: 'nope' }).success).toBe(false)
  })
})

describe('parseBoard', () => {
  it('keeps valid cards and counts invalid ones', () => {
    const result = parseBoard({ cards: [validCard, { id: 'x' }, 42] })
    expect(result.cards).toHaveLength(1)
    expect(result.skipped).toBe(2)
  })

  it('throws when the overall shape is wrong', () => {
    expect(() => parseBoard({ items: [] })).toThrow()
  })
})
