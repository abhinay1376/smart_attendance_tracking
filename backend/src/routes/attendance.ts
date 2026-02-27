import { Router }         from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { syncAttendance } from '../controllers/attendanceController'
import { Attendance }     from '../models/Attendance'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

/**
 * POST /attendance/sync
 * Faculty syncs a batch of offline records.
 * Body: AttendancePayload | AttendancePayload[]
 */
router.post(
  '/sync',
  requireAuth,
  requireRole('faculty', 'admin'),
  syncAttendance,
)

/**
 * GET /attendance/student/:studentId
 * Query: subjectId?, from? (YYYY-MM-DD), to? (YYYY-MM-DD)
 * Faculty, admin, or the student themselves.
 */
router.get(
  '/student/:studentId',
  requireAuth,
  requireRole('admin', 'faculty', 'student'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { studentId } = req.params

      // Students can only fetch their own records
      if (req.user?.role === 'student' && req.user.id !== studentId) {
        res.status(403).json({ message: 'Access denied.' })
        return
      }

      const { subjectId, from, to } = req.query
      const filter: Record<string, unknown> = { studentId }
      if (subjectId) filter.subjectId = subjectId
      if (from || to) {
        filter.date = {}
        if (from) (filter.date as Record<string, unknown>)['$gte'] = from
        if (to)   (filter.date as Record<string, unknown>)['$lte'] = to
      }

      const records = await Attendance.find(filter).sort({ date: -1 })
      res.json(records)
    } catch (err) { next(err) }
  },
)

export default router
