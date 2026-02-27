/**
 * adminController.ts
 * ─────────────────────────────────────────────────────────────────────────
 * All routes require: requireAuth + requireRole('admin')
 *
 * GET  /admin/faculty                    — list faculty (with ?status filter)
 * PATCH /admin/faculty/:id/status        — approve or reject
 * GET  /admin/students                   — all students
 * POST /admin/students                   — add single student
 * POST /admin/students/bulk              — bulk add from CSV/Excel import
 * DELETE /admin/students/:id             — remove student
 * GET  /admin/subjects                   — list subjects
 * POST /admin/subjects                   — create subject
 * DELETE /admin/subjects/:id             — delete subject
 * PATCH /admin/subjects/:id/assign       — assign faculty to subject
 * DELETE /admin/subjects/:id/faculty/:email — remove faculty from subject
 * GET  /admin/helpdesk                   — all tickets (escalated by default)
 * GET  /admin/stats                      — dashboard aggregate
 */

import type { Request, Response, NextFunction } from 'express'
import { User }      from '../models/User'
import { Student }   from '../models/Student'
import { Subject }   from '../models/Subject'
import { Helpdesk }  from '../models/Helpdesk'
import { Attendance } from '../models/Attendance'
import bcrypt from 'bcryptjs'

// ─── Faculty requests ─────────────────────────────────────────────────────────

export async function listFaculty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.query
    const filter: Record<string, unknown> = { role: 'faculty' }
    if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
      filter.status = status
    }
    const faculty = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
    res.json(faculty)
  } catch (err) { next(err) }
}

export async function updateFacultyStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const { status, note } = req.body as { status?: string; note?: string }

    if (!status || !['approved', 'rejected'].includes(status)) {
      res.status(400).json({ message: "status must be 'approved' or 'rejected'." })
      return
    }

    const user = await User.findOneAndUpdate(
      { _id: id, role: 'faculty' },
      { status, ...(note ? { note } : {}) },
      { new: true, select: '-password' },
    )

    if (!user) {
      res.status(404).json({ message: 'Faculty request not found.' })
      return
    }

    res.json({ message: `Faculty ${status}.`, user })
  } catch (err) { next(err) }
}

// ─── Students ─────────────────────────────────────────────────────────────────

export async function listStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const students = await Student.find().select('-regNo').sort({ createdAt: -1 })
    res.json(students)
  } catch (err) { next(err) }
}

export async function addStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, regNo, phone, classId } = req.body as {
      name?: string; email?: string; regNo?: string; phone?: string; classId?: string
    }

    if (!name || !email || !regNo) {
      res.status(400).json({ message: 'name, email, and regNo are required.' })
      return
    }

    const student = await Student.create({
      name:    name.trim(),
      email:   email.toLowerCase().trim(),
      regNo,
      phone:   phone?.trim(),
      classId: classId?.trim(),
      addedBy: 'admin',
    })

    res.status(201).json({ message: 'Student added.', id: student.id })
  } catch (err: unknown) {
    if ((err as Record<string, unknown>)?.code === 11000) {
      res.status(409).json({ message: 'A student with this email already exists.' })
      return
    }
    next(err)
  }
}

export async function bulkAddStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = req.body as Array<{
      name?: string; email?: string; regNo?: string; phone?: string; classId?: string
    }>

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ message: 'Provide a non-empty array of student records.' })
      return
    }

    let added = 0
    let enrolled = 0   // existing student added to a new subject
    let skipped = 0
    const errors: string[] = []

    for (const row of rows) {
      if (!row.name || !row.email || !row.regNo) {
        errors.push(`Skipped (missing fields): ${JSON.stringify(row)}`)
        skipped++
        continue
      }

      const normalEmail = row.email.toLowerCase().trim()
      const classId     = row.classId?.trim()

      try {
        const existing = await Student.findOne({ email: normalEmail })

        if (existing) {
          // Student already exists — just enrol them in the new subject if needed
          if (classId && !existing.classId.includes(classId)) {
            await Student.updateOne({ _id: existing._id }, { $addToSet: { classId } })
          }
          enrolled++
        } else {
          // New student — create with classId as array
          await Student.create({
            name:    row.name.trim(),
            email:   normalEmail,
            regNo:   row.regNo,
            phone:   row.phone?.trim(),
            classId: classId ? [classId] : [],
            addedBy: 'admin',
          })
          added++
        }
      } catch {
        skipped++
      }
    }

    res.json({ added, enrolled, skipped, ...(errors.length > 0 && { errors }) })
  } catch (err) { next(err) }
}

export async function removeStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await Student.findByIdAndDelete(req.params.id)
    if (!result) {
      res.status(404).json({ message: 'Student not found.' })
      return
    }
    res.json({ message: 'Student removed.' })
  } catch (err) { next(err) }
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

// ─── Helper: enrich subjects ──────────────────────────────────────────────────
// The DB stores assignedFaculty as string[] (emails).
// The frontend expects { name, email }[].  Resolve names in one query here.

async function enrichSubjects(subjects: InstanceType<typeof Subject>[]) {
  const allEmails = [...new Set(subjects.flatMap((s) => s.assignedFaculty as string[]))]
  const users = allEmails.length
    ? await User.find({ email: { $in: allEmails } }, 'name email').lean()
    : []
  const nameMap = new Map(users.map((u) => [u.email, u.name]))

  return subjects.map((s) => ({
    _id:             s._id,
    name:            s.name,
    code:            s.code,
    createdAt:       s.createdAt,
    assignedFaculty: (s.assignedFaculty as string[]).map((email) => ({
      name:  nameMap.get(email) ?? email,   // fallback to email if user not found
      email,
    })),
  }))
}

export async function listSubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const subjects = await Subject.find().sort({ createdAt: -1 })
    const enriched = await enrichSubjects(subjects)
    res.json(enriched)
  } catch (err) { next(err) }
}

export async function createSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, code } = req.body as { name?: string; code?: string }
    if (!name || !code) {
      res.status(400).json({ message: 'name and code are required.' })
      return
    }
    const subject = await Subject.create({ name: name.trim(), code: code.trim() })
    res.status(201).json(subject)
  } catch (err: unknown) {
    if ((err as Record<string, unknown>)?.code === 11000) {
      res.status(409).json({ message: 'A subject with this code already exists.' })
      return
    }
    next(err)
  }
}

export async function deleteSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await Subject.findByIdAndDelete(req.params.id)
    if (!result) {
      res.status(404).json({ message: 'Subject not found.' })
      return
    }
    res.json({ message: 'Subject deleted.' })
  } catch (err) { next(err) }
}

export async function assignFacultyToSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const { facultyEmail } = req.body as { facultyEmail?: string }

    if (!facultyEmail) {
      res.status(400).json({ message: 'facultyEmail is required.' })
      return
    }

    const email = facultyEmail.toLowerCase().trim()

    const faculty = await User.findOne({ email, role: 'faculty', status: 'approved' })
    if (!faculty) {
      res.status(404).json({ message: 'No approved faculty found with this email.' })
      return
    }

    const subject = await Subject.findByIdAndUpdate(
      id,
      { $addToSet: { assignedFaculty: email } },
      { new: true },
    )

    if (!subject) {
      res.status(404).json({ message: 'Subject not found.' })
      return
    }

    const [enriched] = await enrichSubjects([subject])
    res.json(enriched)
  } catch (err) { next(err) }
}

export async function removeFacultyFromSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, email } = req.params

    const subject = await Subject.findByIdAndUpdate(
      id,
      { $pull: { assignedFaculty: email.toLowerCase() } },
      { new: true },
    )

    if (!subject) {
      res.status(404).json({ message: 'Subject not found.' })
      return
    }

    const [enriched] = await enrichSubjects([subject])
    res.json(enriched)
  } catch (err) { next(err) }
}

// ─── Helpdesk (HoD view) ─────────────────────────────────────────────────────

export async function listAllTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // ?escalated=true  → only notifyHod tickets
    // ?status=open|resolved → filter by status
    const filter: Record<string, unknown> = {}
    if (req.query.escalated === 'true') filter.notifyHod = true
    if (req.query.status) filter.status = req.query.status

    const tickets = await Helpdesk.find(filter).sort({ createdAt: -1 })
    res.json(tickets)
  } catch (err) { next(err) }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getDeptStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [totalFaculty, totalStudents, totalSubjects, pendingRequests, openTickets] =
      await Promise.all([
        User.countDocuments({ role: 'faculty', status: 'approved' }),
        Student.countDocuments(),
        Subject.countDocuments(),
        User.countDocuments({ role: 'faculty', status: 'pending' }),
        Helpdesk.countDocuments({ status: 'open' }),
      ])

    res.json({
      totalFaculty:    totalFaculty + 1, // +1 for the admin
      totalStudents,
      totalSubjects,
      pendingRequests,
      openTickets,
    })
  } catch (err) { next(err) }
}
