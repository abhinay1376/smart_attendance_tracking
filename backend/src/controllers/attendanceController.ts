/**
 * attendanceController.ts
 * ─────────────────────────────────────────────────────────────────────────
 * POST /sync-attendance
 *
 * Accepts either:
 *   • A single attendance record   { … }
 *   • An array of records          [ { … }, … ]
 *
 * Strategy: upsert on the unique composite key { studentId, subjectId, date }.
 * This makes the endpoint fully idempotent — re-syncing the same
 * client records will update them rather than throw a duplicate error.
 *
 * Response shape:
 * {
 *   inserted: number,   // new documents created
 *   updated:  number,   // existing documents overwritten
 *   failed:   number,   // records that failed validation / unexpected error
 *   errors:   [{ id, reason }]   // details per failed record (omitted when empty)
 * }
 */

import type { Request, Response, NextFunction } from 'express'
import { Attendance }                           from '../models/Attendance'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendancePayload {
  id:         string
  studentId:  string
  courseId:   string
  subjectId:  string
  date:       string
  status:     'present' | 'absent'
  active:     boolean
  createdAt:  number
}

interface FailedEntry {
  id:     string
  reason: string
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(r: AttendancePayload): string | null {
  if (!r.id        || typeof r.id        !== 'string')  return 'id is required'
  if (!r.studentId || typeof r.studentId !== 'string')  return 'studentId is required'
  if (!r.courseId  || typeof r.courseId  !== 'string')  return 'courseId is required'
  if (!r.subjectId || typeof r.subjectId !== 'string')  return 'subjectId is required'
  if (!r.date      || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return 'date must be YYYY-MM-DD'
  if (r.status !== 'present' && r.status !== 'absent')  return "status must be 'present' or 'absent'"
  if (typeof r.active !== 'boolean')                     return 'active must be a boolean'
  if (typeof r.createdAt !== 'number')                  return 'createdAt must be a unix timestamp'
  return null
}

// ─── Controller ───────────────────────────────────────────────────────────────

export async function syncAttendance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Normalise single record or array
    const raw: unknown = req.body
    const records: AttendancePayload[] = Array.isArray(raw) ? raw : [raw]

    if (records.length === 0) {
      res.status(400).json({ message: 'No records provided' })
      return
    }

    let inserted = 0
    let updated  = 0
    const errors: FailedEntry[] = []

    for (const record of records) {
      // ── Basic validation ────────────────────────────────────────────────
      const validationError = validate(record)
      if (validationError) {
        errors.push({ id: record.id ?? 'unknown', reason: validationError })
        continue
      }

      // ── Upsert on composite key ─────────────────────────────────────────
      // setOnInsert ensures we don't overwrite syncedAt on a pure duplicate.
      try {
        const filter = {
          studentId: record.studentId,
          subjectId: record.subjectId,
          date:      record.date,
        }

        const update = {
          $set: {
            id:         record.id,
            courseId:   record.courseId,
            status:     record.status,
            active:     record.active,
            createdAt:  record.createdAt,
          },
          $setOnInsert: {
            syncedAt: new Date(),
          },
        }

        const result = await Attendance.updateOne(filter, update, { upsert: true })

        if (result.upsertedCount > 0) {
          inserted++
        } else {
          updated++
        }
      } catch (dbErr: unknown) {
        const msg = dbErr instanceof Error ? dbErr.message : 'Database error'
        errors.push({ id: record.id, reason: msg })
      }
    }

    const statusCode = errors.length > 0 && inserted + updated === 0 ? 422 : 200

    res.status(statusCode).json({
      inserted,
      updated,
      failed: errors.length,
      ...(errors.length > 0 && { errors }),
    })
  } catch (err) {
    next(err)   // hand off to centralised error middleware
  }
}
