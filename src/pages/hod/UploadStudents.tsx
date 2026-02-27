/**
 * HoD – Upload Students (CSV / Excel)
 * Admin uploads a spreadsheet with columns: name, regno, phone, email
 * Preview is shown before committing the import.
 * Students login with: email (from file) | password = regno
 */

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  Trash2, Download,
} from 'lucide-react'
import { cn } from '@/utils/helpers'
import { bulkAddStudents, getStudents, deleteStudent, type RegisteredStudent } from '@/services/appData'

// ─── Expected column aliases ──────────────────────────────────────────────────
const COL_NAME  = ['name', 'full name', 'student name', 'fullname', 'studentname']
const COL_REGNO = ['regno', 'reg no', 'reg no.', 'registration no', 'registration number', 'roll no', 'rollno', 'roll number']
const COL_PHONE = ['phone', 'phone number', 'mobile', 'mobile number', 'contact', 'ph no', 'phno', 'ph num']
const COL_EMAIL = ['email', 'email address', 'mail', 'e-mail']

type PreviewRow = { name: string; regNo: string; phone: string; email: string; _error?: string }

function matchCol(headers: string[], aliases: string[]): string | undefined {
  return headers.find((h) => aliases.includes(h.toLowerCase().trim()))
}

function parseSheet(worksheet: XLSX.WorkSheet): PreviewRow[] {
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })
  if (raw.length === 0) return []

  const headers = Object.keys(raw[0])
  const colName  = matchCol(headers, COL_NAME)
  const colRegNo = matchCol(headers, COL_REGNO)
  const colPhone = matchCol(headers, COL_PHONE)
  const colEmail = matchCol(headers, COL_EMAIL)

  return raw.map((row, _i) => {
    const name  = String(colName  ? row[colName]  ?? '' : '').trim()
    const regNo = String(colRegNo ? row[colRegNo] ?? '' : '').trim()
    const phone = String(colPhone ? row[colPhone] ?? '' : '').trim()
    const email = String(colEmail ? row[colEmail] ?? '' : '').trim().toLowerCase()

    const errs: string[] = []
    if (!name)  errs.push('name missing')
    if (!regNo) errs.push('regno missing')
    if (!email) errs.push('email missing')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('invalid email')

    return { name, regNo, phone, email, ...(errs.length ? { _error: errs.join(', ') } : {}) }
  }).filter((r) => r.name || r.regNo || r.email) // skip fully empty rows
}

// ─── Sample CSV download ───────────────────────────────────────────────────────
function downloadTemplate() {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['Name', 'RegNo', 'Phone', 'Email'],
    ['Arjun Sharma', '2024CSE001', '9876543210', 'arjun@college.edu'],
    ['Priya Nair',   '2024CSE002', '9876543211', 'priya@college.edu'],
  ])
  XLSX.utils.book_append_sheet(wb, ws, 'Students')
  XLSX.writeFile(wb, 'students_template.xlsx')
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'done'

export default function HodUploadStudents() {
  const fileRef  = useRef<HTMLInputElement>(null)
  const [step,      setStep]      = useState<Step>('upload')
  const [preview,   setPreview]   = useState<PreviewRow[]>([])
  const [fileName,  setFileName]  = useState('')
  const [result,    setResult]    = useState<{ added: number; skipped: number } | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  // Existing students panel
  const [students,   setStudents]   = useState<RegisteredStudent[]>(() => getStudents())
  const [delId,      setDelId]      = useState<string | null>(null)

  function refresh() { setStudents(getStudents()) }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer)
        const wb   = XLSX.read(data, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = parseSheet(ws)
        if (rows.length === 0) { setError('No data rows found in the file.'); return }
        setPreview(rows)
        setStep('preview')
      } catch {
        setError('Could not read the file. Make sure it is a valid .csv or .xlsx file.')
      }
      // reset file input so same file can be re-selected
      if (fileRef.current) fileRef.current.value = ''
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleImport() {
    setImporting(true)
    await new Promise((r) => setTimeout(r, 200))
    const validRows = preview.filter((r) => !r._error)
    const res = bulkAddStudents(validRows.map((r) => ({
      name:    r.name,
      regNo:   r.regNo,
      phone:   r.phone,
      email:   r.email,
      addedBy: 'admin',
    })))
    setResult(res)
    setStep('done')
    setImporting(false)
    refresh()
  }

  function resetUpload() {
    setStep('upload')
    setPreview([])
    setFileName('')
    setResult(null)
    setError(null)
  }

  const validRows   = preview.filter((r) => !r._error)
  const invalidRows = preview.filter((r) => !!r._error)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Upload Students</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Import students from a <strong>.xlsx</strong> or <strong>.csv</strong> file.
          Students log in using their <strong>email as username</strong> and <strong>Reg No as password</strong>.
        </p>
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* Drop zone */}
          <label
            htmlFor="file-input"
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-10 text-center cursor-pointer',
              'transition-colors hover:bg-indigo-50 hover:border-indigo-400',
            )}
          >
            <FileSpreadsheet size={40} className="text-indigo-400" />
            <div>
              <p className="text-sm font-semibold text-indigo-700">Click to select a file</p>
              <p className="mt-0.5 text-xs text-indigo-500">Supports .xlsx, .xls, .csv</p>
            </div>
            <input
              id="file-input"
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              onChange={handleFile}
            />
          </label>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          {/* Template download */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Need a template?</p>
              <p className="text-xs text-muted-foreground">Download a sample Excel file with the correct column headers.</p>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              <Download size={13} /> Template
            </button>
          </div>

          {/* Required columns info */}
          <div className="rounded-xl border border-border bg-muted/40 px-5 py-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground text-sm mb-2">Required Columns</p>
            {[
              { col: 'Name',  desc: 'Student\'s full name' },
              { col: 'RegNo', desc: 'Registration number — used as login password' },
              { col: 'Email', desc: 'Email address — used as login username' },
              { col: 'Phone', desc: 'Phone number (optional)' },
            ].map(({ col, desc }) => (
              <div key={col} className="flex items-center gap-3">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground w-16 shrink-0">{col}</code>
                <span>{desc}</span>
              </div>
            ))}
            <p className="pt-1 text-[11px]">Column names are case-insensitive. Common aliases (e.g. "Roll No", "Mobile") are automatically detected.</p>
          </div>
        </div>
      )}

      {/* ── STEP 2: Preview ── */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
              📄 {fileName}
            </span>
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              {validRows.length} valid
            </span>
            {invalidRows.length > 0 && (
              <span className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                {invalidRows.length} with errors (will be skipped)
              </span>
            )}
          </div>

          {/* Preview table */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reg No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.map((row, i) => (
                    <tr key={i} className={cn(row._error ? 'bg-rose-50/60' : 'hover:bg-muted/20')}>
                      <td className="px-4 py-3 font-medium text-foreground">{row.name || <span className="text-rose-400 italic">—</span>}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.regNo || <span className="text-rose-400 italic">—</span>}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.email || <span className="text-rose-400 italic">—</span>}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{row.phone || '—'}</td>
                      <td className="px-4 py-3">
                        {row._error ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                            <AlertCircle size={10} /> {row._error}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 size={10} /> OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors active:scale-95"
            >
              {importing ? 'Importing…' : <><Upload size={15} /> Import {validRows.length} Student{validRows.length !== 1 ? 's' : ''}</>}
            </button>
            <button
              onClick={resetUpload}
              className="flex-1 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Done ── */}
      {step === 'done' && result && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center space-y-3">
            <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
            <h2 className="text-xl font-bold text-emerald-800">Import Complete</h2>
            <div className="flex justify-center gap-6 text-sm">
              <div>
                <p className="text-2xl font-bold text-emerald-700">{result.added}</p>
                <p className="text-xs text-emerald-600">Students added</p>
              </div>
              {result.skipped > 0 && (
                <div>
                  <p className="text-2xl font-bold text-amber-600">{result.skipped}</p>
                  <p className="text-xs text-amber-500">Skipped (duplicate email)</p>
                </div>
              )}
            </div>
            <p className="text-xs text-emerald-700">
              Students can now log in with their email address and Reg No as password.
            </p>
          </div>
          <button
            onClick={resetUpload}
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Upload size={15} /> Upload Another File
          </button>
        </div>
      )}

      {/* ── Existing Students Table ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            All Registered Students
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
              {students.length}
            </span>
          </h2>
        </div>

        {students.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-xs text-muted-foreground">
            No students imported yet.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Mobile cards */}
            <div className="divide-y divide-border sm:hidden">
              {students.map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{s.regNo}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                  </div>
                  <button onClick={() => setDelId(s.id)} className="shrink-0 rounded-md p-1.5 text-rose-400 hover:bg-rose-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reg No.</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Added By</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
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
                      <td className="px-5 py-3.5">
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          s.addedBy === 'admin'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-violet-100 text-violet-700',
                        )}>
                          {s.addedBy === 'admin' ? 'Admin' : s.addedBy}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setDelId(s.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-50 transition-colors"
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
      </div>

      {/* Delete confirm */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-foreground">Remove Student?</h3>
            <p className="text-sm text-muted-foreground">This student will lose login access. Attendance records are unaffected.</p>
            <div className="flex gap-3">
              <button onClick={() => { deleteStudent(delId); setDelId(null); refresh() }} className="flex-1 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 transition-colors">Remove</button>
              <button onClick={() => setDelId(null)} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
