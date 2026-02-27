/**
 * auth.ts — JWT verification + role-guard middleware
 *
 * Usage:
 *   router.get('/route', requireAuth, requireRole('admin'), handler)
 */

import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { AuthUser } from '../types/express'

const JWT_SECRET = process.env.JWT_SECRET ?? 'smart_attendance_super_secret_key_2026'

// ─── Token helper ─────────────────────────────────────────────────────────────

export function signToken(payload: AuthUser): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']) ?? '7d',
  })
}

// ─── requireAuth ─────────────────────────────────────────────────────────────

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required: no token provided.' })
    return
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser
    req.user = payload
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' })
  }
}

// ─── requireRole ─────────────────────────────────────────────────────────────

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        message: `Access denied. Required role: ${roles.join(' or ')}.`,
      })
      return
    }
    next()
  }
}
