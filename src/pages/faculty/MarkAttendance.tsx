import { useState, type ReactNode } from 'react'
import { Loader2, Save, CheckCircle2, AlertCircle, Users, ArrowLeft, CalendarDays, Zap } from 'lucide-react'

import { useMarkAttendance } from '@/hooks/useMarkAttendance'
import { cn } from '@/utils/helpers'
import AttendanceCalendar from '@/components/faculty/AttendanceCalendar'

import { Button }                          from '@/components/ui/button'
import { Badge }                           from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label }                           from '@/components/ui/label'
import { Switch }                          from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
}                                          from '@/components/ui/select'

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  )
}

function SummaryStrip({ present, absent }: { present: number; absent: number }) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="success" className="gap-1.5 px-3 py-1 text-xs">
        <CheckCircle2 size={12} />
        {present} Present
      </Badge>
      <Badge variant="destructive" className="gap-1.5 px-3 py-1 text-xs">
        <AlertCircle size={12} />
        {absent} Absent
      </Badge>
      <span className="ml-1 text-xs text-muted-foreground">{present + absent} total</span>
    </div>
  )
}

/** Convert ISO "YYYY-MM-DD" to a readable local date string without UTC-shift */
function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ─── Attendance Form ──────────────────────────────────────────────────────────
// Extracted so the hook can be cleanly called with the selected date.

function AttendanceForm({
  date,
  onBack,
  onSaved,
  onDateChange,
}: {
  date:          string
  onBack:        () => void
  onSaved:       () => void
  onDateChange:  (iso: string) => void
}) {
  const {
    subjects, subjectId, setSubjectId, loadingStudents,
    rows, toggleStatus, toggleActive,
    saving, savedCount, error, handleSave,
  } = useMarkAttendance(date)

  const presentCount = rows.filter((r) => r.status === 'present').length
  const absentCount  = rows.length - presentCount
  const todayISO     = new Date().toISOString().slice(0, 10)

  async function handleSaveAndNotify() {
    await handleSave()
    onSaved()
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="-ml-1 shrink-0 mt-0.5" aria-label="Back to calendar">
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mark Attendance</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CalendarDays size={13} />
              {formatDateLabel(date)}
            </p>
            <label className="inline-flex items-center gap-1 cursor-pointer group">
              <span className="text-xs font-medium text-indigo-600 border border-indigo-200 rounded-full px-2 py-0.5 bg-indigo-50 group-hover:bg-indigo-100 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-400 transition-colors">
                Change date
              </span>
              <input
                type="date"
                defaultValue={date}
                max={todayISO}
                onChange={(e) => { if (e.target.value && e.target.value !== date) onDateChange(e.target.value) }}
                className="sr-only"
                aria-label="Change attendance date"
              />
            </label>
          </div>
        </div>
      </div>

      {/* ── Subject selector ── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Session Details</CardTitle>
          <CardDescription>Choose the subject for this session.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormRow label="Subject">
              <Select
                value={subjectId}
                onValueChange={setSubjectId}
                disabled={subjects.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={subjects.length === 0 ? 'No subjects assigned…' : 'Select subject…'} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
          </div>
        </CardContent>
      </Card>

      {/* ── Student Table ── */}
      {rows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users size={16} className="text-primary" />
                  Student List
                </CardTitle>
                <CardDescription className="mt-1">
                  Toggle attendance and mark active participation.
                </CardDescription>
              </div>
              <SummaryStrip present={presentCount} absent={absentCount} />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* ── Mobile: card per student ── */}
            <div className="divide-y divide-border sm:hidden">
              {rows.map((row, idx) => {
                const isPresent = row.status === 'present'
                return (
                  <div key={row.student.id} className={cn('px-4 py-3 space-y-2.5', !isPresent && 'bg-rose-50/60')}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{row.student.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          #{String(idx + 1).padStart(2, '0')}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={cn('text-xs font-semibold', isPresent ? 'text-emerald-600' : 'text-rose-500')}>
                          {isPresent ? 'Present' : 'Absent'}
                        </span>
                        <Switch
                          checked={isPresent}
                          onCheckedChange={() => toggleStatus(row.student.id)}
                          aria-label={`${row.student.name} ${isPresent ? 'absent' : 'present'}`}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!isPresent}
                      onClick={() => toggleActive(row.student.id)}
                      className={cn(
                        'flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold border transition-colors',
                        row.active && isPresent
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-border text-muted-foreground bg-transparent',
                        !isPresent && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      <Zap size={11} />
                      Active
                    </button>
                  </div>
                )
              })}
            </div>

            {/* ── Desktop: table ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-16">#</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground w-28">
                      Active
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, idx) => {
                    const isPresent = row.status === 'present'
                    return (
                      <tr
                        key={row.student.id}
                        className={cn(
                          'transition-colors',
                          isPresent ? 'bg-background hover:bg-muted/30' : 'bg-rose-50/60 hover:bg-rose-50',
                        )}
                      >
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          {String(idx + 1).padStart(2, '00')}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{row.student.name}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2.5">
                            <Switch
                              checked={isPresent}
                              onCheckedChange={() => toggleStatus(row.student.id)}
                              aria-label={`${row.student.name} ${isPresent ? 'absent' : 'present'}`}
                            />
                            <span className={cn('min-w-[46px] text-xs font-semibold', isPresent ? 'text-emerald-600' : 'text-rose-500')}>
                              {isPresent ? 'Present' : 'Absent'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              disabled={!isPresent}
                              onClick={() => toggleActive(row.student.id)}
                              className={cn(
                                'flex items-center gap-1 rounded px-3 py-1 text-xs font-semibold border transition-colors',
                                row.active && isPresent
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'border-border text-muted-foreground bg-transparent',
                                !isPresent && 'cursor-not-allowed opacity-40',
                              )}
                            >
                              <Zap size={11} />
                              Active
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Feedback + Save ── */}
      {rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-[24px]">
            {savedCount !== null && !error && (
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle2 size={15} />
                {savedCount} record{savedCount !== 1 ? 's' : ''} saved for {formatDateLabel(date)}.
              </p>
            )}
            {error && (
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle size={15} />
                {error}
              </p>
            )}
          </div>
          <div className="flex gap-2 self-start sm:self-auto">
            {savedCount !== null && !error && (
              <Button variant="outline" onClick={onBack} className="gap-2">
                <ArrowLeft size={15} />
                Back to Calendar
              </Button>
            )}
            <Button onClick={handleSaveAndNotify} disabled={saving || !subjectId} className="gap-2">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving…' : 'Save Attendance'}
            </Button>
          </div>
        </div>
      )}

      {/* Empty / loading states */}
      {rows.length === 0 && !loadingStudents && (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Users size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {subjectId ? 'No students enrolled in this subject yet.' : 'Select a subject to load the student list.'}
          </p>
        </div>
      )}
      {loadingStudents && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Loader2 size={28} className="mx-auto mb-3 animate-spin text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Loading students…</p>
        </div>
      )}
    </div>
  )
}

// ─── Page (calendar-first shell) ─────────────────────────────────────────────

export default function MarkAttendance() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [refreshKey,   setRefreshKey]   = useState(0)

  function handleSelectDate(iso: string) {
    setSelectedDate(iso)
  }

  function handleBack() {
    setSelectedDate(null)
  }

  function handleSaved() {
    // Bump refreshKey so the calendar reloads the green "Saved" badges
    setRefreshKey((k) => k + 1)
  }

  // ── Calendar view ──
  if (!selectedDate) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mark Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a weekday to mark attendance, or flag a day as a holiday.
          </p>
        </div>
        <AttendanceCalendar onSelectDate={handleSelectDate} refreshKey={refreshKey} />
      </div>
    )
  }

  // ── Attendance form view ──
  return (
    <AttendanceForm
      key={selectedDate}
      date={selectedDate}
      onBack={handleBack}
      onSaved={handleSaved}
      onDateChange={setSelectedDate}
    />
  )
}
