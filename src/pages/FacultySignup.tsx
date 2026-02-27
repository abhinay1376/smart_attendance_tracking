/**
 * FacultySignup
 * ─────────────────────────────────────────────────────────────────────────
 * Public page — faculty members request access.
 * Admin (HoD) must approve the request before the account becomes active.
 */

import { type FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { cn } from '@/utils/helpers'
import { useAuth } from '@/context/AuthContext'
import { apiSignup } from '@/services/api'

interface FieldState {
  name:      string
  email:     string
  phone:     string
  dob:       string
  facultyId: string
  password:  string
  confirm:   string
}

const EMPTY: FieldState = {
  name: '', email: '', phone: '', dob: '', facultyId: '', password: '', confirm: '',
}

function Field({
  id, label, type = 'text', value, onChange, placeholder, hint, required = true,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; hint?: string; required?: boolean
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-indigo-200">
        {label}{required && <span className="ml-0.5 text-rose-400">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword ? (show ? 'text' : 'password') : type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-lg border border-white/10 bg-white/10 px-3.5 py-2.5',
            'text-sm text-white placeholder:text-indigo-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent',
            'transition-colors',
            isPassword && 'pr-10',
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-2.5 flex items-center text-indigo-300 hover:text-white"
            tabIndex={-1}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-indigo-300/70">{hint}</p>}
    </div>
  )
}

export default function FacultySignup() {
  const { isAuthenticated } = useAuth()

  const [fields,   setFields]   = useState<FieldState>(EMPTY)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)
  const [loading,  setLoading]  = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 px-4">
        <div className="w-full max-w-md text-center space-y-5">
          <div className="flex justify-center">
            <CheckCircle2 size={56} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Request Submitted!</h1>
          <p className="text-indigo-300">
            Your faculty signup request has been sent to the Head of Department.
            You'll be able to log in once your account is approved.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  function set(key: keyof FieldState) {
    return (v: string) => setFields((f) => ({ ...f, [key]: v }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (fields.password !== fields.confirm) {
      setError('Passwords do not match.')
      return
    }
    if (fields.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      await apiSignup({
        name:      fields.name.trim(),
        email:     fields.email.trim().toLowerCase(),
        phone:     fields.phone.trim(),
        dob:       fields.dob,
        facultyId: fields.facultyId.trim(),
        password:  fields.password,
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 px-4 py-10">
      <div className="w-full max-w-lg space-y-6">

        {/* Brand */}
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-xl font-black text-white">A</span>
          <h1 className="text-xl font-bold text-white">Smart Attendance</h1>
          <p className="text-sm text-indigo-300">Faculty Registration Request</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-7 backdrop-blur-sm shadow-2xl space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Create Faculty Account</h2>
            <p className="mt-0.5 text-xs text-indigo-300">
              Fill in your details below. The HoD will review and approve your request.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Row: Name + Faculty ID */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="name"      label="Full Name"  value={fields.name}      onChange={set('name')}      placeholder="Prof. John Doe" />
              <Field id="facultyId" label="Faculty ID" value={fields.facultyId} onChange={set('facultyId')} placeholder="FAC-2024-001" />
            </div>

            {/* Email */}
            <Field id="email" label="Email Address" type="email" value={fields.email} onChange={set('email')} placeholder="you@college.edu" />

            {/* Row: Phone + DOB */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="phone" label="Phone Number" type="tel"  value={fields.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
              <Field id="dob"   label="Date of Birth" type="date" value={fields.dob}   onChange={set('dob')} hint="DD / MM / YYYY" />
            </div>

            {/* Passwords */}
            <Field id="password" label="Password" type="password" value={fields.password} onChange={set('password')} placeholder="Min 6 characters" />
            <Field id="confirm"  label="Confirm Password" type="password" value={fields.confirm} onChange={set('confirm')} placeholder="Re-enter password" />

            {/* Error */}
            {error && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/20 px-3 py-2 text-xs text-rose-300">
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
                'hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Submitting…' : 'Submit Registration Request'}
            </button>
          </form>

          <p className="text-center text-xs text-indigo-400">
            Already have an account?{' '}
            <Link to="/login" className="inline-flex items-center gap-0.5 font-medium text-indigo-300 hover:text-white">
              <ChevronLeft size={12} /> Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
