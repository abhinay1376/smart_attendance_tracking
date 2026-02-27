import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import {
  getApprovedFaculty,
  getMySubjects,
  getMyAttendance,
  getMyTickets,
  createTicket,
  studentFollowUp,
} from '../controllers/studentController'

const router = Router()

// All student routes are protected
router.use(requireAuth, requireRole('student'))
// ── Faculty (for helpdesk) ────────────────────────────────────────────────────────
router.get('/faculty',                      getApprovedFaculty)
// ── Subjects ────────────────────────────────────────────────────────────────
router.get('/subjects',                     getMySubjects)

// ── Attendance ──────────────────────────────────────────────────────────────
router.get('/attendance',                   getMyAttendance)

// ── Helpdesk ────────────────────────────────────────────────────────────────
router.get('/helpdesk',                     getMyTickets)
router.post('/helpdesk',                    createTicket)
router.post('/helpdesk/:id/followup',       studentFollowUp)

export default router
