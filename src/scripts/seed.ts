import { loadEnv } from '../config/env'
import { connectDb, disconnectDb } from '../db/connect'
import { CardModel } from '../models/Card'
import { buildSeedCards } from '../seed/data'

/**
 * Wipes the cards collection and inserts the demo board.
 * Run with `npm run seed`. It is also how you reset the live demo.
 */
async function main() {
  const env = loadEnv()
  await connectDb(env.MONGODB_URI, env.DB_NAME)
  await CardModel.init() // make sure indexes exist
  await CardModel.deleteMany({})
  const inserted = await CardModel.insertMany(buildSeedCards())
  console.log(`Seeded ${inserted.length} cards into "${env.DB_NAME}"`)
  await disconnectDb()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
