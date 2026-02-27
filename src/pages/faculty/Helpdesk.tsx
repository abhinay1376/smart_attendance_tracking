/**
 * Faculty – Helpdesk (incoming tickets from students)
 * Faculty can reply, mark awaiting-response, and resolve tickets.
 */

import { useEffect, useState } from 'react'
import {
  Clock, CheckCircle2, MessageSquare,
  ChevronDown, ChevronUp, Hourglass, Send, ShieldAlert,
} from 'lucide-react'
import { cn } from '@/utils/helpers'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/context/AuthContext'
import {
  apiFacultyGetTickets,
  apiFacultyResolve,
  apiFacultyReply,
  apiFacultyToggleAwaiting,
  apiFacultyToggleNotifyHod,
  type HelpdeskTicket,
} from '@/services/api'

// ─── Chat bubble ─────────────────────────────────────────────────────────────

function ChatBubble({
  sender, name, text, sentAt, label,
}: { sender: 'student' | 'faculty'; name: string; text: string; sentAt: string; label?: string }) {
  const isFaculty = sender === 'faculty'
  return (
    <div className={cn('flex flex-col gap-1', isFaculty ? 'items-end' : 'items-start')}>
      <span className="text-[11px] font-medium text-muted-foreground px-1">
        {name}{label ? ` · ${label}` : ''} · {new Date(sentAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </span>
      <div className={cn(
        'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
        isFaculty
          ? 'rounded-tr-sm bg-indigo-600 text-white'
          : 'rounded-tl-sm bg-muted/70 text-foreground',
      )}>
        {text}
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FacultyHelpdesk() {
  const { user } = useAuth()
  const [tickets,  setTickets]  = useState<HelpdeskTicket[]>([])
  const [filter,   setFilter]   = useState<'all' | 'open' | 'resolved'>('open')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [reply,    setReply]    = useState<Record<string, string>>({})

  async function refresh() {
    try {
      const data = await apiFacultyGetTickets()
      setTickets(data)
    } catch (err) {
      console.error('Failed to load tickets:', err)
    }
  }
  useEffect(() => { if (user) void refresh() }, [user])

  async function handleReply(id: string) {
    try {
      await apiFacultyReply(id, reply[id] ?? '')
      setReply((r) => { const c = { ...r }; delete c[id]; return c })
      await refresh()
    } catch (err) {
      console.error('Reply failed:', err)
    }
  }

  async function handleResolve(id: string) {
    try {
      await apiFacultyResolve(id, reply[id] ?? '')
      setReply((r) => { const c = { ...r }; delete c[id]; return c })
      setExpanded(null)
      await refresh()
    } catch (err) {
      console.error('Resolve failed:', err)
    }
  }

  async function handleToggleAwaiting(id: string, current: boolean) {
    try {
      await apiFacultyToggleAwaiting(id, !current)
      await refresh()
    } catch (err) {
      console.error('Toggle awaiting failed:', err)
    }
  }

  async function handleToggleNotifyHod(t: HelpdeskTicket) {
    try {
      await apiFacultyToggleNotifyHod(t._id, !t.notifyHod)
      await refresh()
    } catch (err) {
      console.error('Toggle notify HoD failed:', err)
    }
  }

  const displayed  = tickets.filter((t) => filter === 'all' || t.status === filter)
  const openCount  = tickets.filter((t) => t.status === 'open').length
  const awaitCount = tickets.filter((t) => t.status === 'open' && t.awaitingResponse).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Student Helpdesk</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Issues submitted by students directed to you.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {openCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              <Clock size={10} /> {openCount} open
            </span>
          )}
          {awaitCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              <Hourglass size={10} /> {awaitCount} awaiting student reply
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['open', 'resolved', 'all'] as const).map((f) => (
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
            {f} ({f === 'all' ? tickets.length : tickets.filter((t) => t.status === f).length})
          </button>
        ))}
      </div>

      {/* Ticket list */}
      {displayed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
          No {filter === 'all' ? '' : filter} tickets.
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((t) => {
            const isOpen     = t.status === 'open'
            const isAwaiting = isOpen && !!t.awaitingResponse
            const isExpanded = expanded === t._id

            const borderClass = isAwaiting
              ? 'border-indigo-200'
              : isOpen
                ? 'border-amber-200'
                : 'border-border'

            return (
              <div
                key={t._id}
                className={cn('rounded-xl border bg-card shadow-sm overflow-hidden', borderClass)}
              >
                {/* Header row */}
                <button
                  className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left"
                  onClick={() => setExpanded(isExpanded ? null : t._id)}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
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
                      <p className="text-sm font-semibold text-foreground truncate">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        From: <span className="font-medium">{t.studentName}</span>
                        {' · '}{new Date(t.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      'hidden sm:inline rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                      isAwaiting  ? 'bg-indigo-100 text-indigo-700' :
                      isOpen      ? 'bg-amber-100  text-amber-700'  :
                                    'bg-emerald-100 text-emerald-700',
                    )}>
                      {isAwaiting ? 'Awaiting Reply' : isOpen ? 'Open' : 'Resolved'}
                    </span>
                    {isExpanded
                      ? <ChevronUp  size={15} className="text-muted-foreground" />
                      : <ChevronDown size={15} className="text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="border-t border-border px-5 py-4 space-y-4">

                    {/* Student info */}
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      <span>Student: <span className="font-medium text-foreground">{t.studentName}</span></span>
                      <span>Email: <span className="font-medium text-foreground">{t.studentEmail}</span></span>
                    </div>

                    {/* Conversation thread */}
                    <div className="space-y-2.5">
                      {/* All messages from the thread */}
                      {t.messages.map((msg, i) => (
                        <ChatBubble
                          key={i}
                          sender={msg.sender}
                          name={msg.sender === 'faculty' ? (user?.name ?? 'You') : t.studentName}
                          text={msg.text}
                          sentAt={msg.sentAt}
                          label={i === 0 ? 'Initial message' : undefined}
                        />
                      ))}

                      {/* Resolved footer */}
                      {!isOpen && (
                        <p className="text-center text-[11px] text-muted-foreground pt-1">
                          ✓ Resolved {t.updatedAt ? new Date(t.updatedAt).toLocaleString('en-IN') : ''}
                        </p>
                      )}
                    </div>

                    {/* Open ticket actions */}
                    {isOpen && (
                      <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">

                        {/* Awaiting response toggle */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                              <Hourglass size={13} className={cn(isAwaiting ? 'text-indigo-500' : 'text-muted-foreground')} />
                              Awaiting student response
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {isAwaiting
                                ? "Ticket stays open — you're waiting for the student to reply."
                                : "Toggle ON after sending a reply to mark this as awaiting the student's next message."}
                            </p>
                          </div>
                          <Switch
                            checked={isAwaiting}
                            onCheckedChange={() => void handleToggleAwaiting(t._id, isAwaiting)}
                            className={cn(isAwaiting && 'data-[state=checked]:bg-indigo-500')}
                          />
                        </div>

                        {/* Notify HoD toggle */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                              <ShieldAlert size={13} className={cn(t.notifyHod ? 'text-red-500' : 'text-muted-foreground')} />
                              Notify HoD
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {t.notifyHod
                                ? 'HoD has been notified and can view the full ticket thread.'
                                : 'Escalate this ticket — the Head of Department will be notified.'}
                            </p>
                          </div>
                          <Switch
                            checked={!!t.notifyHod}
                            onCheckedChange={() => void handleToggleNotifyHod(t)}
                            className={cn(t.notifyHod && 'data-[state=checked]:bg-red-500')}
                          />
                        </div>

                        <div className="border-t border-border" />

                        {/* Reply textarea */}
                        <textarea
                          rows={3}
                          value={reply[t._id] ?? ''}
                          onChange={(e) => setReply((r) => ({ ...r, [t._id]: e.target.value }))}
                          placeholder={isAwaiting
                            ? 'Follow-up reply to the student (optional)…'
                            : 'Type your reply to the student (optional)…'}
                          className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                        />

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => void handleReply(t._id)}
                            disabled={!(reply[t._id] ?? '').trim()}
                            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors active:scale-95"
                          >
                            <Send size={12} /> Send Reply &amp; Wait
                          </button>
                          <button
                            onClick={() => void handleResolve(t._id)}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors active:scale-95"
                          >
                            <CheckCircle2 size={12} /> Mark as Resolved
                          </button>
                        </div>
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
  )
}

