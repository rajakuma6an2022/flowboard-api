import { COLUMN_IDS, LABELS, type Card } from '../contract/schemas'
import { Schema, model, type HydratedDocument } from 'mongoose'

/** What is stored in MongoDB. `_id` becomes `id` in the API response (see toCardDTO). */
export type CardDoc = Omit<Card, 'id'>

const cardSchema = new Schema<CardDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 500 },
    label: { type: String, enum: LABELS, required: true },
    columnId: { type: String, enum: COLUMN_IDS, required: true },
    position: { type: Number, required: true },
    dueDate: { type: String, default: null },
    assignee: { type: String, default: null },
    version: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true, versionKey: false },
)

// Every board read sorts by position inside a column.
cardSchema.index({ columnId: 1, position: 1 })

export const CardModel = model<CardDoc>('Card', cardSchema)

type LeanCard = CardDoc & { _id: { toString(): string } }

export function toCardDTO(doc: LeanCard | HydratedDocument<CardDoc>): Card {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    label: doc.label,
    columnId: doc.columnId,
    position: doc.position,
    dueDate: doc.dueDate ?? null,
    assignee: doc.assignee ?? null,
    version: doc.version,
  }
}
