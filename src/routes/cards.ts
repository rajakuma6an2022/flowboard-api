import {
  BoardQuerySchema,
  COLUMN_IDS,
  CreateCardInputSchema,
  MoveCardInputSchema,
  UpdateCardInputSchema,
  type ColumnId,
} from '../contract/schemas'
import { Router } from 'express'
import type { QueryFilter } from 'mongoose'
import { AppError, notFound, versionConflict } from '../lib/errors'
import { escapeRegex, parseId } from '../lib/ids'
import { positionAtEnd, positionForIndex } from '../lib/ordering'
import { CardModel, toCardDTO, type CardDoc } from '../models/Card'

export const cardsRouter = Router()

const columnOrder = new Map<ColumnId, number>(COLUMN_IDS.map((id, i) => [id, i]))

/** The write failed because nothing matched {_id, version}: either gone (404) or stale (409). */
async function failedWrite(id: string): Promise<AppError> {
  const exists = await CardModel.exists({ _id: id })
  return exists ? versionConflict() : notFound('Card')
}

cardsRouter.get('/board', async (req, res) => {
  const { q, label } = BoardQuerySchema.parse({ q: req.query.q, label: req.query.label })

  const filter: QueryFilter<CardDoc> = {}
  if (label) filter.label = label
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' }
    filter.$or = [{ title: rx }, { description: rx }]
  }

  const docs = await CardModel.find(filter).sort({ position: 1, _id: 1 }).lean()
  // Stable sort: columns in board order, positions already ordered within each column.
  const cards = docs
    .map(toCardDTO)
    .sort((a, b) => (columnOrder.get(a.columnId) ?? 0) - (columnOrder.get(b.columnId) ?? 0))
  res.json({ cards })
})

cardsRouter.post('/cards', async (req, res) => {
  const input = CreateCardInputSchema.parse(req.body)
  const columnId = input.columnId ?? 'backlog'
  const doc = await CardModel.create({
    title: input.title,
    description: input.description ?? '',
    label: input.label,
    columnId,
    position: await positionAtEnd(columnId),
    dueDate: input.dueDate ?? null,
    assignee: input.assignee ?? null,
    version: 1,
  })
  res.status(201).json({ card: toCardDTO(doc) })
})

cardsRouter.patch('/cards/:id', async (req, res) => {
  const id = parseId(req.params.id)
  const { version, ...changes } = UpdateCardInputSchema.parse(req.body)

  // Compare-and-set: the write only happens if the version is still the one the client saw.
  const updated = await CardModel.findOneAndUpdate(
    { _id: id, version },
    { $set: changes, $inc: { version: 1 } },
    { returnDocument: 'after', runValidators: true },
  ).lean()
  if (!updated) throw await failedWrite(id)
  res.json({ card: toCardDTO(updated) })
})

cardsRouter.post('/cards/:id/move', async (req, res) => {
  const id = parseId(req.params.id)
  const { toColumnId, toIndex, version } = MoveCardInputSchema.parse(req.body)

  const current = await CardModel.findById(id).select({ version: 1 }).lean()
  if (!current) throw notFound('Card')
  if (current.version !== version) throw versionConflict()

  const position = await positionForIndex(toColumnId, toIndex, id)

  // ONE document is written, and only if nobody changed it in the meantime (ADR-004).
  const moved = await CardModel.findOneAndUpdate(
    { _id: id, version },
    { $set: { columnId: toColumnId, position }, $inc: { version: 1 } },
    { returnDocument: 'after' },
  ).lean()
  if (!moved) throw await failedWrite(id)
  res.json({ card: toCardDTO(moved) })
})

cardsRouter.delete('/cards/:id', async (req, res) => {
  const id = parseId(req.params.id)
  const deleted = await CardModel.findByIdAndDelete(id).lean()
  if (!deleted) throw notFound('Card')
  res.status(204).end()
})
