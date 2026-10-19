import { createApp } from './app'
import { loadEnv } from './config/env'
import { connectDb, disconnectDb } from './db/connect'

async function main() {
  const env = loadEnv()
  await connectDb(env.MONGODB_URI, env.DB_NAME)
  console.log(`MongoDB connected (db: ${env.DB_NAME})`)

  const server = createApp().listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`)
  })

  // Hosts send SIGTERM on deploy/restart: stop accepting requests, then close the DB cleanly.
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`)
    server.close(async () => {
      await disconnectDb()
      process.exit(0)
    })
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
