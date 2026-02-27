/**
 * Augment Express's Request interface so TypeScript knows about req.user
 * after JWT verification in auth middleware.
 */

export interface AuthUser {
  id:    string
  email: string
  name:  string
  role:  'admin' | 'faculty' | 'student'
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}
