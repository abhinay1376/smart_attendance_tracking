/**
 * HoD – Faculty Registration Requests
 * Admin reviews, approves, or rejects pending faculty signup requests.
 */

import { useEffect, useState } from 'react'
import {
  CheckCircle2, XCircle, Clock, Users,
  Phone, Calendar, BadgeCheck, Mail,
} from 'lucide-react'
import { cn } from '@/utils/helpers'
import {
  apiGetFaculty,
  apiUpdateFacultyStatus,
  type FacultyRequest,
} from '@/services/api'

function badge(status: FacultyRequest['status']) {
  const map = {
    pending:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-700',   icon: Clock        },
    approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
    rejected: { label: 'Rejected', cls: 'bg-rose-100 text-rose-700',     icon: XCircle      },
  }
  const { label, cls, icon: Icon } = map[status]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', cls)}>
      <Icon size={10} /> {label}
    </span>
  )
}

export default function HodRequests() {
  const [requests, setRequests] = useState<FacultyRequest[]>([])
  const [filter,   setFilter]   = useState<'all' | FacultyRequest['status']>('all')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [note,     setNote]     = useState('')
  const [busy,     setBusy]     = useState(false)

  async function refresh() {
    try {
      const data = await apiGetFaculty()
      setRequests(data)
    } catch (err) {
      console.error('Failed to load faculty requests:', err)
    }
  }
  useEffect(() => { void refresh() }, [])

  async function approve(id: string) {
    setBusy(true)
    try {
      await apiUpdateFacultyStatus(id, 'approved')
      await refresh()
    } catch (err) {
      console.error('Approve failed:', err)
    } finally {
      setBusy(false)
    }
  }

  async function reject(id: string) {
    setBusy(true)
    try {
      await apiUpdateFacultyStatus(id, 'rejected', note.trim() || undefined)
      setRejectId(null)
      setNote('')
      await refresh()
    } catch (err) {
      console.error('Reject failed:', err)
    } finally {
      setBusy(false)
    }
  }

  const displayed = requests.filter((r) => filter === 'all' || r.status === filter)
  const pending   = requests.filter((r) => r.status === 'pending').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Faculty Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and approve faculty registration requests.
          {pending > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              <Clock size={10} /> {pending} pending
            </span>
          )}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
              filter === f
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {f} {f === 'all' ? `(${requests.length})` : `(${requests.filter((r) => r.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Cards */}
      {displayed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          No {filter === 'all' ? '' : filter} requests found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {displayed.map((req) => (
            <div key={req._id} className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {req.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground text-sm">{req.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{req.facultyId}</p>
                  </div>
                </div>
                {badge(req.status)}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Mail size={11} className="shrink-0" />
                  <span className="truncate">{req.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone size={11} className="shrink-0" />
                  <span>{req.phone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={11} className="shrink-0" />
                  <span>{req.dob || '—'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BadgeCheck size={11} className="shrink-0" />
                  <span>{req.facultyId}</span>
                </div>
              </div>

              {/* Submitted at */}
              <p className="text-[11px] text-muted-foreground">
                Submitted: {req.createdAt ? new Date(req.createdAt).toLocaleString('en-IN') : '—'}
              </p>

              {/* Note if rejected */}
              {req.status === 'rejected' && req.note && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 border border-rose-100">
                  Rejection note: {req.note}
                </p>
              )}

              {/* Actions for pending */}
              {req.status === 'pending' && (
                <>
                  {rejectId === req._id ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Optional: reason for rejection"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={busy}
                          onClick={() => void reject(req._id)}
                          className="flex-1 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-60 transition-colors"
                        >
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => { setRejectId(null); setNote('') }}
                          className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        disabled={busy}
                        onClick={() => void approve(req._id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60 transition-colors"
                      >
                        <CheckCircle2 size={13} /> Approve
                      </button>
                      <button
                        onClick={() => setRejectId(req._id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                      >
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


