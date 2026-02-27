import { NavLink } from 'react-router-dom'
import { Wifi, WifiOff, LogOut } from 'lucide-react'
import { cn } from '@/utils/helpers'
import { useAuth } from '@/context/AuthContext'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { NAV_CONFIG, ROLE_LABEL } from '@/config/navConfig'

/**
 * Sidebar
 * ─────────────────────────────────────────────────────────────────────────
 * Inverted (deep-indigo) sidebar whose nav items are driven entirely by
 * the authenticated user's role via NAV_CONFIG.
 */
export default function Sidebar() {
  const { user, logout } = useAuth()
  const isOnline         = useOnlineStatus()
  const navItems         = user ? NAV_CONFIG[user.role] : []
  const roleLabel        = user ? ROLE_LABEL[user.role] : ''

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0">

      {/* ── Brand ── */}
      <div className="flex items-center gap-2.5 px-5 py-5 select-none">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white font-black text-lg">
          A
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-sidebar-foreground/90">Smart Attendance</span>
          <span className="text-[10px] font-medium text-sidebar-foreground/50 uppercase tracking-widest">
            {roleLabel}
          </span>
        </div>
      </div>

      {/* ── Role-based Nav ── */}
      <nav className="flex-1 space-y-0.5 px-3 overflow-y-auto scrollbar-hide">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-white'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white',
              )
            }
          >
            <Icon size={16} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── User strip + online status ── */}
      <div className="border-t border-sidebar-border px-4 py-3 space-y-2">
        <div
          className={cn(
            'flex items-center gap-2 text-xs font-medium',
            isOnline ? 'text-emerald-400' : 'text-rose-400',
          )}
        >
          {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
          {isOnline ? 'Online – synced' : 'Offline – local only'}
        </div>

        {user && (
          <div className="flex items-center justify-between">
            <div className="leading-tight min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground/90 truncate">{user.name}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              title="Log out"
              className="ml-2 shrink-0 rounded-md p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-white transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
