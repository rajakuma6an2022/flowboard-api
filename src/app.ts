import express from 'express'
import helmet from 'helmet'
import { errorHandler, notFoundHandler } from './middleware/errors'
import { cardsRouter } from './routes/cards'
import { healthRouter } from './routes/health'

/** Builds the app without starting it, so tests can drive it with Supertest. */
export function createApp() {
  const app = express()

  // Plain `querystring` parsing: `?q[$ne]=x` stays a harmless string key, never a nested object.
  app.set('query parser', 'simple')
  app.disable('x-powered-by')

  app.use(helmet())
  app.use(express.json({ limit: '10kb' }))

  app.use('/api', healthRouter)
  app.use('/api', cardsRouter)
  app.use('/api', notFoundHandler)

  app.use(errorHandler)
  return app
}
