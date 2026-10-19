/**
 * THE DATA CONTRACT between the API and the web app.
 *
 * This file is OWNED by this repository (flowboard-api). The web repository (flowboard) keeps an
 * identical copy at src/lib/schemas.ts, and its CI fails if the two differ (contract drift check).
 * To change the contract: edit it here first, release the API, then copy the file to the web repo.
 * This file may only import from 'zod'.
 */
import { z } from 'zod'

/**
 * Single source of truth for data shapes (see ADR-003).
 * TypeScript types are inferred from these schemas; never hand-write a duplicate type.
 *
 * Direction of trust:
 *  - the API validates everything that comes IN (request bodies and query strings)
 *  - the web app validates everything that comes OUT of the network (responses)
 */

export const COLUMNS = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
] as const

export const COLUMN_IDS = ['backlog', 'in-progress', 'review', 'done'] as const
export const LABELS = ['feature', 'bug', 'design', 'chore'] as const

export const ColumnIdSchema = z.enum(COLUMN_IDS)
export const LabelSchema = z.enum(LABELS)

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')

export const CardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(80),
  description: z.string().max(500),
  label: LabelSchema,
  columnId: ColumnIdSchema,
  /**
   * Sort key inside a column. A float, not an index: moving a card only rewrites ONE
   * document (see ADR-004). Never show it to users and never assume it is an integer.
   */
  position: z.number().finite(),
  dueDate: isoDate.nullable(),
  assignee: z.string().nullable(),
  /** Incremented by the server on every change. Used for conflict detection (HTTP 409). */
  version: z.number().int().min(1),
})

export const CreateCardInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(80, 'Title must be 80 characters or fewer'),
  description: z.string().max(500, 'Description must be 500 characters or fewer').optional(),
  label: LabelSchema,
  columnId: ColumnIdSchema.optional(),
  dueDate: isoDate.nullable().optional(),
  assignee: z.string().nullable().optional(),
})

export const UpdateCardInputSchema = CreateCardInputSchema.omit({ columnId: true })
  .partial()
  .extend({ version: z.number().int().min(1) })

export const MoveCardInputSchema = z.object({
  toColumnId: ColumnIdSchema,
  /** Where the card should end up inside the target column (0 = top). Clamped by the server. */
  toIndex: z.number().int().min(0),
  version: z.number().int().min(1),
})

export const BoardQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  label: LabelSchema.optional(),
})

export const ApiErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
})

export const CardResponseSchema = z.object({ card: CardSchema })

/** Cards are `unknown[]` on purpose: one bad card must not break the whole board. */
export const BoardResponseSchema = z.object({ cards: z.array(z.unknown()) })

export type ColumnId = z.infer<typeof ColumnIdSchema>
export type Label = z.infer<typeof LabelSchema>
export type Card = z.infer<typeof CardSchema>
export type CreateCardInput = z.infer<typeof CreateCardInputSchema>
export type UpdateCardInput = z.infer<typeof UpdateCardInputSchema>
export type MoveCardInput = z.infer<typeof MoveCardInputSchema>
export type BoardFilters = z.infer<typeof BoardQuerySchema>

export interface BoardData {
  cards: Card[]
  /** How many items from the server failed validation and were dropped. */
  skipped: number
}

/**
 * Validates a board response item by item. Valid cards are kept, invalid ones are counted.
 * Throws (ZodError) only when the overall response shape is wrong.
 */
export function parseBoard(json: unknown): BoardData {
  const { cards: raw } = BoardResponseSchema.parse(json)
  const cards: Card[] = []
  let skipped = 0
  for (const item of raw) {
    const result = CardSchema.safeParse(item)
    if (result.success) cards.push(result.data)
    else skipped += 1
  }
  return { cards, skipped }
}
