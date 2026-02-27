/**
 * Faculty – Attendance Data (Import / Export)
 * ─────────────────────────────────────────────────────────────────────────
 * Upload previous attendance from Excel, or download the current
 * session data back to Excel.
 *
 * Excel columns (both directions):
 *   Name | Reg No | Subject | Attended Classes | Total Classes | Percentage
 */

import {
  useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent,
} from 'react'
import * as XLSX from 'xlsx'
import {
  Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  Trash2, Info, RefreshCw,
} from 'lucide-react'

import { cn } from '@/utils/helpers'
import { getAllRecords } from '@/services/db'
import { MOCK_STUDENTS, MOCK_SUBJECTS } from '@/data/mockData'

// ─── Storage key for imported rows ───────────────────────────────────────────

const IMPORT_KEY = 'sa_attendance_import'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AttendanceRow {
  name:     string
  regNo:    string
  subject:  string
  attended: number
  total:    number
  percent:  number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise a column header so minor spelling/case variations still match */
function norm(v: unknown): string {
  return String(v ?? '').toLowerCase().trim().replace(/[^a-z0-9]/g, '')
}

/** Map a raw parsed row (from XLSX) to AttendanceRow or null if unrecognisable */
function parseRow(raw: Record<string, unknown>): AttendanceRow | null {
  // Find each column by matching against common header variants
  const keys   = Object.keys(raw)
  const find   = (...matches: string[]) =>
    keys.find((k) => matches.some((m) => norm(k).includes(m)))

  const nameKey     = find('name')
  const regKey      = find('regno', 'reg', 'rollno', 'roll', 'registration')
  const attendedKey = find('attended', 'present', 'classes')
  const totalKey    = find('total')
  const percentKey  = find('percent', 'pct', 'percentage')
  const subjectKey  = find('subject', 'sub', 'course')

  if (!nameKey || !regKey) return null

  const attended = Number(raw[attendedKey ?? ''] ?? 0)
  const total    = Number(raw[totalKey    ?? ''] ?? 0)
  const percent  = percentKey
    ? Number(raw[percentKey])
    : total > 0 ? Math.round((attended / total) * 100) : 0

  return {
    name:     String(raw[nameKey]     ?? '').trim(),
    regNo:    String(raw[regKey]      ?? '').trim(),
    subject:  subjectKey ? String(raw[subjectKey] ?? '').trim() : '—',
    attended: isNaN(attended) ? 0 : attended,
    total:    isNaN(total)    ? 0 : total,
    percent:  isNaN(percent)  ? 0 : percent,
  }
}

/** Load saved rows from localStorage */
function loadSaved(): AttendanceRow[] {
  try {
    const raw = localStorage.getItem(IMPORT_KEY)
    return raw ? (JSON.parse(raw) as AttendanceRow[]) : []
  } catch {
    return []
  }
}

/** Trigger a browser file download */
function triggerDownload(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, desc }: {
  icon: React.ElementType; title: string; desc: string
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm mt-0.5">
        <Icon size={16} />
      </span>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

function PercentBadge({ pct }: { pct: number }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
      pct >= 75 ? 'bg-emerald-100 text-emerald-700' :
      pct >= 60 ? 'bg-amber-100 text-amber-700'     :
                  'bg-rose-100 text-rose-700',
    )}>
      {pct}%
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttendanceData() {
  // ── Import state ──────────────────────────────────────────────────────────
  const fileRef              = useRef<HTMLInputElement>(null)
  const [dragging, setDrag]  = useState(false)
  const [preview,  setPreview] = useState<AttendanceRow[]>([])
  const [parseErr, setParseErr] = useState<string | null>(null)
  const [imported, setImported] = useState<AttendanceRow[]>(loadSaved)

  // ── Export state ──────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)

  // ── Re-read saved data on mount ───────────────────────────────────────────
  useEffect(() => { setImported(loadSaved()) }, [])

  // ── File parsing ──────────────────────────────────────────────────────────
  const processFile = useCallback((file: File) => {
    setParseErr(null)
    setPreview([])

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      setParseErr('Please upload an .xlsx, .xls or .csv file.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb   = XLSX.read(data, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: '',
        })
        const parsed = rows
          .map(parseRow)
          .filter((r): r is AttendanceRow => r !== null && r.name !== '')

        if (parsed.length === 0) {
          setParseErr('No recognisable rows found. Expected columns: Name, Reg No, Attended Classes, Total Classes, Percentage.')
          return
        }
        setPreview(parsed)
      } catch {
        setParseErr('Failed to read the file. Make sure it is a valid Excel or CSV file.')
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  // ── Import confirm ────────────────────────────────────────────────────────
  function confirmImport() {
    const merged = [...imported, ...preview]
    localStorage.setItem(IMPORT_KEY, JSON.stringify(merged))
    setImported(merged)
    setPreview([])
  }

  // ── Clear saved data ─────────────────────────────────────────────────────
  function clearImported() {
    localStorage.removeItem(IMPORT_KEY)
    setImported([])
  }

  // ── Export ────────────────────────────────────────────────────────────────
  async function handleExport() {
    setExporting(true)
    setExportMsg(null)
    try {
      const records = await getAllRecords()

      // Build per-student-per-subject tally
      const tally = new Map<string, { attended: number; total: number }>()
      for (const r of records) {
        const key = `${r.studentId}|${r.subjectId}`
        const cur = tally.get(key) ?? { attended: 0, total: 0 }
        cur.total   += 1
        cur.attended += r.status === 'present' ? 1 : 0
        tally.set(key, cur)
      }

      // Build rows for Excel — join with mock data for names
      const studentMap = new Map(MOCK_STUDENTS.map((s) => [s.id, s]))
      const subjectMap = new Map(MOCK_SUBJECTS.map((s) => [s.id, s]))

      // Also include imported rows
      const importedXlsRows: Array<Record<string, number | string>> = imported.map((r) => ({
        Name:               r.name,
        'Reg No':           r.regNo,
        Subject:            r.subject,
        'Attended Classes': r.attended,
        'Total Classes':    r.total,
        'Percentage':       r.percent,
        Source:             'Imported',
      }))

      const liveRows: Array<Record<string, number | string>> = []
      for (const [key, { attended, total }] of tally.entries()) {
        const [studentId, subjectId] = key.split('|')
        const student = studentMap.get(studentId)
        const subject = subjectMap.get(subjectId)
        const percent = total > 0 ? Math.round((attended / total) * 100) : 0
        liveRows.push({
          Name:               student?.name   ?? studentId,
          'Reg No':           student?.rollNo ?? '—',
          Subject:            subject?.label  ?? subjectId,
          'Attended Classes': attended,
          'Total Classes':    total,
          'Percentage':       percent,
          Source:             'Live',
        })
      }

      const allRows = [...liveRows, ...importedXlsRows]

      if (allRows.length === 0) {
        setExportMsg('No attendance data to export yet. Mark some attendance sessions first.')
        return
      }

      const ws = XLSX.utils.json_to_sheet(allRows)
      // Column widths
      ws['!cols'] = [
        { wch: 22 }, { wch: 12 }, { wch: 24 },
        { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance')

      const date = new Date().toISOString().slice(0, 10)
      triggerDownload(wb, `attendance_${date}.xlsx`)
      setExportMsg(`Exported ${allRows.length} rows successfully.`)
    } catch (err) {
      setExportMsg('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setExporting(false)
    }
  }

  // ── Download blank template ──────────────────────────────────────────────
  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([
      { Name: 'Aarav Shah', 'Reg No': 'CS501', Subject: 'Data Structures', 'Attended Classes': 20, 'Total Classes': 25, Percentage: 80 },
      { Name: 'Priya Mehta', 'Reg No': 'CS502', Subject: 'Data Structures', 'Attended Classes': 18, 'Total Classes': 25, Percentage: 72 },
    ])
    ws['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 24 }, { wch: 18 }, { wch: 14 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Template')
    triggerDownload(wb, 'attendance_template.xlsx')
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Attendance Data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Import previous attendance from an Excel file, or export current session data.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* ══════════════════════════════════════════════════════════════════
            LEFT: Upload / Import
        ══════════════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div className="p-5">

            <SectionHeader
              icon={Upload}
              title="Import Previous Attendance"
              desc="Upload an Excel (.xlsx / .xls) or CSV file with Name, Reg No, Attended Classes, Total Classes and Percentage columns."
            />

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors select-none',
                dragging
                  ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30'
                  : 'border-border hover:border-indigo-300 hover:bg-muted/40',
              )}
            >
              <FileSpreadsheet
                size={32}
                className={dragging ? 'text-indigo-500' : 'text-muted-foreground/50'}
              />
              <p className="text-sm font-medium text-foreground">
                {dragging ? 'Drop to upload' : 'Click or drag & drop your file'}
              </p>
              <p className="text-xs text-muted-foreground">Supports .xlsx, .xls, .csv</p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={onFileChange}
                className="sr-only"
              />
            </div>

            {/* Template download link */}
            <button
              onClick={downloadTemplate}
              className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 hover:underline"
            >
              <Download size={12} /> Download sample template
            </button>

            {/* Parse error */}
            {parseErr && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                <AlertCircle size={14} className="shrink-0 mt-0.5" /> {parseErr}
              </div>
            )}

            {/* Preview table */}
            {preview.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">
                    Preview — {preview.length} row{preview.length !== 1 ? 's' : ''} found
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreview([])}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Discard
                    </button>
                    <button
                      onClick={confirmImport}
                      className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                    >
                      <CheckCircle2 size={12} /> Confirm Import
                    </button>
                  </div>
                </div>

                <div className="overflow-auto rounded-lg border border-border max-h-64">
                  <table className="min-w-full text-xs">
                    <thead className="bg-muted/60 sticky top-0">
                      <tr>
                        {['Name', 'Reg No', 'Subject', 'Attended', 'Total', '%'].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {preview.map((r, i) => (
                        <tr key={i} className="bg-card hover:bg-muted/40">
                          <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{r.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.regNo}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.subject}</td>
                          <td className="px-3 py-2 text-center">{r.attended}</td>
                          <td className="px-3 py-2 text-center">{r.total}</td>
                          <td className="px-3 py-2 text-center"><PercentBadge pct={r.percent} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Saved imported data */}
            {imported.length > 0 && preview.length === 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    {imported.length} imported record{imported.length !== 1 ? 's' : ''} saved
                  </p>
                  <button
                    onClick={clearImported}
                    className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
                  >
                    <Trash2 size={11} /> Clear
                  </button>
                </div>

                <div className="overflow-auto rounded-lg border border-border max-h-64">
                  <table className="min-w-full text-xs">
                    <thead className="bg-muted/60 sticky top-0">
                      <tr>
                        {['Name', 'Reg No', 'Subject', 'Attended', 'Total', '%'].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {imported.map((r, i) => (
                        <tr key={i} className="bg-card hover:bg-muted/40">
                          <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{r.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.regNo}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.subject}</td>
                          <td className="px-3 py-2 text-center">{r.attended}</td>
                          <td className="px-3 py-2 text-center">{r.total}</td>
                          <td className="px-3 py-2 text-center"><PercentBadge pct={r.percent} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RIGHT: Download / Export
        ══════════════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="p-5">

            <SectionHeader
              icon={Download}
              title="Export Attendance Data"
              desc="Download all recorded attendance as an Excel file — includes live session data and any previously imported records."
            />

            {/* Info box */}
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 dark:bg-indigo-950/30 dark:border-indigo-900 px-4 py-3 mb-5">
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 mb-1.5">
                <Info size={12} /> Export format
              </p>
              <ul className="text-xs text-indigo-700/80 dark:text-indigo-400/80 space-y-0.5 list-disc list-inside">
                <li>Name, Reg No, Subject</li>
                <li>Attended Classes, Total Classes</li>
                <li>Percentage (auto-calculated)</li>
                <li>Source (Live / Imported)</li>
              </ul>
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <StatTile label="Imported Records" value={imported.length} color="indigo" />
              <StatTile label="Live Sessions" value="From IDB" color="emerald" />
            </div>

            {/* Export button */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors',
                'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700',
                'disabled:opacity-60 active:scale-[0.98]',
              )}
            >
              {exporting
                ? <><RefreshCw size={15} className="animate-spin" /> Generating…</>
                : <><Download size={15} /> Download attendance_data.xlsx</>}
            </button>

            {/* Feedback */}
            {exportMsg && (
              <div className={cn(
                'mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs',
                exportMsg.startsWith('Export failed') || exportMsg.startsWith('No attendance')
                  ? 'border border-amber-200 bg-amber-50 text-amber-700'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700',
              )}>
                {exportMsg.startsWith('Export failed') || exportMsg.startsWith('No attendance')
                  ? <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  : <CheckCircle2 size={14} className="shrink-0 mt-0.5" />}
                {exportMsg}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Tiny stat tile ───────────────────────────────────────────────────────────

function StatTile({ label, value, color }: {
  label: string; value: string | number; color: 'indigo' | 'emerald'
}) {
  return (
    <div className={cn(
      'rounded-lg border px-4 py-3',
      color === 'indigo'
        ? 'border-indigo-100 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-900'
        : 'border-emerald-100 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900',
    )}>
      <p className={cn(
        'text-xs font-medium',
        color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400',
      )}>
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  )
}
