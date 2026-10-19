import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { CardModel } from '../models/Card'

let memoryServer: { stop: () => Promise<unknown> } | undefined

/**
 * Connects to a throwaway database.
 *  - CI sets TEST_MONGODB_URI to a Mongo service container.
 *  - Locally, mongodb-memory-server downloads and starts a real mongod (first run is slow).
 * Every test file gets its own database name, so files can run in parallel safely.
 */
async function connectTestDb(): Promise<void> {
  let uri = process.env.TEST_MONGODB_URI
  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    const server = await MongoMemoryServer.create()
    memoryServer = server
    uri = server.getUri()
  }
  await mongoose.connect(uri, { dbName: `flowboard_test_${randomUUID().replaceAll('-', '')}` })
  await CardModel.init()
}

async function disconnectTestDb(): Promise<void> {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
  await memoryServer?.stop()
}

/**
 * Call once at the top of any test file that needs MongoDB. Pure tests (contract, ids,
 * positions) do not call it, so they run without a database.
 */
export function useTestDb(): void {
  process.env.NODE_ENV = 'test'
  beforeAll(connectTestDb)
  afterEach(() => CardModel.deleteMany({}))
  afterAll(disconnectTestDb)
}
