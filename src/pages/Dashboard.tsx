import { Users, ClipboardCheck, TrendingUp, Wifi } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

const STAT_CARDS = [
  { label: 'Total Students', value: '—', icon: Users,         color: 'text-indigo-500' },
  { label: 'Present Today',  value: '—', icon: ClipboardCheck, color: 'text-emerald-500' },
  { label: 'Engagement',     value: '—', icon: TrendingUp,     color: 'text-violet-500' },
] as const

export default function Dashboard() {
  const isOnline = useOnlineStatus()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of today's attendance and engagement.{' '}
          {!isOnline && (
            <span className="font-medium text-amber-500">
              You are offline – data is cached locally.
            </span>
          )}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <Icon size={18} className={color} />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Offline notice */}
      {!isOnline && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          <Wifi size={16} className="shrink-0" />
          Offline mode active. Changes will sync automatically when you reconnect.
        </div>
      )}
    </div>
  )
}
