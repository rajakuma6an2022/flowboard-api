import { ApiErrorBodySchema, CardSchema, parseBoard } from '../contract/schemas'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { useTestDb } from '../test/db'
import { app, createCard, getBoard, moveCard } from '../test/helpers'

useTestDb()

const MISSING_ID = '665f1c2e8b1e4a0012a4b0ff'

describe('POST /api/cards', () => {
  it('creates a card at the end of its column with version 1', async () => {
    const first = await createCard({ title: 'First', columnId: 'review' })
    const second = await createCard({ title: 'Second', columnId: 'review' })
    expect(CardSchema.safeParse(first).success).toBe(true)
    expect(first).toMatchObject({
      columnId: 'review',
      version: 1,
      description: '',
      dueDate: null,
    })
    expect(second.position).toBeGreaterThan(first.position)
  })

  it('defaults to the backlog column', async () => {
    expect((await createCard()).columnId).toBe('backlog')
  })

  it('rejects an empty title with a friendly VALIDATION error', async () => {
    const res = await request(app).post('/api/cards').send({ title: '   ', label: 'bug' })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ code: 'VALIDATION', message: 'Title is required' })
  })

  it('rejects an unknown label', async () => {
    const res = await request(app).post('/api/cards').send({ title: 'x', label: 'urgent' })
    expect(res.status).toBe(400)
    expect(ApiErrorBodySchema.safeParse(res.body).success).toBe(true)
  })
})

describe('GET /api/board', () => {
  it('returns an empty board', async () => {
    expect(await getBoard()).toEqual([])
  })

  it('returns cards ordered by column, then by position', async () => {
    await createCard({ title: 'Done 1', columnId: 'done' })
    await createCard({ title: 'Backlog 1', columnId: 'backlog' })
    await createCard({ title: 'Backlog 2', columnId: 'backlog' })
    await createCard({ title: 'Review 1', columnId: 'review' })
    const titles = (await getBoard()).map((c) => c.title)
    expect(titles).toEqual(['Backlog 1', 'Backlog 2', 'Review 1', 'Done 1'])
  })

  it('is valid input for the web client parser', async () => {
    await createCard({ title: 'A' })
    const res = await request(app).get('/api/board')
    expect(parseBoard(res.body)).toMatchObject({ skipped: 0, cards: [{ title: 'A' }] })
  })

  it('filters by search text and label', async () => {
    await createCard({ title: 'Keyboard drag', label: 'feature', description: 'sensors' })
    await createCard({
      title: 'Fix focus ring',
      label: 'bug',
      description: 'keyboard users',
    })
    await createCard({ title: 'Docs', label: 'chore' })
    expect((await getBoard('?q=keyboard')).map((c) => c.title).sort()).toEqual([
      'Fix focus ring',
      'Keyboard drag',
    ])
    expect((await getBoard('?q=KEYBOARD&label=bug')).map((c) => c.title)).toEqual([
      'Fix focus ring',
    ])
    expect(await getBoard('?label=chore')).toHaveLength(1)
  })

  it('treats search text literally: a regex like ".*" does not match everything', async () => {
    await createCard({ title: 'Something' })
    expect(await getBoard(`?q=${encodeURIComponent('.*')}`)).toEqual([])
  })

  it('rejects an unknown label', async () => {
    const res = await request(app).get('/api/board?label=nope')
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('VALIDATION')
  })

  it('never interprets operator-style query strings (NoSQL injection)', async () => {
    await createCard({ title: 'Visible' })
    const res = await request(app).get('/api/board?q[$ne]=zzz&label[$ne]=bug')
    expect(res.status).not.toBe(500)
    if (res.status === 200) expect(res.body.cards).toHaveLength(1) // operators were ignored, not applied
  })
})

describe('PATCH /api/cards/:id', () => {
  it('updates fields and bumps the version', async () => {
    const card = await createCard({ title: 'Old' })
    const res = await request(app)
      .patch(`/api/cards/${card.id}`)
      .send({ title: 'New', dueDate: '2026-12-01', version: card.version })
    expect(res.status).toBe(200)
    expect(res.body.card).toMatchObject({
      title: 'New',
      dueDate: '2026-12-01',
      version: 2,
    })
  })

  it('clears a field with null', async () => {
    const card = await createCard({ dueDate: '2026-12-01' })
    const res = await request(app)
      .patch(`/api/cards/${card.id}`)
      .send({ dueDate: null, version: 1 })
    expect(res.body.card.dueDate).toBeNull()
  })

  it('returns 409 VERSION_CONFLICT when the version is stale', async () => {
    const card = await createCard()
    await request(app).patch(`/api/cards/${card.id}`).send({ title: 'First edit', version: 1 })
    const res = await request(app)
      .patch(`/api/cards/${card.id}`)
      .send({ title: 'Stale edit', version: 1 })
    expect(res.status).toBe(409)
    expect(res.body.code).toBe('VERSION_CONFLICT')
    expect((await getBoard())[0]?.title).toBe('First edit')
  })

  it('lets exactly one of two simultaneous edits win', async () => {
    const card = await createCard()
    const attempt = (title: string) =>
      request(app).patch(`/api/cards/${card.id}`).send({ title, version: 1 })
    const results = await Promise.all([attempt('A'), attempt('B')])
    expect(results.map((r) => r.status).sort()).toEqual([200, 409])
  })

  it('returns 404 for an unknown card and 400 for a malformed id', async () => {
    const missing = await request(app)
      .patch(`/api/cards/${MISSING_ID}`)
      .send({ title: 'x', version: 1 })
    expect(missing.status).toBe(404)
    const bad = await request(app).patch('/api/cards/not-an-id').send({ title: 'x', version: 1 })
    expect(bad.status).toBe(400)
  })

  it('requires a version', async () => {
    const card = await createCard()
    const res = await request(app).patch(`/api/cards/${card.id}`).send({ title: 'x' })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/cards/:id/move', () => {
  it('moves a card to another column at a given index', async () => {
    const a = await createCard({ title: 'A', columnId: 'backlog' })
    await createCard({ title: 'R1', columnId: 'review' })
    await createCard({ title: 'R2', columnId: 'review' })

    const res = await moveCard(a.id, {
      toColumnId: 'review',
      toIndex: 1,
      version: a.version,
    })
    expect(res.status).toBe(200)
    expect(res.body.card).toMatchObject({ columnId: 'review', version: 2 })

    const review = (await getBoard()).filter((c) => c.columnId === 'review').map((c) => c.title)
    expect(review).toEqual(['R1', 'A', 'R2'])
  })

  it('moves to the top (index 0) and clamps a too-large index to the end', async () => {
    const x = await createCard({ title: 'X', columnId: 'done' })
    const y = await createCard({ title: 'Y', columnId: 'done' })
    const z = await createCard({ title: 'Z', columnId: 'backlog' })

    await moveCard(z.id, { toColumnId: 'done', toIndex: 0, version: 1 })
    expect(
      (await getBoard('?label=chore')).filter((c) => c.columnId === 'done').map((c) => c.title),
    ).toEqual(['Z', 'X', 'Y'])

    await moveCard(x.id, { toColumnId: 'done', toIndex: 999, version: x.version })
    expect((await getBoard()).filter((c) => c.columnId === 'done').map((c) => c.title)).toEqual([
      'Z',
      'Y',
      'X',
    ])
    expect(y.version).toBe(1)
  })

  it('reorders inside the same column', async () => {
    const [a, b, c] = [
      await createCard({ title: 'A' }),
      await createCard({ title: 'B' }),
      await createCard({ title: 'C' }),
    ]
    await moveCard(c.id, { toColumnId: 'backlog', toIndex: 0, version: c.version })
    expect((await getBoard()).map((x) => x.title)).toEqual(['C', 'A', 'B'])
    expect([a.version, b.version]).toEqual([1, 1])
  })

  it('does not touch other cards (only the moved card changes version)', async () => {
    const a = await createCard({ title: 'A' })
    const b = await createCard({ title: 'B' })
    await moveCard(a.id, { toColumnId: 'done', toIndex: 0, version: 1 })
    const board = await getBoard()
    expect(board.find((c) => c.id === b.id)?.version).toBe(1)
  })

  it('returns 409 for a stale version and 404 for an unknown card', async () => {
    const a = await createCard()
    await moveCard(a.id, { toColumnId: 'done', toIndex: 0, version: 1 })
    const stale = await moveCard(a.id, { toColumnId: 'review', toIndex: 0, version: 1 })
    expect(stale.status).toBe(409)
    expect(stale.body.code).toBe('VERSION_CONFLICT')
    const missing = await moveCard(MISSING_ID, {
      toColumnId: 'review',
      toIndex: 0,
      version: 1,
    })
    expect(missing.status).toBe(404)
  })

  it('validates the body', async () => {
    const a = await createCard()
    const res = await moveCard(a.id, { toColumnId: 'archived', toIndex: -1, version: 1 })
    expect(res.status).toBe(400)
  })

  it('keeps a correct order after many inserts at the same spot (forces a rebalance)', async () => {
    const top = await createCard({ title: 'top' })
    const bottom = await createCard({ title: 'bottom' })
    const inserted: string[] = []
    for (let i = 0; i < 45; i++) {
      const card = await createCard({ title: `e${i}`, columnId: 'review' })
      const res = await moveCard(card.id, {
        toColumnId: 'backlog',
        toIndex: 1,
        version: card.version,
      })
      expect(res.status).toBe(200)
      inserted.push(`e${i}`)
    }
    const backlog = (await getBoard()).filter((c) => c.columnId === 'backlog')
    // Each new card was inserted right after "top", so the newest comes first.
    expect(backlog.map((c) => c.title)).toEqual(['top', ...inserted.reverse(), 'bottom'])
    const positions = backlog.map((c) => c.position)
    expect(positions.every(Number.isFinite)).toBe(true)
    expect(new Set(positions).size).toBe(positions.length)
    expect([...positions].sort((x, y) => x - y)).toEqual(positions)
    expect(top.version).toBe(1)
    expect(bottom.version).toBe(1)
  }, 60_000)
})

describe('DELETE /api/cards/:id', () => {
  it('deletes a card, then returns 404 the second time', async () => {
    const card = await createCard()
    const first = await request(app).delete(`/api/cards/${card.id}`)
    expect(first.status).toBe(204)
    expect(await getBoard()).toEqual([])
    const second = await request(app).delete(`/api/cards/${card.id}`)
    expect(second.status).toBe(404)
  })
})
