import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import {
  listFaculty,
  updateFacultyStatus,
  listStudents,
  addStudent,
  bulkAddStudents,
  removeStudent,
  listSubjects,
  createSubject,
  deleteSubject,
  assignFacultyToSubject,
  removeFacultyFromSubject,
  listAllTickets,
  getDeptStats,
} from '../controllers/adminController'

const router = Router()

// All admin routes are protected
router.use(requireAuth, requireRole('admin'))

// ── Faculty management ──────────────────────────────────────────────────────
router.get('/faculty',                     listFaculty)
router.patch('/faculty/:id/status',        updateFacultyStatus)

// ── Student management ──────────────────────────────────────────────────────
router.get('/students',                    listStudents)
router.post('/students',                   addStudent)
router.post('/students/bulk',              bulkAddStudents)
router.delete('/students/:id',             removeStudent)

// ── Subject management ──────────────────────────────────────────────────────
router.get('/subjects',                    listSubjects)
router.post('/subjects',                   createSubject)
router.delete('/subjects/:id',             deleteSubject)
router.patch('/subjects/:id/assign',       assignFacultyToSubject)
router.delete('/subjects/:id/faculty/:email', removeFacultyFromSubject)

// ── Helpdesk (HoD view) ─────────────────────────────────────────────────────
router.get('/helpdesk',                    listAllTickets)

// ── Stats ───────────────────────────────────────────────────────────────────
router.get('/stats',                       getDeptStats)

export default router
