import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser, Role } from '@/types/auth'
import { apiLogin, setToken, clearToken, getToken } from '@/services/api'
import { getApprovedFaculty, findStudentByEmail } from '@/services/appData'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoginCredentials {
  email:    string
  password: string
}

interface AuthContextValue {
  user:            AuthUser | null
  isAuthenticated: boolean
  isLoading:       boolean
  login:           (credentials: LoginCredentials) => Promise<void>
  logout:          () => void
}

// ─── Offline seed users (fallback when backend unreachable) ───────────────────

const OFFLINE_USERS: Record<string, AuthUser & { password: string }> = {
  'faculty@gmail.com': {
    id: 'u1', name: 'Prof. Sharma', email: 'faculty@gmail.com',
    role: 'faculty', password: 'faculty123',
  },
  'student@gmail.com': {
    id: 'u2', name: 'Riya Patel', email: 'student@gmail.com',
    role: 'student', password: 'student123',
  },
  'admin@gmail.com': {
    id: 'u3', name: 'Dr. Mehta', email: 'admin@gmail.com',
    role: 'hod' as Role, password: 'admin123',
  },
}

/**
 * resolveOffline – used only when the backend is unreachable.
 * Check order:
 *  1. Seed mock users
 *  2. Admin-approved faculty stored locally
 *  3. Students added by faculty (password = regNo)
 */
function resolveOffline(email: string, password: string): AuthUser | null {
  const key = email.toLowerCase().trim()

  const seed = OFFLINE_USERS[key]
  if (seed && seed.password === password) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...safe } = seed
    return safe
  }

  const approvedFaculty = getApprovedFaculty()
  const fac = approvedFaculty.find((f) => f.email.toLowerCase() === key)
  if (fac && fac.password === password) {
    return { id: fac.id, name: fac.name, email: fac.email, role: 'faculty' }
  }

  const student = findStudentByEmail(key)
  if (student && student.regNo === password) {
    return { id: student.id, name: student.name, email: student.email, role: 'student' }
  }

  return null
}

const SESSION_KEY = 'sa_user'

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  /** Rehydrate session from localStorage on mount */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) setUser(JSON.parse(raw) as AuthUser)
    } catch {
      localStorage.removeItem(SESSION_KEY)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async ({ email, password }: LoginCredentials) => {
    // ── Try backend first ────────────────────────────────────────────────────
    try {
      const data = await apiLogin(email, password)
      const backendRole = data.user.role === 'admin' ? 'hod' : data.user.role as Role
      const safeUser: AuthUser = {
        id:    data.user.id,
        name:  data.user.name,
        email: data.user.email,
        role:  backendRole,
      }
      setToken(data.token)
      localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser))
      setUser(safeUser)
      return
    } catch (backendErr) {
      // If the error is a credential failure (not a network error), re-throw
      const msg = backendErr instanceof Error ? backendErr.message : ''
      if (msg && !msg.startsWith('HTTP 5') && !msg.toLowerCase().includes('failed to fetch') && !msg.toLowerCase().includes('network')) {
        throw backendErr
      }
      // Network/server error → fall through to offline mode
    }

    // ── Offline fallback ────────────────────────────────────────────────────
    const offlineUser = resolveOffline(email, password)
    if (!offlineUser) {
      throw new Error('Invalid email or password.')
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(offlineUser))
    setUser(offlineUser)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  // Keep token alive on tab refresh (token already in localStorage via setToken)
  // Re-validate on mount: if we have a stored user but no token, clear session
  useEffect(() => {
    const storedUser = localStorage.getItem(SESSION_KEY)
    const token = getToken()
    // If the user was logged in offline (no token), that's OK
    // If there's a user but an expired/missing token, we still allow offline use
    if (!storedUser && token) {
      clearToken()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, isLoading, login, logout }),
    [user, isLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
