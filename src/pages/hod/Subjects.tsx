/**
 * HoD – Subjects Management
 * Iterative flow per subject card:
 *   1. Create subject
 *   2. Assign faculty   (inline panel, step 1)
 *   3. Upload students  (inline panel, step 2 – immediately follows assign)
 * Steps 2 & 3 repeat as needed without leaving the page.
 */

import * as XLSX from 'xlsx'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import {
  Plus, Trash2, X, BookMarked, UserPlus, UserMinus,
  Upload, CheckCircle2, AlertCircle, ChevronRight, Download,
} from 'lucide-react'
import { cn } from '@/utils/helpers'
import {
  apiGetSubjects,
  apiCreateSubject,
  apiDeleteSubject,
  apiAssignFaculty,
  apiRemoveFaculty,
  apiBulkAddStudents,
  apiGetFaculty,
  type Subject,
} from '@/services/api'

// ─── Seed faculty always available locally ────────────────────────────────────

const SEED_FACULTY: { name: string; email: string }[] = [
  { name: 'Prof. Sharma', email: 'faculty@gmail.com' },
]

// ─── CSV/Excel parsing helpers ────────────────────────────────────────────────

const COL_NAME  = ['name', 'full name', 'student name', 'fullname']
const COL_REGNO = ['regno', 'reg no', 'reg no.', 'registration no', 'registration number', 'roll no', 'rollno', 'roll number']
const COL_PHONE = ['phone', 'phone number', 'mobile', 'mobile number', 'contact']
const COL_EMAIL = ['email', 'email address', 'mail', 'e-mail']

type PreviewRow = { name: string; regNo: string; phone: string; email: string; _error?: string }

function matchCol(headers: string[], aliases: string[]) {
  return headers.find((h) => aliases.includes(h.toLowerCase().trim()))
}

function parseSheet(ws: XLSX.WorkSheet): PreviewRow[] {
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
  if (!raw.length) return []
  const headers = Object.keys(raw[0])
  const cName  = matchCol(headers, COL_NAME)
  const cRegNo = matchCol(headers, COL_REGNO)
  const cPhone = matchCol(headers, COL_PHONE)
  const cEmail = matchCol(headers, COL_EMAIL)

  return raw
    .map((row) => {
      const name  = String(cName  ? row[cName]  ?? '' : '').trim()
      const regNo = String(cRegNo ? row[cRegNo] ?? '' : '').trim()
      const phone = String(cPhone ? row[cPhone] ?? '' : '').trim()
      const email = String(cEmail ? row[cEmail] ?? '' : '').trim().toLowerCase()
      const errs: string[] = []
      if (!name)  errs.push('name missing')
      if (!regNo) errs.push('regno missing')
      if (!email) errs.push('email missing')
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('invalid email')
      return { name, regNo, phone, email, ...(errs.length ? { _error: errs.join(', ') } : {}) }
    })
    .filter((r) => r.name || r.regNo || r.email)
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['Name', 'RegNo', 'Phone', 'Email'],
    ['Arjun Sharma',  '2024CSE001', '9876543210', 'arjun@college.edu'],
    ['Priya Nair',    '2024CSE002', '9876543211', 'priya@college.edu'],
  ])
  XLSX.utils.book_append_sheet(wb, ws, 'Students')
  XLSX.writeFile(wb, 'students_template.xlsx')
}

// ─── Inline upload state per subject ─────────────────────────────────────────

type UploadPhase = 'idle' | 'preview' | 'done'

interface UploadState {
  phase:     UploadPhase
  fileName:  string
  rows:      PreviewRow[]
  result:    { added: number; skipped: number } | null
  parseErr:  string | null
}

const EMPTY_UPLOAD: UploadState = {
  phase: 'idle', fileName: '', rows: [], result: null, parseErr: null,
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState { name: string; code: string }
const EMPTY_FORM: FormState = { name: '', code: '' }

// ─── Component ────────────────────────────────────────────────────────────────

export default function HodSubjects() {
  const [subjects,    setSubjects]    = useState<Subject[]>([])
  const [facultyList, setFacultyList] = useState<{ name: string; email: string }[]>([])
  const [showForm,    setShowForm]    = useState(false)
  const [form,        setForm]        = useState<FormState>(EMPTY_FORM)
  const [formErr,     setFormErr]     = useState<string | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [delId,       setDelId]       = useState<string | null>(null)

  // Which subject's panel is open  (null = none)
  const [activeId, setActiveId] = useState<string | null>(null)
  // Per-subject upload state
  const [uploads, setUploads] = useState<Record<string, UploadState>>({})

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  function refresh() {
    apiGetSubjects().then(setSubjects).catch(console.error)
    apiGetFaculty('approved')
      .then((approved) => {
        const combined = [
          ...SEED_FACULTY,
          ...approved
            .map((f) => ({ name: f.name, email: f.email }))
            .filter((a) => !SEED_FACULTY.some((s) => s.email === a.email)),
        ]
        setFacultyList(combined)
      })
      .catch(console.error)
  }
  useEffect(() => { refresh() }, [])

  // ── Create subject ──────────────────────────────────────────────────────────
  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setFormErr(null)
    setLoading(true)
    try {
      await apiCreateSubject({ name: form.name.trim(), code: form.code.trim().toUpperCase() })
      setForm(EMPTY_FORM)
      setShowForm(false)
      refresh()
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Failed to create subject.')
    } finally {
      setLoading(false)
    }
  }

  // ── Delete subject ──────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    apiDeleteSubject(id)
      .then(() => {
        setDelId(null)
        if (activeId === id) setActiveId(null)
        setUploads((prev) => { const n = { ...prev }; delete n[id]; return n })
        refresh()
      })
      .catch(console.error)
  }

  // ── Toggle faculty assignment ───────────────────────────────────────────────
  function toggleFaculty(subjectId: string, email: string, assigned: boolean) {
    const fn = assigned
      ? apiRemoveFaculty(subjectId, email)
      : apiAssignFaculty(subjectId, email)
    fn.then(() => refresh()).catch(console.error)
  }

  // ── Upload helpers ──────────────────────────────────────────────────────────
  function getUpload(id: string): UploadState {
    return uploads[id] ?? EMPTY_UPLOAD
  }
  function setUpload(id: string, patch: Partial<UploadState>) {
    setUploads((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_UPLOAD), ...patch } }))
  }

  function handleFileChange(subjectId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUpload(subjectId, { parseErr: null, fileName: file.name })
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer)
        const wb   = XLSX.read(data, { type: 'array' })
        const rows = parseSheet(wb.Sheets[wb.SheetNames[0]])
        if (!rows.length) { setUpload(subjectId, { parseErr: 'No data rows found.' }); return }
        setUpload(subjectId, { rows, phase: 'preview' })
      } catch {
        setUpload(subjectId, { parseErr: 'Could not read file. Use a valid .csv or .xlsx.' })
      }
      if (fileRefs.current[subjectId]) fileRefs.current[subjectId]!.value = ''
    }
    reader.readAsArrayBuffer(file)
  }

  function handleImport(subjectId: string) {
    const state     = getUpload(subjectId)
    const sub       = subjects.find((s) => s._id === subjectId)
    const validRows = state.rows.filter((r) => !r._error)
    apiBulkAddStudents(validRows.map((r) => ({
      name:    r.name,
      email:   r.email,
      regNo:   r.regNo,
      phone:   r.phone || undefined,
      classId: sub?.code,           // link students to this subject
    })))
      .then((res) => setUpload(subjectId, { phase: 'done', result: res }))
      .catch((err) => setUpload(subjectId, { parseErr: err instanceof Error ? err.message : 'Import failed.' }))
  }

  function resetUpload(subjectId: string) {
    setUpload(subjectId, EMPTY_UPLOAD)
  }

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Subjects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a subject → assign faculty → upload students — all in one place.
          </p>
        </div>
        <button
          onClick={() => { setShowForm((s) => !s); setFormErr(null) }}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 active:scale-95 transition-all"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? 'Cancel' : 'Add Subject'}
        </button>
      </div>

      {/* ── Create form ── */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">New Subject</h2>
          <form onSubmit={handleCreate} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Subject Name *</label>
                <input
                  required value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Data Structures & Algorithms"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Subject Code *</label>
                <input
                  required value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="CS301"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            {formErr && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{formErr}</p>
            )}
            <button
              type="submit" disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors active:scale-95"
            >
              {loading ? 'Creating…' : <><Plus size={14} /> Create Subject</>}
            </button>
          </form>
        </div>
      )}

      {/* ── Subject list ── */}
      {subjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          <BookMarked size={36} className="mx-auto mb-3 opacity-30" />
          No subjects created yet. Click "Add Subject" to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map((sub) => {
            const isOpen = activeId === sub._id
            const upload = getUpload(sub._id)
            const validRows   = upload.rows.filter((r) => !r._error)
            const invalidRows = upload.rows.filter((r) => !!r._error)
            const assignedNames = sub.assignedFaculty.map((f) => f.name)

            return (
              <div key={sub._id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">

                {/* ── Subject summary row ── */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <span className="flex shrink-0 items-center justify-center rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-700 font-mono tracking-wide">
                    {sub.code}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{sub.name}</p>
                    {assignedNames.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {assignedNames.map((n) => (
                          <span key={n} className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">{n}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted-foreground italic">No faculty assigned</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => setActiveId(isOpen ? null : sub._id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors',
                        isOpen
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50',
                      )}
                    >
                      <UserPlus size={12} />
                      {isOpen ? 'Close' : 'Assign & Upload'}
                    </button>
                    <button
                      onClick={() => setDelId(sub._id)}
                      className="rounded-lg border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* ════ Expanded panel ════ */}
                {isOpen && (
                  <div className="border-t border-border">

                    {/* ── Step 1: Assign faculty ── */}
                    <div className="bg-muted/30 px-5 py-4">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">1</span>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assign / Remove Faculty</p>
                      </div>

                      {facultyList.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No approved faculty available.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {facultyList.map((fac) => {
                            const isAssigned = sub.assignedFaculty.some((f) => f.email === fac.email)
                            return (
                              <button
                                key={fac.email}
                                onClick={() => toggleFaculty(sub._id, fac.email, isAssigned)}
                                className={cn(
                                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                                  isAssigned
                                    ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700'
                                    : 'border-border text-muted-foreground hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50',
                                )}
                              >
                                {isAssigned ? <UserMinus size={11} /> : <UserPlus size={11} />}
                                {fac.name}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Divider with arrow */}
                    <div className="flex items-center gap-3 border-t border-dashed border-border bg-muted/10 px-5 py-2">
                      <ChevronRight size={14} className="text-indigo-400 shrink-0" />
                      <p className="text-[11px] text-muted-foreground">After assigning faculty, upload students below</p>
                    </div>

                    {/* ── Step 2: Upload students ── */}
                    <div className="bg-background px-5 py-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">2</span>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upload Students</p>
                        <span className="ml-auto">
                          <button
                            onClick={downloadTemplate}
                            className="flex items-center gap-1 rounded-md border border-indigo-200 px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <Download size={11} /> Template
                          </button>
                        </span>
                      </div>

                      {/* ── idle: file picker ── */}
                      {upload.phase === 'idle' && (
                        <div className="space-y-3">
                          <label
                            htmlFor={`file-${sub._id}`}
                            className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-5 py-5 hover:bg-indigo-50 hover:border-indigo-400 transition-colors"
                          >
                            <Upload size={22} className="text-indigo-400 shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-indigo-700">Click to select .xlsx, .xls or .csv</p>
                              <p className="text-xs text-indigo-500 mt-0.5">Columns: Name · RegNo · Phone · Email</p>
                            </div>
                            <input
                              id={`file-${sub._id}`}
                              ref={(el) => { fileRefs.current[sub._id] = el }}
                              type="file"
                              accept=".xlsx,.xls,.csv"
                              className="sr-only"
                              onChange={(e) => handleFileChange(sub._id, e)}
                            />
                          </label>
                          {upload.parseErr && (
                            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
                              <AlertCircle size={13} className="shrink-0" /> {upload.parseErr}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── preview: table + import button ── */}
                      {upload.phase === 'preview' && (
                        <div className="space-y-3">
                          {/* Summary badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              📄 {upload.fileName}
                            </span>
                            <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              {validRows.length} valid
                            </span>
                            {invalidRows.length > 0 && (
                              <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                {invalidRows.length} errors (skipped)
                              </span>
                            )}
                          </div>

                          {/* Compact preview table */}
                          <div className="max-h-52 overflow-auto rounded-lg border border-border">
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-muted/80">
                                <tr>
                                  {['Name', 'Reg No', 'Email', 'Status'].map((h) => (
                                    <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {upload.rows.map((row, i) => (
                                  <tr key={i} className={cn(row._error ? 'bg-rose-50/60' : 'hover:bg-muted/20')}>
                                    <td className="px-3 py-2 font-medium text-foreground">{row.name || <span className="italic text-rose-400">—</span>}</td>
                                    <td className="px-3 py-2 font-mono text-muted-foreground">{row.regNo || <span className="italic text-rose-400">—</span>}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{row.email || <span className="italic text-rose-400">—</span>}</td>
                                    <td className="px-3 py-2">
                                      {row._error
                                        ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"><AlertCircle size={9} />{row._error}</span>
                                        : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"><CheckCircle2 size={9} />OK</span>
                                      }
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Buttons */}
                          <div className="flex gap-2">
                            <button
                              disabled={validRows.length === 0}
                              onClick={() => handleImport(sub._id)}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors active:scale-95"
                            >
                              <Upload size={13} /> Import {validRows.length} Student{validRows.length !== 1 ? 's' : ''}
                            </button>
                            <button
                              onClick={() => resetUpload(sub._id)}
                              className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── done: result + upload another ── */}
                      {upload.phase === 'done' && upload.result && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                            <CheckCircle2 size={28} className="text-emerald-500 shrink-0" />
                            <div>
                              <p className="text-sm font-bold text-emerald-800">Import complete</p>
                              <p className="text-xs text-emerald-700 mt-0.5">
                                <strong>{upload.result.added}</strong> added
                                {upload.result.skipped > 0 && (
                                  <> · <strong>{upload.result.skipped}</strong> duplicate{upload.result.skipped !== 1 ? 's' : ''} skipped</>
                                )}
                              </p>
                            </div>
                          </div>
                          {/* Iterate: assign more / upload another */}
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => resetUpload(sub._id)}
                              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <Upload size={12} /> Upload Another File
                            </button>
                            <button
                              onClick={() => setActiveId(null)}
                              className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* ════ end expanded panel ════ */}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Delete confirm ── */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-foreground">Delete Subject?</h3>
            <p className="text-sm text-muted-foreground">
              This will permanently remove the subject and all faculty assignments.
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(delId)} className="flex-1 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 transition-colors">Delete</button>
              <button onClick={() => setDelId(null)}      className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
