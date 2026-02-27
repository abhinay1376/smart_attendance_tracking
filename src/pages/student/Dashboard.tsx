/**
 * Student Dashboard
 * ─────────────────────────────────────────────────────────────────────────
 * Sections (top → bottom)
 *  1. Greeting + metadata row
 *  2. Low-attendance alert banner (conditional)
 *  3. Summary stat cards  (overall %, classes attended, subjects, short)
 *  4. Overall progress gauge (large progress bar)
 *  5. Subject-wise bar chart  (recharts)
 *  6. Per-subject breakdown table (rows with progress + needed/skip info)
 */

import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useAuth }                 from '@/context/AuthContext'
import { useStudentAttendance }    from '@/hooks/useStudentAttendance'
import { ATTENDANCE_THRESHOLD }    from '@/utils/attendanceCalc'
import { Progress }                from '@/components/ui/progress'
import { cn }                      from '@/utils/helpers'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pctVariant(pct: number): 'default' | 'success' | 'warning' | 'danger' {
  if (pct >= 85)  return 'success'
  if (pct >= ATTENDANCE_THRESHOLD) return 'default'
  if (pct >= 60)  return 'warning'
  return 'danger'
}

function pctColor(pct: number): string {
  if (pct >= 85)  return '#10b981'   // emerald-500
  if (pct >= ATTENDANCE_THRESHOLD) return '#6366f1'   // indigo-500
  if (pct >= 60)  return '#f59e0b'   // amber-500
  return '#ef4444'                   // red-500
}

// ─── Custom recharts tooltip ──────────────────────────────────────────────────

interface TooltipEntry {
  payload?: { attended: number; total: number; percentage: number }
}

function ChartTooltip({ active, payload, label }: {
  active?:  boolean
  payload?: TooltipEntry[]
  label?:   string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs space-y-0.5">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">
        Attended:{' '}
        <span className="font-medium text-foreground">{d?.attended} / {d?.total}</span>
      </p>
      <p className="text-muted-foreground">
        Percentage:{' '}
        <span className="font-bold" style={{ color: pctColor(d?.percentage ?? 0) }}>
          {d?.percentage}%
        </span>
      </p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const { user }                         = useAuth()
  const { subjects, overall, isLoading } = useStudentAttendance()

  const lowSubjects = subjects.filter((s) => s.isLow)
  const shortCount  = lowSubjects.length

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-muted" />
      </div>
    )
  }

  // ── Stat card data ─────────────────────────────────────────────────────────
  const statCards = [
    {
      label: 'Overall Attendance',
      value: `${overall.percentage}%`,
      icon:  TrendingUp,
      color: pctColor(overall.percentage),
    },
    {
      label: 'Classes Attended',
      value: `${overall.attended} / ${overall.total}`,
      icon:  ClipboardCheck,
      color: '#6366f1',
    },
    {
      label: 'Enrolled Subjects',
      value: String(subjects.length),
      icon:  BookOpen,
      color: '#0ea5e9',
    },
    {
      label: 'Short Attendance',
      value: String(shortCount),
      icon:  AlertTriangle,
      color: shortCount > 0 ? '#f59e0b' : '#10b981',
    },
  ] as const

  return (
    <div className="space-y-6">

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Hello, {user?.name} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Semester attendance overview ·{' '}
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      </div>

      {/* ── Low-attendance alert banner ───────────────────────────────────── */}
      {shortCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800">
              Low attendance in {shortCount} subject{shortCount > 1 ? 's' : ''}
            </p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-amber-700">
              {lowSubjects.map((s) => (
                <li key={s.subjectId}>
                  <span className="font-medium">{s.label}</span> — {s.percentage}%
                  {s.needed > 0 && (
                    <span className="text-amber-600">
                      {' '}· attend next {s.needed} class{s.needed > 1 ? 'es' : ''} to reach {ATTENDANCE_THRESHOLD}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon size={16} style={{ color }} />
            </div>
            <p className="mt-3 text-2xl font-bold" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Overall progress gauge ────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Overall Attendance</h2>
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-semibold',
              overall.isLow
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700',
            )}
          >
            {overall.isLow
              ? `${ATTENDANCE_THRESHOLD - overall.percentage}% below target`
              : 'On Track ✓'}
          </span>
        </div>

        <Progress
          value={overall.percentage}
          variant={pctVariant(overall.percentage)}
          className="h-4"
          label="Overall attendance percentage"
        />

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{overall.attended} classes attended out of {overall.total}</span>
          <span className="text-base font-bold" style={{ color: pctColor(overall.percentage) }}>
            {overall.percentage}%
          </span>
        </div>

        {/* 75% threshold marker */}
        <div className="relative mt-2 h-4">
          <div
            className="absolute top-0 h-3 w-px bg-muted-foreground/40"
            style={{ left: `${ATTENDANCE_THRESHOLD}%` }}
          />
          <p
            className="absolute top-1 -translate-x-1/2 text-[10px] text-muted-foreground/70"
            style={{ left: `${ATTENDANCE_THRESHOLD}%` }}
          >
            {ATTENDANCE_THRESHOLD}% min
          </p>
        </div>
      </div>

      {/* ── Subject-wise bar chart ────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <h2 className="mb-4 sm:mb-5 text-sm font-semibold text-foreground">Subject-wise Attendance</h2>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={subjects.map((s) => ({
              name:       s.label.split(' ').slice(0, 2).join(' '),
              fullName:   s.label,
              attended:   s.attended,
              total:      s.total,
              percentage: s.percentage,
            }))}
            margin={{ top: 4, right: 16, left: -16, bottom: 4 }}
            barSize={28}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            {/* Threshold reference — second CartesianGrid layer with a single y value */}
            <CartesianGrid
              strokeDasharray="6 3"
              stroke="#f59e0b"
              horizontal
              vertical={false}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
            />
            <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
              {subjects.map((s) => (
                <Cell key={s.subjectId} fill={pctColor(s.percentage)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Dashed amber grid = {ATTENDANCE_THRESHOLD}% minimum threshold
        </p>
      </div>

      {/* ── Per-subject breakdown table ───────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Subject Breakdown</h2>
        </div>

        <div className="divide-y divide-border">
          {subjects.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No attendance records found.
            </p>
          )}

          {subjects.map((s) => (
            <div key={s.subjectId} className="space-y-2 px-4 sm:px-6 py-4">
              {/* Row header */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2">
                  {s.isLow ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  )}
                  <span className="truncate text-sm font-medium text-foreground">{s.label}</span>
                </div>
                <span className="shrink-0 text-sm font-bold" style={{ color: pctColor(s.percentage) }}>
                  {s.percentage}%
                </span>
              </div>

              {/* Progress bar */}
              <Progress
                value={s.percentage}
                variant={pctVariant(s.percentage)}
                label={`${s.label} attendance`}
              />

              {/* Meta row */}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{s.attended} / {s.total} classes attended</span>

                {s.isLow ? (
                  <span className="font-medium text-amber-600">
                    Attend {s.needed} more class{s.needed !== 1 ? 'es' : ''} to reach {ATTENDANCE_THRESHOLD}%
                  </span>
                ) : (
                  <span className="text-emerald-600">
                    {s.canSkip > 0
                      ? `Can miss up to ${s.canSkip} class${s.canSkip !== 1 ? 'es' : ''}`
                      : 'No classes to spare'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
