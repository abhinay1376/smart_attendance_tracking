/**
 * Faculty – Add / Manage Students
 * Faculty can add students to their class.
 * Student login: email (given here) | password = regNo
 */

import { type FormEvent, useEffect, useState } from 'react'
import { GraduationCap, Plus, Trash2, X, Info } from 'lucide-react'
import { cn } from '@/utils/helpers'
import { useAuth } from '@/context/AuthContext'
import {
  apiFacultyGetStudents,
  apiFacultyAddStudent,
  apiDeleteStudent,
  type Student,
} from '@/services/api'

interface FormState {
  name:  string
  regNo: string
  phone: string
  email: string
}
const EMPTY: FormState = { name: '', regNo: '', phone: '', email: '' }

export default function FacultyAddStudents() {
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState<FormState>(EMPTY)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [delId,    setDelId]    = useState<string | null>(null)

  function refresh() {
    apiFacultyGetStudents()
      .then(setStudents)
      .catch((err) => console.error('Failed to load students:', err))
  }
  useEffect(() => { if (user) refresh() }, [user])

  function set(key: keyof FormState) {
    return (v: string) => setForm((f) => ({ ...f, [key]: v }))
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!user) return
    setLoading(true)
    try {
      await apiFacultyAddStudent({
        name:  form.name.trim(),
        regNo: form.regNo.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim().toLowerCase(),
      })
      setForm(EMPTY)
      setShowForm(false)
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add student.')
    } finally {
      setLoading(false)
    }
  }

  async function confirmDelete(id: string) {
    try {
      await apiDeleteStudent(id)
      setDelId(null)
      setStudents((prev) => prev.filter((s) => s._id !== id))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">My Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add students to your class. They log in using their email and Reg No as password.
          </p>
        </div>
        <button
          onClick={() => { setShowForm((s) => !s); setError(null) }}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 active:scale-95 transition-all"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? 'Cancel' : 'Add Student'}
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
        <Info size={15} className="mt-0.5 shrink-0 text-indigo-500" />
        <p className="text-xs text-indigo-700">
          Students log in at the main login page using <strong>the email you enter below</strong> as their username
          and <strong>their Reg No</strong> as the password. They can only <em>view</em> their attendance — not edit anything.
        </p>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">New Student Details</h2>
          <form onSubmit={handleAdd} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                <input required value={form.name} onChange={(e) => set('name')(e.target.value)}
                  placeholder="Arjun Sharma"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Register No. * <span className="text-indigo-500">(used as password)</span></label>
                <input required value={form.regNo} onChange={(e) => set('regNo')(e.target.value)}
                  placeholder="2024CSE001"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email * <span className="text-indigo-500">(login username)</span></label>
                <input required type="email" value={form.email} onChange={(e) => set('email')(e.target.value)}
                  placeholder="student@college.edu"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
                <input value={form.phone} onChange={(e) => set('phone')(e.target.value)}
                  placeholder="+91 98765 43210" type="tel"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              className={cn(
                'flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white',
                'hover:bg-indigo-700 disabled:opacity-60 transition-colors active:scale-95',
              )}
            >
              {loading ? 'Adding…' : <><Plus size={14} /> Add Student</>}
            </button>
          </form>
        </div>
      )}

      {/* Student list */}
      {students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          <GraduationCap size={36} className="mx-auto mb-3 opacity-30" />
          No students added yet. Click "Add Student" to get started.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Mobile: card per student */}
          <div className="divide-y divide-border sm:hidden">
            {students.map((s) => (
              <div key={s._id} className="px-4 py-3.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{s.regNo}</p>
                  </div>
                  <button onClick={() => setDelId(s._id)} className="shrink-0 rounded-md p-1.5 text-rose-400 hover:bg-rose-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{s.email}</span>
                  {s.phone && <span>{s.phone}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reg No.</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((s) => (
                  <tr key={s._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                          {s.name.charAt(0)}
                        </span>
                        <span className="font-medium text-foreground">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{s.regNo}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{s.email}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{s.phone || '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setDelId(s._id)}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-rose-500 border border-rose-200 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-foreground">Remove Student?</h3>
            <p className="text-sm text-muted-foreground">
              This will remove the student's login access. Their attendance records are unaffected.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => void confirmDelete(delId)}
                className="flex-1 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 transition-colors"
              >
                Remove
              </button>
              <button
                onClick={() => setDelId(null)}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
