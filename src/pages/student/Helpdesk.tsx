/**
 * Student – Helpdesk
 * Students can submit issues to a specific faculty member and continue
 * the conversation after receiving a faculty reply.
 */

import { type FormEvent, useEffect, useState } from 'react'
import {
  MessageSquare, Send, CheckCircle2, Clock, ChevronDown, ChevronUp, Hourglass, ShieldAlert,
} from 'lucide-react'
import { cn } from '@/utils/helpers'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/context/AuthContext'
import {
  apiStudentGetTickets,
  apiStudentCreateTicket,
  apiStudentFollowUp,
  apiStudentToggleNotifyHod,
  apiStudentGetFaculty,
  type HelpdeskTicket,
} from '@/services/api'

/** Seed faculty always available locally */
const SEED_FACULTY = [
  { name: 'Prof. Sharma', email: 'faculty@gmail.com' },
]

// ─── Chat bubble ─────────────────────────────────────────────────────────────

function ChatBubble({
  sender, name, text, sentAt, label,
}: { sender: 'student' | 'faculty'; name: string; text: string; sentAt: string; label?: string }) {
  const isStudent = sender === 'student'
  return (
    <div className={cn('flex flex-col gap-1', isStudent ? 'items-end' : 'items-start')}>
      <span className="text-[11px] font-medium text-muted-foreground px-1">
        {name}{label ? ` · ${label}` : ''} · {new Date(sentAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </span>
      <div className={cn(
        'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
        isStudent
          ? 'rounded-tr-sm bg-indigo-600 text-white'
          : 'rounded-tl-sm bg-muted/70 text-foreground',
      )}>
        {text}
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface FormState { facultyEmail: string; subject: string; message: string }
const EMPTY: FormState = { facultyEmail: '', subject: '', message: '' }

export default function StudentHelpdesk() {
  const { user } = useAuth()
  const [tickets,     setTickets]  = useState<HelpdeskTicket[]>([])
  const [facultyList, setFacList]  = useState<{ name: string; email: string }[]>(SEED_FACULTY)
  const [form,        setForm]     = useState<FormState>(EMPTY)
  const [error,       setError]    = useState<string | null>(null)
  const [submitted,   setSubmitted]= useState(false)
  const [loading,     setLoading]  = useState(false)
  const [expanded,    setExpanded] = useState<string | null>(null)
  const [followUp,    setFollowUp] = useState<Record<string, string>>({})

  async function refresh() {
    if (!user) return
    try {
      const data = await apiStudentGetTickets()
      setTickets(data)
    } catch (err) {
      console.error('Failed to load tickets:', err)
    }
  }

  useEffect(() => {
    // Load approved faculty for the dropdown
    apiStudentGetFaculty()
      .then((approved) => {
        const combined = [
          ...approved.map((f) => ({ name: f.name, email: f.email })),
          // keep seed faculty as fallback if not already in API list
          ...SEED_FACULTY.filter((s) => !approved.some((a) => a.email === s.email)),
        ]
        setFacList(combined)
      })
      .catch(console.error)

    void refresh()
  }, [user])

  function set(key: keyof FormState) {
    return (v: string) => setForm((f) => ({ ...f, [key]: v }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!user) return
    if (!form.facultyEmail) { setError('Please select a faculty member.'); return }
    if (!form.subject.trim()) { setError('Please enter a subject.'); return }
    if (!form.message.trim()) { setError('Please describe your issue.'); return }

    setLoading(true)
    try {
      await apiStudentCreateTicket({
        facultyEmail: form.facultyEmail,
        subject:      form.subject.trim(),
        message:      form.message.trim(),
      })
      setForm(EMPTY)
      setSubmitted(true)
      await refresh()
      setTimeout(() => setSubmitted(false), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit ticket.')
    } finally {
      setLoading(false)
    }
  }

  async function handleFollowUp(id: string) {
    const text = (followUp[id] ?? '').trim()
    if (!text) return
    try {
      await apiStudentFollowUp(id, text)
      setFollowUp((f) => { const c = { ...f }; delete c[id]; return c })
      await refresh()
    } catch (err) {
      console.error('Follow-up failed:', err)
    }
  }

  async function handleToggleNotifyHod(t: HelpdeskTicket) {
    try {
      await apiStudentToggleNotifyHod(t._id, !t.notifyHod)
      await refresh()
    } catch (err) {
      console.error('Toggle notify HoD failed:', err)
    }
  }

  const openCount  = tickets.filter((t) => t.status === 'open').length
  const awaitCount = tickets.filter((t) => t.status === 'open' && t.awaitingResponse).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Helpdesk</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit an issue to your faculty. You can track and continue the conversation here.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {openCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              <Clock size={10} /> {openCount} open
            </span>
          )}
          {awaitCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              <Hourglass size={10} /> {awaitCount} awaiting your reply
            </span>
          )}
        </div>
      </div>

      {/* Success toast */}
      {submitted && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-800">Your issue has been submitted successfully!</p>
        </div>
      )}

      {/* Submit form */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-foreground flex items-center gap-2">
          <Send size={14} className="text-indigo-500" /> Submit New Issue
        </h2>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Faculty Member *</label>
            <select
              value={form.facultyEmail}
              onChange={(e) => set('facultyEmail')(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-foreground"
            >
              <option value="">— Select Faculty —</option>
              {facultyList.map((f) => (
                <option key={f.email} value={f.email}>{f.name} ({f.email})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Subject *</label>
            <input
              required value={form.subject} onChange={(e) => set('subject')(e.target.value)}
              placeholder="Brief description of your issue"
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Message *</label>
            <textarea
              required rows={4} value={form.message} onChange={(e) => set('message')(e.target.value)}
              placeholder="Describe your issue in detail…"
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
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
            {loading ? 'Submitting…' : <><Send size={14} /> Submit Issue</>}
          </button>
        </form>
      </div>

      {/* My tickets */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          My Tickets
          {openCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              <Clock size={10} /> {openCount} open
            </span>
          )}
        </h2>

        {tickets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
            No tickets submitted yet.
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => {
              const isOpen     = t.status === 'open'
              const isAwaiting = isOpen && !!t.awaitingResponse
              const isExp      = expanded === t._id
              const hasThread  = t.messages.length > 1
              const canReply   = isOpen && (isAwaiting || hasThread)

              const borderClass = isAwaiting
                ? 'border-indigo-200'
                : isOpen
                  ? 'border-amber-200'
                  : 'border-emerald-200'

              return (
                <div
                  key={t._id}
                  className={cn('rounded-xl border bg-card shadow-sm overflow-hidden', borderClass)}
                >
                  {/* Header */}
                  <button
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                    onClick={() => setExpanded(isExp ? null : t._id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                        isAwaiting  ? 'bg-indigo-100' :
                        isOpen      ? 'bg-amber-100'  : 'bg-emerald-100',
                      )}>
                        {isAwaiting
                          ? <Hourglass size={11} className="text-indigo-600" />
                          : isOpen
                            ? <Clock size={11} className="text-amber-600" />
                            : <CheckCircle2 size={11} className="text-emerald-600" />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{t.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          To: {t.facultyEmail} · {new Date(t.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isAwaiting && (
                        <span className="hidden sm:inline rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                          Reply Needed
                        </span>
                      )}
                      {!isAwaiting && (
                        <span className={cn(
                          'hidden sm:inline rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                          isOpen ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
                        )}>
                          {isOpen ? 'Open' : 'Resolved'}
                        </span>
                      )}
                      {isExp ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
                    </div>
                  </button>

                  {/* Expanded */}
                  {isExp && (
                    <div className="border-t border-border px-5 py-4 space-y-3">

                      {/* Conversation thread */}
                      <div className="space-y-2.5">
                        {t.messages.map((msg, i) => (
                          <ChatBubble
                            key={i}
                            sender={msg.sender}
                            name={msg.sender === 'student' ? 'You' : 'Faculty'}
                            text={msg.text}
                            sentAt={msg.sentAt}
                            label={i === 0 ? 'Initial message' : undefined}
                          />
                        ))}

                        {/* No reply yet */}
                        {t.messages.length === 1 && isOpen && (
                          <p className="text-xs text-muted-foreground italic text-center py-2">
                            Awaiting faculty response…
                          </p>
                        )}

                        {/* Resolved footer */}
                        {!isOpen && (
                          <p className="text-center text-[11px] text-muted-foreground pt-1">
                            ✓ Resolved {t.updatedAt ? new Date(t.updatedAt).toLocaleString('en-IN') : ''}
                          </p>
                        )}
                      </div>

                      {/* Notify HoD toggle (open tickets only) */}
                      {isOpen && (
                        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold flex items-center gap-1.5">
                              <ShieldAlert size={13} className={cn(t.notifyHod ? 'text-red-500' : 'text-muted-foreground')} />
                              Notify HoD
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t.notifyHod
                                ? 'HoD has been notified and can view this ticket.'
                                : 'Escalate this issue to the Head of Department.'}
                            </p>
                          </div>
                          <Switch
                            checked={!!t.notifyHod}
                            onCheckedChange={() => void handleToggleNotifyHod(t)}
                            className={cn(t.notifyHod && 'data-[state=checked]:bg-red-500')}
                          />
                        </div>
                      )}

                      {/* Student follow-up */}
                      {canReply && (
                        <div className="space-y-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                          <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                            <Hourglass size={11} /> Faculty is waiting for your reply
                          </p>
                          <textarea
                            rows={3}
                            value={followUp[t._id] ?? ''}
                            onChange={(e) => setFollowUp((f) => ({ ...f, [t._id]: e.target.value }))}
                            placeholder="Type your follow-up message…"
                            className="w-full rounded-lg border border-indigo-200 bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                          />
                          <button
                            onClick={() => void handleFollowUp(t._id)}
                            disabled={!(followUp[t._id] ?? '').trim()}
                            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors active:scale-95"
                          >
                            <Send size={12} /> Send Follow-up
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
