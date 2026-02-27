import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import {
  getMyStudents,
  addStudent,
  getMySubjects,
  getMyTickets,
  replyToTicket,
  resolveTicket,
  toggleAwaiting,
  toggleNotifyHod,
  getAttendanceBySubject,
} from '../controllers/facultyController'

const router = Router()

// All faculty routes are protected
router.use(requireAuth, requireRole('faculty'))

// ── Students ────────────────────────────────────────────────────────────────
router.get('/students',                         getMyStudents)
router.post('/students',                        addStudent)

// ── Subjects ────────────────────────────────────────────────────────────────
router.get('/subjects',                         getMySubjects)

// ── Helpdesk ────────────────────────────────────────────────────────────────
router.get('/helpdesk',                         getMyTickets)
router.post('/helpdesk/:id/reply',              replyToTicket)
router.post('/helpdesk/:id/resolve',            resolveTicket)
router.patch('/helpdesk/:id/awaiting',          toggleAwaiting)
router.patch('/helpdesk/:id/notify-hod',        toggleNotifyHod)

// ── Attendance ──────────────────────────────────────────────────────────────
router.get('/attendance/subject/:subjectId',    getAttendanceBySubject)

export default router
