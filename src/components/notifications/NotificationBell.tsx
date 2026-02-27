/**
 * NotificationBell
 * ─────────────────────────────────────────────────────────────────────────
 * Sticky header bell icon with:
 *   • Unread count badge (animates in when > 0)
 *   • Click-outside dismissal
 *   • Dropdown panel (newest first, grouped by read state)
 *   • Click-to-navigate + auto-mark-read
 *   • "Mark all read" + "Clear all" actions
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, BellDot,
  MessageSquare, BookOpen, ClipboardX,
  UserX, AlertTriangle, ShieldAlert,
  CheckCheck, Trash2, X,
} from 'lucide-react'

import { cn } from '@/utils/helpers'
import { useNotifications } from '@/hooks/useNotifications'
import { type AppNotification, type NotifType } from '@/services/notifications'

// ─── Per-type icon + colour config ───────────────────────────────────────────

const TYPE_CONFIG: Record<NotifType, {
  icon:  React.ElementType
  bg:    string
  text:  string
}> = {
  new_ticket:           { icon: MessageSquare, bg: 'bg-indigo-100 dark:bg-indigo-950', text: 'text-indigo-600 dark:text-indigo-400' },
  helpdesk_reply:       { icon: MessageSquare, bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-600 dark:text-emerald-400' },
  subject_assigned:     { icon: BookOpen,      bg: 'bg-violet-100 dark:bg-violet-950',  text: 'text-violet-600 dark:text-violet-400'  },
  attendance_reminder:  { icon: ClipboardX,    bg: 'bg-amber-100 dark:bg-amber-950',    text: 'text-amber-600 dark:text-amber-400'    },
  absent_marked:        { icon: UserX,         bg: 'bg-rose-100 dark:bg-rose-950',      text: 'text-rose-600 dark:text-rose-400'      },
  consecutive_absent:   { icon: AlertTriangle, bg: 'bg-orange-100 dark:bg-orange-950',  text: 'text-orange-600 dark:text-orange-400'  },
  hod_escalation:       { icon: ShieldAlert,   bg: 'bg-red-100 dark:bg-red-950',        text: 'text-red-600 dark:text-red-400'        },
}

// ─── Relative time formatter ──────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Single notification row ──────────────────────────────────────────────────

function NotifRow({
  n,
  onRead,
  onRemove,
  onNavigate,
}: {
  n:          AppNotification
  onRead:     () => void
  onRemove:   () => void
  onNavigate: () => void
}) {
  const cfg   = TYPE_CONFIG[n.type]
  const Icon  = cfg.icon

  return (
    <div
      className={cn(
        'group relative flex gap-3 px-4 py-3.5 cursor-pointer transition-colors',
        n.read
          ? 'hover:bg-muted/50'
          : 'bg-indigo-50/60 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/30',
      )}
      onClick={() => { onRead(); onNavigate() }}
    >
      {/* Unread dot */}
      {!n.read && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-indigo-500" />
      )}

      {/* Icon */}
      <span className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
        cfg.bg, cfg.text,
      )}>
        <Icon size={14} />
      </span>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className={cn(
          'text-xs leading-snug',
          n.read ? 'font-medium text-foreground' : 'font-semibold text-foreground',
        )}>
          {n.title}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{n.body}</p>
        <p className="mt-1 text-[10px] text-muted-foreground/70">{timeAgo(n.createdAt)}</p>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-muted text-muted-foreground transition"
        aria-label="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NotificationBell() {
  const navigate = useNavigate()
  const {
    notifications, unreadCount,
    markRead, markAllAsRead, remove, clearAll,
  } = useNotifications()

  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on click-outside
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div ref={panelRef} className="relative">

      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
          open
            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        {unreadCount > 0 ? <BellDot size={18} /> : <Bell size={18} />}

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-indigo-600 px-0.5 text-[9px] font-bold text-white shadow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          className={cn(
            'absolute right-0 top-10 z-50',
            'w-[340px] max-w-[calc(100vw-1rem)]',
            'rounded-xl border border-border bg-card shadow-2xl',
            'overflow-hidden',
            'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <BellDot size={14} className="text-indigo-500" />
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  title="Mark all read"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground text-[10px] flex items-center gap-1 transition"
                >
                  <CheckCheck size={13} />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  title="Clear all"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-rose-600 transition"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <Bell size={28} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">You're all caught up!</p>
                <p className="text-xs text-muted-foreground/70">New notifications will appear here.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotifRow
                  key={n.id}
                  n={n}
                  onRead={() => markRead(n.id)}
                  onRemove={() => remove(n.id)}
                  onNavigate={() => { setOpen(false); navigate(n.href) }}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2.5 text-center">
              <p className="text-[11px] text-muted-foreground">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                {unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
