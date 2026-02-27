import { useMemo, type ReactNode } from 'react'
import { Loader2, Save, CheckCircle2, AlertCircle, Users } from 'lucide-react'

import { useMarkAttendance } from '@/hooks/useMarkAttendance'
import { MOCK_CLASSES, subjectsForClass } from '@/data/mockData'
import { cn } from '@/utils/helpers'

import { Button }                          from '@/components/ui/button'
import { Badge }                           from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label }                           from '@/components/ui/label'
import { Input }                           from '@/components/ui/input'
import { Switch }                          from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
}                                          from '@/components/ui/select'

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Dropdown row for class / subject selectors */
function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  )
}

/** Present / Absent summary pill strip */
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarkAttendance() {
  const {
    classId, subjectId, setClassId, setSubjectId,
    rows, toggleStatus, setEngagement,
    saving, savedCount, error, handleSave,
  } = useMarkAttendance()

  /** Subjects filtered for the chosen class */
  const subjects = useMemo(
    () => (classId ? subjectsForClass(classId) : []),
    [classId],
  )

  const presentCount = rows.filter((r) => r.status === 'present').length
  const absentCount  = rows.length - presentCount

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mark Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a class and subject, then mark each student's attendance and engagement.
        </p>
      </div>

      {/* ── Selector Card ── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Session Details</CardTitle>
          <CardDescription>Choose the class and subject for this session.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Class */}
            <FormRow label="Class / Section">
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class…" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_CLASSES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>

            {/* Subject */}
            <FormRow label="Subject">
              <Select
                value={subjectId}
                onValueChange={setSubjectId}
                disabled={!classId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={classId ? 'Select subject…' : 'Select class first'} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
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
                  Toggle attendance and rate engagement (1 = lowest, 5 = highest).
                </CardDescription>
              </div>
              <SummaryStrip present={presentCount} absent={absentCount} />
            </div>
          </CardHeader>

          <CardContent className="p-0">

            {/* ── Mobile: card per student ─────────────────────────────── */}
            <div className="divide-y divide-border sm:hidden">
              {rows.map((row, idx) => {
                const isPresent = row.status === 'present'
                return (
                  <div
                    key={row.student.id}
                    className={cn(
                      'px-4 py-3 space-y-2.5',
                      !isPresent && 'bg-rose-50/60',
                    )}
                  >
                    {/* Name + roll */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{row.student.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{row.student.rollNo} · #{String(idx + 1).padStart(2, '0')}</p>
                      </div>
                      {/* Status switch */}
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={cn('text-xs font-semibold', isPresent ? 'text-emerald-600' : 'text-rose-500')}>
                          {isPresent ? 'Present' : 'Absent'}
                        </span>
                        <Switch
                          checked={isPresent}
                          onCheckedChange={() => toggleStatus(row.student.id)}
                          aria-label={`Mark ${row.student.name} ${isPresent ? 'absent' : 'present'}`}
                        />
                      </div>
                    </div>

                    {/* Engagement dots */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Engagement:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((dot) => (
                          <button
                            key={dot}
                            type="button"
                            disabled={!isPresent}
                            onClick={() => setEngagement(row.student.id, dot)}
                            className={cn(
                              'h-5 w-5 rounded-full border-2 transition-colors focus:outline-none',
                              dot <= row.engagement && isPresent
                                ? 'bg-primary border-primary'
                                : 'bg-transparent border-muted-foreground/25',
                              !isPresent && 'cursor-not-allowed opacity-40',
                            )}
                            aria-label={`Set engagement to ${dot}`}
                          />
                        ))}
                      </div>
                      <span className={cn('text-xs font-bold', !isPresent && 'opacity-40')}>
                        {isPresent ? row.engagement : '—'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Desktop: table ────────────────────────────────────────── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-16">#</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Roll No</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground w-36">
                      Engagement (1–5)
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
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {row.student.rollNo}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {row.student.name}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2.5">
                            <Switch
                              checked={isPresent}
                              onCheckedChange={() => toggleStatus(row.student.id)}
                              aria-label={`Mark ${row.student.name} ${isPresent ? 'absent' : 'present'}`}
                            />
                            <span className={cn('min-w-[46px] text-xs font-semibold', isPresent ? 'text-emerald-600' : 'text-rose-500')}>
                              {isPresent ? 'Present' : 'Absent'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <Input
                              type="number" min={1} max={5}
                              value={row.engagement}
                              disabled={!isPresent}
                              onChange={(e) => setEngagement(row.student.id, Number(e.target.value))}
                              className={cn('h-8 w-16 text-center tabular-nums', !isPresent && 'opacity-40 cursor-not-allowed')}
                              aria-label={`Engagement score for ${row.student.name}`}
                            />
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((dot) => (
                                <button
                                  key={dot} type="button" disabled={!isPresent}
                                  onClick={() => setEngagement(row.student.id, dot)}
                                  className={cn(
                                    'h-2 w-2 rounded-full transition-colors focus:outline-none',
                                    dot <= row.engagement && isPresent ? 'bg-primary' : 'bg-muted-foreground/25',
                                    !isPresent && 'cursor-not-allowed',
                                  )}
                                  aria-label={`Set engagement to ${dot}`}
                                />
                              ))}
                            </div>
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

          {/* Status messages */}
          <div className="min-h-[24px]">
            {savedCount !== null && !error && (
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle2 size={15} />
                {savedCount} record{savedCount !== 1 ? 's' : ''} saved locally (pending sync).
              </p>
            )}
            {error && (
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle size={15} />
                {error}
              </p>
            )}
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={saving || !subjectId}
            className="gap-2 self-start sm:self-auto"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {saving ? 'Saving…' : 'Save Attendance'}
          </Button>
        </div>
      )}

      {/* Empty state – no class selected */}
      {rows.length === 0 && !classId && (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Users size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            Select a class to load the student list.
          </p>
        </div>
      )}
    </div>
  )
}
