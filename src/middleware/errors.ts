import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { AppError, notFound } from '../lib/errors'

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound('Route'))
}

interface BodyParserError extends Error {
  type?: string
  status?: number
}

/**
 * One place that turns every failure into `{ code, message }`, the same shape the web
 * app's ApiErrorBodySchema expects. Unknown errors never leak details to the client.
 */
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ code: err.code, message: err.message })
    return
  }
  if (err instanceof ZodError) {
    res
      .status(400)
      .json({ code: 'VALIDATION', message: err.issues[0]?.message ?? 'Invalid request.' })
    return
  }
  const parserError = err as BodyParserError
  if (parserError?.type === 'entity.parse.failed') {
    res.status(400).json({ code: 'INVALID_JSON', message: 'Request body is not valid JSON.' })
    return
  }
  if (parserError?.type === 'entity.too.large') {
    res.status(413).json({ code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' })
    return
  }
  if (process.env.NODE_ENV !== 'test') console.error(err)
  res.status(500).json({ code: 'SERVER_ERROR', message: 'Something went wrong on our side.' })
}
