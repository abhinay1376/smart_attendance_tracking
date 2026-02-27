/**
 * index.ts  –  Server entry point
 * ─────────────────────────────────────────────────────────────────────────
 * Wires up Express + MongoDB and starts listening.
 *
 * Environment variables (see .env.example):
 *   PORT       – default 3000
 *   MONGO_URI  – default mongodb://localhost:27017/smart_attendance
 *   ORIGIN     – CORS allowed origin (frontend dev server, e.g. http://localhost:5173)
 *   NODE_ENV   – "production" | "development"  (default "development")
 */

import 'dotenv/config'
import express          from 'express'
import helmet           from 'helmet'
import cors             from 'cors'
import morgan           from 'morgan'

import { connectDB }    from './config/db'
import { User }         from './models/User'

import authRoutes       from './routes/auth'
import adminRoutes      from './routes/admin'
import facultyRoutes    from './routes/faculty'
import studentRoutes    from './routes/student'
import attendanceRoutes from './routes/attendance'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'

// ─── App ──────────────────────────────────────────────────────────────────────

const app  = express()
const PORT = Number(process.env.PORT) || 3000

app.use(helmet())
app.use(
  cors({
    origin:         process.env.ORIGIN ?? 'http://localhost:5173',
    methods:        ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.use(express.json({ limit: '2mb' }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth',        authRoutes)
app.use('/admin',       adminRoutes)
app.use('/faculty',     facultyRoutes)
app.use('/student',     studentRoutes)
app.use('/attendance',  attendanceRoutes)
// Legacy alias kept for any existing frontend sync calls
app.use('/sync-attendance', attendanceRoutes)

// ── 404 + error handlers (must be last) ──────────────────────────────────────
app.use(notFoundHandler)
app.use(errorHandler)

// ─── Seed admin on first run ──────────────────────────────────────────────────

async function seedAdmin(): Promise<void> {
  const email    = (process.env.ADMIN_EMAIL    ?? 'admin@gmail.com').toLowerCase()
  const password =  process.env.ADMIN_PASSWORD ?? 'admin123'
  const name     =  process.env.ADMIN_NAME     ?? 'Administrator'

  const exists = await User.findOne({ email, role: 'admin' })
  if (exists) return

  await User.create({ name, email, password, role: 'admin', status: 'approved' })
  console.log(`[Seed] Admin created → ${email}`)
}

// ─── Start ────────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  await connectDB()
  await seedAdmin()

  app.listen(PORT, () => {
    console.log(`\n[Server] Listening on http://localhost:${PORT}`)
    console.log(`[Server] NODE_ENV = ${process.env.NODE_ENV ?? 'development'}`)
    console.log('[Server] POST /auth/login | POST /auth/signup')
    console.log('[Server] /admin/* | /faculty/* | /student/* | /attendance/*')
  })
}

start().catch((err) => {
  console.error('[Server] Fatal startup error:', err)
  process.exit(1)
})
