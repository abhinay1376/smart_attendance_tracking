/**
 * Attendance model
 * ─────────────────────────────────────────────────────────────────────────
 * Unique composite index: { studentId + subjectId + date }
 * This mirrors the offline record produced by the React frontend and
 * prevents duplicate submissions when the same session is re-synced.
 */

import { Schema, model, Document } from 'mongoose'

// ─── TypeScript interface ──────────────────────────────────────────────────

export interface IAttendance extends Document {
  /** Client-generated UUID — kept for idempotent upserts.  */
  id:         string
  studentId:  string
  courseId:   string
  subjectId:  string
  /** ISO date string "YYYY-MM-DD" */
  date:       string
  status:     'present' | 'absent'
  /** Engagement score 1-5  */
  engagement: number
  /** Unix ms – when the client created this record  */
  createdAt:  number
  /** When the server stored it */
  syncedAt:   Date
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const attendanceSchema = new Schema<IAttendance>(
  {
    id:         { type: String, required: true },
    studentId:  { type: String, required: true, trim: true },
    courseId:   { type: String, required: true, trim: true },
    subjectId:  { type: String, required: true, trim: true },
    date:       { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status:     { type: String, required: true, enum: ['present', 'absent'] },
    engagement: { type: Number, required: true, min: 1, max: 5, default: 3 },
    createdAt:  { type: Number, required: true },
    syncedAt:   { type: Date,   default: () => new Date() },
  },
  {
    // Disable Mongoose's built-in _id auto-timestamp so we can control
    // createdAt ourselves (it's a client unix-ms, not a server Date).
    timestamps: false,
  },
)

// ─── Unique composite index ───────────────────────────────────────────────────
// One record per student + subject + calendar day.
// background: true avoids locking the collection during index creation.
attendanceSchema.index(
  { studentId: 1, subjectId: 1, date: 1 },
  { unique: true, background: true, name: 'uq_student_subject_date' },
)

// Also index on date for fast date-range queries
attendanceSchema.index({ date: 1 }, { background: true })

// ─── Model ────────────────────────────────────────────────────────────────────

export const Attendance = model<IAttendance>('Attendance', attendanceSchema)
