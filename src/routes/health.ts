import { Router } from 'express'
import mongoose from 'mongoose'
import { AppError } from '../lib/errors'

export const healthRouter = Router()

/**
 * Used by the host's health check and by the keep-alive ping. It really queries the database,
 * which also keeps the Atlas free cluster from being paused for inactivity.
 */
healthRouter.get('/health', async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db)
      throw new Error('not connected')
    await mongoose.connection.db.admin().ping()
    res.json({ status: 'ok', db: 'up' })
  } catch {
    throw new AppError(503, 'DB_UNAVAILABLE', 'Database is not reachable.')
  }
})
