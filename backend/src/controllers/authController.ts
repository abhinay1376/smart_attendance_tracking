/**
 * authController.ts
 * ─────────────────────────────────────────────────────────────────────────
 * POST /auth/login   — admin, faculty, or student login
 * POST /auth/signup  — faculty signup request (pending approval)
 */

import type { Request, Response, NextFunction } from 'express'
import { User }     from '../models/User'
import { Student }  from '../models/Student'
import { signToken } from '../middleware/auth'

// ─── POST /auth/login ─────────────────────────────────────────────────────────

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body as { email?: string; password?: string }

    if (!email || !password) {
      res.status(400).json({ message: 'email and password are required.' })
      return
    }

    const normalEmail = email.toLowerCase().trim()

    // ── 1. Try admin / faculty ────────────────────────────────────────────
    const user = await User.findOne({ email: normalEmail })

    if (user) {
      if (user.role === 'faculty' && user.status !== 'approved') {
        const msgMap: Record<string, string> = {
          pending:  'Your signup request is still pending admin approval.',
          rejected: 'Your signup request was rejected. Contact the administrator.',
        }
        res.status(403).json({ message: msgMap[user.status] ?? 'Account not active.' })
        return
      }

      const match = await user.comparePassword(password)
      if (!match) {
        res.status(401).json({ message: 'Invalid email or password.' })
        return
      }

      const token = signToken({
        id:    user.id as string,
        email: user.email,
        name:  user.name,
        role:  user.role,
      })

      res.json({
        token,
        user: {
          id:    user.id,
          name:  user.name,
          email: user.email,
          role:  user.role,
        },
      })
      return
    }

    // ── 2. Try student (regNo as password) ────────────────────────────────
    const student = await Student.findOne({ email: normalEmail })

    if (student) {
      const match = await student.compareRegNo(password)
      if (!match) {
        res.status(401).json({ message: 'Invalid email or registration number.' })
        return
      }

      const token = signToken({
        id:    student.id as string,
        email: student.email,
        name:  student.name,
        role:  'student',
      })

      res.json({
        token,
        user: {
          id:      student.id,
          name:    student.name,
          email:   student.email,
          role:    'student',
          classId: student.classId,
        },
      })
      return
    }

    res.status(401).json({ message: 'Invalid email or password.' })
  } catch (err) {
    next(err)
  }
}

// ─── POST /auth/signup ────────────────────────────────────────────────────────

export async function facultySignup(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, email, phone, dob, facultyId, password } = req.body as {
      name?: string; email?: string; phone?: string
      dob?: string;  facultyId?: string; password?: string
    }

    if (!name || !email || !phone || !dob || !facultyId || !password) {
      res.status(400).json({ message: 'All fields are required: name, email, phone, dob, facultyId, password.' })
      return
    }

    const normalEmail = email.toLowerCase().trim()

    const existing = await User.findOne({ email: normalEmail })
    if (existing) {
      res.status(409).json({ message: 'A signup request for this email already exists.' })
      return
    }

    const user = await User.create({
      name:      name.trim(),
      email:     normalEmail,
      password,
      role:      'faculty',
      status:    'pending',
      phone:     phone.trim(),
      dob,
      facultyId: facultyId.trim(),
    })

    res.status(201).json({
      message: 'Signup request submitted. Await admin approval.',
      id:      user.id,
    })
  } catch (err) {
    next(err)
  }
}
