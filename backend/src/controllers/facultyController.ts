/**
 * facultyController.ts
 * ─────────────────────────────────────────────────────────────────────────
 * All routes require: requireAuth + requireRole('faculty')
 *
 * GET  /faculty/students              — students added by this faculty
 * POST /faculty/students              — add a student
 * GET  /faculty/subjects              — subjects assigned to this faculty
 *
 * Helpdesk management:
 * GET   /faculty/helpdesk             — tickets directed to this faculty
 * POST  /faculty/helpdesk/:id/reply   — send reply (ticket stays open)
 * POST  /faculty/helpdesk/:id/resolve — resolve ticket with optional reply
 * PATCH /faculty/helpdesk/:id/awaiting   — toggle awaitingResponse
 * PATCH /faculty/helpdesk/:id/notify-hod — toggle notifyHod
 *
 * Attendance:
 * GET  /faculty/attendance/subject/:subjectId — attendance records for a subject
 */

import type { Request, Response, NextFunction } from 'express'
import { Student }   from '../models/Student'
import { Subject }   from '../models/Subject'
import { Helpdesk }  from '../models/Helpdesk'
import { Attendance } from '../models/Attendance'

// ─── Students ─────────────────────────────────────────────────────────────────

export async function getMyStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const students = await Student
      .find({ addedBy: req.user!.email })
      .select('-regNo')
      .sort({ createdAt: -1 })
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
      addedBy: req.user!.email,
    })

    res.status(201).json({
      message: 'Student added.',
      student: {
        id:       student.id,
        name:     student.name,
        email:    student.email,
        phone:    student.phone,
        classId:  student.classId,
        addedBy:  student.addedBy,
        createdAt: student.createdAt,
      },
    })
  } catch (err: unknown) {
    if ((err as Record<string, unknown>)?.code === 11000) {
      res.status(409).json({ message: 'A student with this email already exists.' })
      return
    }
    next(err)
  }
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

export async function getMySubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const subjects = await Subject
      .find({ assignedFaculty: req.user!.email })
      .sort({ createdAt: -1 })
    res.json(subjects)
  } catch (err) { next(err) }
}

// ─── Helpdesk ─────────────────────────────────────────────────────────────────

export async function getMyTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filter: Record<string, unknown> = { facultyEmail: req.user!.email }
    if (req.query.status) filter.status = req.query.status

    const tickets = await Helpdesk.find(filter).sort({ createdAt: -1 })
    res.json(tickets)
  } catch (err) { next(err) }
}

export async function replyToTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const { text } = req.body as { text?: string }

    if (!text?.trim()) {
      res.status(400).json({ message: 'Reply text is required.' })
      return
    }

    const msg = {
      sender: 'faculty' as const,
      text:   text.trim(),
      sentAt: new Date().toISOString(),
    }

    const ticket = await Helpdesk.findOneAndUpdate(
      { _id: id, facultyEmail: req.user!.email, status: 'open' },
      {
        $push: { messages: msg },
        $set:  { reply: text.trim(), awaitingResponse: true },
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

export async function resolveTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const { reply } = req.body as { reply?: string }

    // Optionally append a final reply message to the thread
    const update: Record<string, unknown> = {
      $set: {
        status:           'resolved',
        awaitingResponse: false,
        resolvedAt:       new Date(),
        ...(reply?.trim() ? { reply: reply.trim() } : {}),
      },
    }

    if (reply?.trim()) {
      ;(update as Record<string, unknown>)['$push'] = {
        messages: {
          sender: 'faculty',
          text:   reply.trim(),
          sentAt: new Date().toISOString(),
        },
      }
    }

    const ticket = await Helpdesk.findOneAndUpdate(
      { _id: id, facultyEmail: req.user!.email, status: 'open' },
      update,
      { new: true },
    )

    if (!ticket) {
      res.status(404).json({ message: 'Open ticket not found.' })
      return
    }

    res.json(ticket)
  } catch (err) { next(err) }
}

export async function toggleAwaiting(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const { value } = req.body as { value?: boolean }

    if (typeof value !== 'boolean') {
      res.status(400).json({ message: 'value (boolean) is required.' })
      return
    }

    const ticket = await Helpdesk.findOneAndUpdate(
      { _id: id, facultyEmail: req.user!.email },
      { $set: { awaitingResponse: value } },
      { new: true },
    )

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found.' })
      return
    }

    res.json(ticket)
  } catch (err) { next(err) }
}

export async function toggleNotifyHod(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const { value } = req.body as { value?: boolean }

    if (typeof value !== 'boolean') {
      res.status(400).json({ message: 'value (boolean) is required.' })
      return
    }

    const ticket = await Helpdesk.findOneAndUpdate(
      { _id: id, facultyEmail: req.user!.email },
      { $set: { notifyHod: value } },
      { new: true },
    )

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found.' })
      return
    }

    res.json(ticket)
  } catch (err) { next(err) }
}

// ─── Attendance view ──────────────────────────────────────────────────────────

export async function getAttendanceBySubject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subjectId } = req.params
    const { from, to, studentId } = req.query

    const filter: Record<string, unknown> = { subjectId }
    if (studentId)             filter.studentId = studentId
    if (from || to) {
      filter.date = {}
      if (from) (filter.date as Record<string, unknown>)['$gte'] = from
      if (to)   (filter.date as Record<string, unknown>)['$lte'] = to
    }

    const records = await Attendance.find(filter).sort({ date: -1 })
    res.json(records)
  } catch (err) { next(err) }
}
