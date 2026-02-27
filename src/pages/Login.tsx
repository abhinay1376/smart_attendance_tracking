import { type FormEvent, useState } from 'react'
import { useLocation, Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROLE_HOME } from '@/types/auth'
import { cn } from '@/utils/helpers'
import { Loader2, UserPlus } from 'lucide-react'

/** Demo credentials shown inside the card for easy testing */
const DEMO_HINTS = [
  // ── Admin ──────────────────────────────────────────────────────────────────
  { role: 'Admin',   label: 'Administrator',       email: 'admin@gmail.com',              password: 'admin123',    badge: 'hod'     },
  // ── Faculty ────────────────────────────────────────────────────────────────
  { role: 'Faculty', label: 'Dr. Ramesh Kumar',    email: 'ramesh.kumar@college.edu',     password: 'faculty123', badge: 'faculty' },
  { role: 'Faculty', label: 'Prof. Sunita Sharma', email: 'sunita.sharma@college.edu',    password: 'faculty123', badge: 'faculty' },
  { role: 'Faculty', label: 'Dr. Anil Verma',      email: 'anil.verma@college.edu',       password: 'faculty123', badge: 'faculty' },
  // ── Students ───────────────────────────────────────────────────────────────
  { role: 'Student', label: 'Aarav Singh',         email: 'aarav.singh@student.edu',      password: 'CS2021001',  badge: 'student' },
  { role: 'Student', label: 'Diya Patel',          email: 'diya.patel@student.edu',       password: 'CS2021002',  badge: 'student' },
  { role: 'Student', label: 'Vivaan Mehta',        email: 'vivaan.mehta@student.edu',     password: 'CS2021003',  badge: 'student' },
  { role: 'Student', label: 'Ananya Reddy',        email: 'ananya.reddy@student.edu',     password: 'CS2021004',  badge: 'student' },
  { role: 'Student', label: 'Arjun Gupta',         email: 'arjun.gupta@student.edu',      password: 'CS2021005',  badge: 'student' },
  { role: 'Student', label: 'Kavya Pillai',        email: 'kavya.pillai@student.edu',     password: 'EC2021001',  badge: 'student' },
] as const

const BADGE_STYLES: Record<string, string> = {
  hod:     'bg-violet-500/20 text-violet-300 border-violet-500/30',
  faculty: 'bg-sky-500/20    text-sky-300    border-sky-500/30',
  student: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
}

export default function Login() {
  const { login, isAuthenticated, user } = useAuth()
  const location  = useLocation()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  // Already authenticated → send to role home
  if (isAuthenticated && user) {
    const destination =
      (location.state as { from?: { pathname: string } } | null)?.from?.pathname
      ?? ROLE_HOME[user.role]
    return <Navigate to={destination} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login({ email, password })
      // After login the user state updates → the Navigate above handles redirect
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 px-4 py-8">
      <div className="w-full max-w-md space-y-6">

        {/* ── Brand ── */}
        <div className="text-center space-y-1">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white font-black text-2xl select-none">
            A
          </div>
          <h1 className="text-2xl font-bold text-white">Smart Attendance</h1>
          <p className="text-sm text-indigo-300">Offline-First · Role-Based Access</p>
        </div>

        {/* ── Card ── */}
        <div className="rounded-2xl border border-white/10 bg-white/5 px-8 py-8 backdrop-blur-sm shadow-2xl space-y-5">
          <h2 className="text-lg font-semibold text-white">Sign in to your account</h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-indigo-200">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={cn(
                  'w-full rounded-lg border border-white/10 bg-white/10 px-3.5 py-2.5',
                  'text-sm text-white placeholder:text-indigo-400',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent',
                  'transition-colors',
                )}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-indigo-200">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(
                  'w-full rounded-lg border border-white/10 bg-white/10 px-3.5 py-2.5',
                  'text-sm text-white placeholder:text-indigo-400',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent',
                  'transition-colors',
                )}
              />
            </div>

            {/* Error */}
            {error && (
              <p className="rounded-lg bg-rose-500/20 border border-rose-500/30 px-3 py-2 text-xs text-rose-300">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5',
                'text-sm font-semibold text-white transition-opacity',
                'hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* ── Demo hint ── */}
          <div className="border-t border-white/10 pt-4 space-y-3">
            <p className="text-[11px] font-medium text-indigo-400 uppercase tracking-wider">
              Quick sign-in
            </p>
            <div className="flex flex-col gap-1.5">
              {DEMO_HINTS.map(({ role, label, email: hint, password: pass, badge }) => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => { setEmail(hint); setPassword(pass) }}
                  className={cn(
                    'flex items-center gap-3 w-full rounded-lg border border-white/8 bg-white/5 px-3 py-2',
                    'hover:bg-white/10 transition-colors text-left group',
                  )}
                >
                  <span className={cn(
                    'shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                    BADGE_STYLES[badge],
                  )}>
                    {role}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12px] font-medium text-white leading-tight truncate">{label}</span>
                    <span className="block text-[10px] text-indigo-400 truncate">{hint}</span>
                  </span>
                  <span className="shrink-0 text-[10px] text-indigo-500 group-hover:text-indigo-300 font-mono">
                    {pass}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Faculty signup link ── */}
          <div className="border-t border-white/10 pt-4 text-center">
            <p className="text-xs text-indigo-400 mb-2">Are you a faculty member without an account?</p>
            <Link
              to="/signup/faculty"
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 hover:text-white transition-colors"
            >
              <UserPlus size={13} />
              Register as Faculty
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
