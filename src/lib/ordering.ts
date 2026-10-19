import type { ColumnId } from '../contract/schemas'
import { CardModel } from '../models/Card'
import { GAP, positionBetween } from './positions'

/** Rewrites every position in a column as GAP, 2*GAP, 3*GAP... Rare: only when gaps run out. */
export async function rebalanceColumn(columnId: ColumnId): Promise<void> {
  const cards = await CardModel.find({ columnId })
    .sort({ position: 1, _id: 1 })
    .select({ _id: 1 })
    .lean()
  if (cards.length === 0) return
  await CardModel.bulkWrite(
    cards.map((c, i) => ({
      updateOne: {
        filter: { _id: c._id },
        update: { $set: { position: (i + 1) * GAP } },
      },
    })),
  )
}

/** Position for a card that should land at `toIndex` in `columnId` (ignoring `excludeId`). */
export async function positionForIndex(
  columnId: ColumnId,
  toIndex: number,
  excludeId?: string,
): Promise<number> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const siblings = await CardModel.find(
      excludeId ? { columnId, _id: { $ne: excludeId } } : { columnId },
    )
      .sort({ position: 1, _id: 1 })
      .select({ position: 1 })
      .lean()
    const index = Math.min(toIndex, siblings.length)
    const position = positionBetween(siblings[index - 1]?.position, siblings[index]?.position)
    if (position !== null) return position
    await rebalanceColumn(columnId)
  }
  throw new Error(`Could not compute a position in column "${columnId}"`)
}

/** Position for a brand-new card: the end of the column. */
export async function positionAtEnd(columnId: ColumnId): Promise<number> {
  const last = await CardModel.findOne({ columnId })
    .sort({ position: -1 })
    .select({ position: 1 })
    .lean()
  return last ? last.position + GAP : GAP
}
