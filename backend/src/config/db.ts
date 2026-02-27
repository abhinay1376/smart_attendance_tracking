import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/smart_attendance'

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI)
    console.log(`[DB] Connected → ${MONGO_URI}`)
  } catch (err) {
    console.error('[DB] Connection failed:', err)
    process.exit(1)
  }
}

// Graceful shutdown
mongoose.connection.on('disconnected', () => {
  console.warn('[DB] Mongoose disconnected')
})
