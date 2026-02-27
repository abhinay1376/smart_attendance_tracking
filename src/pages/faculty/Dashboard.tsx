/**
 * Faculty Dashboard
 * ─────────────────────────────────────────────────────────────────────────
 * Sections
 *  1. Greeting + date
 *  2. Summary stat cards
 *  3. Sync status panel (inline — more detail than the header pill)
 *  4. Today's schedule table
 *  5. Quick-action shortcuts
 */

import { Link }            from 'react-router-dom'
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  CloudUpload,
  Loader2,
  RefreshCw,
  WifiOff,
} from 'lucide-react'

import { useAuth }               from '@/context/AuthContext'
import { useFacultyDashboard }   from '@/hooks/useFacultyDashboard'
import { cn }                    from '@/utils/helpers'

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, accent,
}: {
  label:  string
  value:  string | number
  icon:   React.ElementType
  accent: string   // tailwind bg+text classes for the icon bubble
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accent)}>
          <Icon size={15} />
        </span>
      </div>
      <p className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FacultyDashboard() {
  const { user }                      = useAuth()
  const { stats, schedule, sync, isLoading } = useFacultyDashboard()

  // ── Today's display date ───────────────────────────────────────────────────
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-40 rounded-xl bg-muted" />
        <div className="h-56 rounded-xl bg-muted" />
      </div>
    )
  }

  // ── Sync panel config ──────────────────────────────────────────────────────
  type SyncVariant = 'offline' | 'pending' | 'syncing' | 'synced' | 'error'

  const syncVariant: SyncVariant = (() => {
    if (!sync.isOnline)              return 'offline'
    if (sync.status === 'syncing')   return 'syncing'
    if (sync.status === 'error')     return 'error'
    if (sync.unsyncedCount > 0)      return 'pending'
    return 'synced'
  })()

  const syncPanel: Record<SyncVariant, {
    icon:    React.ElementType
    label:   string
    sub:     string
    ring:    string   // border colour
    bg:      string
    iconCls: string   // applied to icon only (may include animate-spin)
    textCls: string   // applied to text (color only, never animated)
  }> = {
    offline: {
      icon:    WifiOff,
      label:   'Offline',
      sub:     'Attendance records are saved locally and will sync when you reconnect.',
      ring:    'border-slate-200',
      bg:      'bg-slate-50',
      iconCls: 'text-slate-400',
      textCls: 'text-slate-400',
    },
    pending: {
      icon:    CloudUpload,
      label:   `${stats.pending} record${stats.pending !== 1 ? 's' : ''} pending sync`,
      sub:     'You are online. Click "Sync Now" to push records to the server.',
      ring:    'border-amber-200',
      bg:      'bg-amber-50',
      iconCls: 'text-amber-500',
      textCls: 'text-amber-500',
    },
    syncing: {
      icon:    Loader2,
      label:   'Syncing…',
      sub:     'Pushing attendance records to the server.',
      ring:    'border-indigo-200',
      bg:      'bg-indigo-50',
      iconCls: 'text-indigo-500 animate-spin',
      textCls: 'text-indigo-500',
    },
    synced: {
      icon:    CheckCircle2,
      label:   'All records synced',
      sub:     'Everything is up to date on the server.',
      ring:    'border-emerald-200',
      bg:      'bg-emerald-50',
      iconCls: 'text-emerald-500',
      textCls: 'text-emerald-500',
    },
    error: {
      icon:    AlertCircle,
      label:   `Sync error${sync.lastResult?.failed ? ` — ${sync.lastResult.failed} failed` : ''}`,
      sub:     sync.error ?? 'Some records failed to sync. Try again.',
      ring:    'border-red-200',
      bg:      'bg-red-50',
      iconCls: 'text-red-500',
      textCls: 'text-red-500',
    },
  }

  const sp = syncPanel[syncVariant]
  const SyncIcon = sp.icon
  const canSync  = sync.isOnline && sync.status !== 'syncing'

  return (
    <div className="space-y-6">

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {user?.name} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{today}</p>
        </div>

        {/* Mini sync badge (mirrors header pill but clickable here for visibility) */}
        <button
          onClick={canSync ? sync.triggerSync : undefined}
          disabled={!canSync}
          title={canSync ? 'Sync now' : sp.label}
          className={cn(
            'hidden sm:flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all',
            sp.ring, sp.bg,
            canSync ? 'cursor-pointer hover:opacity-80 active:scale-95' : 'cursor-default',
          )}
        >
          <SyncIcon size={13} className={sp.iconCls} />
          <span className={sp.textCls}>{sp.label}</span>
        </button>
      </div>

      {/* ── Summary stat cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Courses Assigned"
          value={stats.courses}
          icon={BookOpen}
          accent="bg-indigo-100 text-indigo-600"
        />
        <StatCard
          label="Today's Sessions"
          value={stats.sessions}
          icon={ClipboardCheck}
          accent="bg-violet-100 text-violet-600"
        />
        <StatCard
          label="Pending Sync"
          value={stats.pending}
          icon={CloudUpload}
          accent={
            stats.pending > 0
              ? 'bg-amber-100 text-amber-600'
              : 'bg-emerald-100 text-emerald-600'
          }
        />
      </div>

      {/* ── Sync status panel ─────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex flex-col gap-3 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between',
          sp.ring, sp.bg,
        )}
      >
        <div className="flex items-start gap-3">
          <SyncIcon
            size={22}
            className={cn('mt-0.5 shrink-0', sp.iconCls)}
          />
          <div>
            <p className={cn('text-sm font-semibold', sp.textCls)}>{sp.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground max-w-sm">{sp.sub}</p>
            {sync.lastResult && sync.lastResult.synced > 0 && (
              <p className="mt-1 text-xs text-emerald-600 font-medium">
                Last run: {sync.lastResult.synced} record{sync.lastResult.synced !== 1 ? 's' : ''} synced
                {sync.lastResult.failed > 0 && (
                  <span className="text-rose-500"> · {sync.lastResult.failed} failed</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Sync Now button */}
        {canSync && stats.pending > 0 && (
          <button
            onClick={sync.triggerSync}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <RefreshCw size={13} />
            Sync Now
          </button>
        )}
      </div>

      {/* ── Today's schedule ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">Today's Schedule</h2>
          <Link
            to="/faculty/attendance"
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Mark Attendance <ChevronRight size={13} />
          </Link>
        </div>

        <div className="divide-y divide-border">
          {schedule.length === 0 && (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No sessions scheduled for today.
            </p>
          )}

          {schedule.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              {/* Left: subject + class */}
              <div className="flex items-center gap-3 min-w-0">
                <CircleDot
                  size={14}
                  className={cn(
                    'shrink-0',
                    item.done ? 'text-emerald-500' : 'text-indigo-400',
                  )}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{item.subject}</p>
                  <p className="text-xs text-muted-foreground">{item.classLabel}</p>
                </div>
              </div>

              {/* Right: time + students + status */}
              <div className="flex items-center gap-4 pl-5 sm:pl-0">
                <div className="text-right">
                  <p className="text-xs font-semibold text-foreground">{item.time}</p>
                  <p className="text-[11px] text-muted-foreground">{item.students} students</p>
                </div>

                {item.done ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 size={11} /> Marked
                  </span>
                ) : (
                  <Link
                    to="/faculty/attendance"
                    className="flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-200 transition-colors"
                  >
                    Mark <ChevronRight size={11} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Mark Attendance', to: '/faculty/attendance', icon: ClipboardCheck, accent: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
          { label: 'View Reports',    to: '/faculty/reports',    icon: BarChart3,      accent: 'bg-white     hover:bg-slate-50 text-slate-800 border border-border' },
          { label: 'My Courses',      to: '/faculty/courses',    icon: BookOpen,       accent: 'bg-white     hover:bg-slate-50 text-slate-800 border border-border' },
        ].map(({ label, to, icon: Icon, accent }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold shadow-sm transition-all active:scale-95',
              accent,
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </div>

    </div>
  )
}
