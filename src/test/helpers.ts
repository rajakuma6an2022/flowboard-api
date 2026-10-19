import type { Card, CreateCardInput } from '../contract/schemas'
import request from 'supertest'
import { createApp } from '../app'

export const app = createApp()

export async function createCard(input: Partial<CreateCardInput> = {}): Promise<Card> {
  const res = await request(app)
    .post('/api/cards')
    .send({ title: 'Task', label: 'chore', ...input })
  if (res.status !== 201)
    throw new Error(`createCard failed: ${res.status} ${JSON.stringify(res.body)}`)
  return res.body.card as Card
}

export async function getBoard(query = ''): Promise<Card[]> {
  const res = await request(app).get(`/api/board${query}`)
  if (res.status !== 200)
    throw new Error(`getBoard failed: ${res.status} ${JSON.stringify(res.body)}`)
  return res.body.cards as Card[]
}

export async function moveCard(
  id: string,
  body: { toColumnId: string; toIndex: number; version: number },
) {
  return request(app).post(`/api/cards/${id}/move`).send(body)
}
