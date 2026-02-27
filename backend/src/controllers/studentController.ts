/**
 * studentController.ts
 * ─────────────────────────────────────────────────────────────────────────
 * All routes require: requireAuth + requireRole('student')
 *
 * GET  /student/attendance                     — own attendance records
 * GET  /student/helpdesk                       — own tickets
 * POST /student/helpdesk                       — create new ticket
 * POST /student/helpdesk/:id/followup          — send follow-up message
 */

import type { Request, Response, NextFunction } from 'express'
import { Attendance } from '../models/Attendance'
import { Helpdesk }   from '../models/Helpdesk'
import { User }       from '../models/User'
import { Subject }    from '../models/Subject'

// ─── Faculty list (for helpdesk dropdown) ────────────────────────────────────────────

export async function getApprovedFaculty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const faculty = await User.find({ role: 'faculty', status: 'approved' }, { name: 1, email: 1 }).sort({ name: 1 })
    res.json(faculty.map((f) => ({ id: f._id, name: f.name, email: f.email })))
  } catch (err) { next(err) }
}

// ─── Subjects ────────────────────────────────────────────────────────────────

export async function getMySubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const subjects = await Subject.find({}, { _id: 1, name: 1, code: 1 }).sort({ name: 1 })
    res.json(subjects)
  } catch (err) { next(err) }
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function getMyAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subjectId, from, to } = req.query
    const filter: Record<string, unknown> = { studentId: req.user!.id }

    if (subjectId) filter.subjectId = subjectId
    if (from || to) {
      filter.date = {}
      if (from) (filter.date as Record<string, unknown>)['$gte'] = from
      if (to)   (filter.date as Record<string, unknown>)['$lte'] = to
    }

    const records = await Attendance.find(filter).sort({ date: -1 })
    res.json(records)
  } catch (err) { next(err) }
}

// ─── Helpdesk ─────────────────────────────────────────────────────────────────

export async function getMyTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tickets = await Helpdesk
      .find({ studentEmail: req.user!.email })
      .sort({ createdAt: -1 })
    res.json(tickets)
  } catch (err) { next(err) }
}

export async function createTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { facultyEmail, subject, message } = req.body as {
      facultyEmail?: string; subject?: string; message?: string
    }

    if (!facultyEmail || !subject || !message) {
      res.status(400).json({ message: 'facultyEmail, subject, and message are required.' })
      return
    }

    const fEmail = facultyEmail.toLowerCase().trim()

    // Validate the faculty exists and is approved (or is the seed faculty)
    const isSeedFaculty = fEmail === 'faculty@gmail.com'
    if (!isSeedFaculty) {
      const faculty = await User.findOne({ email: fEmail, role: 'faculty', status: 'approved' })
      if (!faculty) {
        res.status(400).json({ message: 'Selected faculty member is not available.' })
        return
      }
    }

    const ticket = await Helpdesk.create({
      studentEmail: req.user!.email,
      studentName:  req.user!.name,
      facultyEmail: fEmail,
      subject:      subject.trim(),
      message:      message.trim(),
    })

    res.status(201).json(ticket)
  } catch (err) { next(err) }
}

export async function studentFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const { text } = req.body as { text?: string }

    if (!text?.trim()) {
      res.status(400).json({ message: 'text is required.' })
      return
    }

    const msg = {
      sender: 'student' as const,
      text:   text.trim(),
      sentAt: new Date().toISOString(),
    }

    const ticket = await Helpdesk.findOneAndUpdate(
      { _id: id, studentEmail: req.user!.email, status: 'open' },
      {
        $push: { messages: msg },
        $set:  { awaitingResponse: false },
      },
      { new: true },
    )

    if (!ticket) {
      res.status(404).json({ message: 'Open ticket not found.' })
      return
    }

    res.json(ticket)
  } catch (err) { next(err) }
}
