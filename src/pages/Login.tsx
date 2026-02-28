import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useLocation, Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROLE_HOME } from '@/types/auth'
import { cn } from '@/utils/helpers'
import { Loader2, UserPlus } from 'lucide-react'

export default function Login() {
  const { login, isAuthenticated, user } = useAuth()
  const location  = useLocation()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [warmingUp, setWarmingUp] = useState(false)
  const warmingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Show "warming up" banner if login takes > 4 seconds (Render cold start)
  useEffect(() => {
    if (loading) {
      warmingTimer.current = setTimeout(() => setWarmingUp(true), 4000)
    } else {
      if (warmingTimer.current) clearTimeout(warmingTimer.current)
      setWarmingUp(false)
    }
    return () => { if (warmingTimer.current) clearTimeout(warmingTimer.current) }
  }, [loading])

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[hsl(233,55%,9%)] via-[hsl(233,55%,14%)] to-[hsl(233,50%,20%)] px-4 py-8">
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

            {/* Cold-start warming-up banner */}
            {warmingUp && !error && (
              <div className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-3 py-2.5 space-y-1">
                <div className="flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin text-amber-300 shrink-0" />
                  <span className="text-xs font-semibold text-amber-300">Backend is warming up…</span>
                </div>
                <p className="text-[11px] text-amber-400/80 leading-relaxed">
                  The server was sleeping. This first sign-in may take up to 30–40 seconds. Please wait — you'll be signed in automatically.
                </p>
              </div>
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
              {loading ? (warmingUp ? 'Warming up server…' : 'Signing in…') : 'Sign in'}
            </button>
          </form>

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
