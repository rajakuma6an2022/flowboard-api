import mongoose from 'mongoose'

export async function connectDb(uri: string, dbName: string): Promise<void> {
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 8000 })
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect()
}
