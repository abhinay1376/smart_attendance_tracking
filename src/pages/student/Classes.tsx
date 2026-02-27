import { GraduationCap } from 'lucide-react'
import { MOCK_CLASSES, subjectsForClass } from '@/data/mockData'

// Demo student is in cls-1
const STUDENT_CLASS_ID = 'cls-1'

export default function StudentClasses() {
  const cls      = MOCK_CLASSES.find((c) => c.id === STUDENT_CLASS_ID)
  const subjects = subjectsForClass(STUDENT_CLASS_ID)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Classes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your enrolled class and subjects for this semester.
        </p>
      </div>

      {/* Class card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
            <GraduationCap size={18} className="text-indigo-600" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{cls?.label ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{subjects.length} subjects enrolled</p>
          </div>
        </div>

        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {subjects.map((sub, idx) => (
            <div key={sub.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-xs font-bold text-indigo-600">
                  {idx + 1}
                </span>
                <span className="text-sm font-medium text-foreground">{sub.label}</span>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                Enrolled
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
