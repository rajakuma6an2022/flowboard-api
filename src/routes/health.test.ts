import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { useTestDb } from '../test/db'
import { app } from '../test/helpers'

useTestDb()

describe('GET /api/health', () => {
  it('reports the database as up', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok', db: 'up' })
  })
})

describe('app hardening', () => {
  it('sends security headers and hides the framework', async () => {
    const res = await request(app).get('/api/health')
    expect(res.headers['x-powered-by']).toBeUndefined()
    expect(res.headers['x-content-type-options']).toBe('nosniff')
  })

  it('returns a JSON 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ code: 'NOT_FOUND' })
  })

  it('returns 400 INVALID_JSON for a broken body', async () => {
    const res = await request(app)
      .post('/api/cards')
      .set('Content-Type', 'application/json')
      .send('{"title":')
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('INVALID_JSON')
  })

  it('returns 413 for a body over the size limit', async () => {
    const res = await request(app)
      .post('/api/cards')
      .send({ title: 'x', label: 'bug', description: 'y'.repeat(20_000) })
    expect(res.status).toBe(413)
    expect(res.body.code).toBe('PAYLOAD_TOO_LARGE')
  })
})
