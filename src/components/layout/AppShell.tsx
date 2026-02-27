import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import SyncIndicator from '@/components/sync/SyncIndicator'
import NotificationBell from '@/components/notifications/NotificationBell'
import { useAuth } from '@/context/AuthContext'
import { ROLE_LABEL } from '@/config/navConfig'
import { cn } from '@/utils/helpers'

/**
 * AppShell
 * ─────────────────────────────────────────────────────────────────────────
 * Desktop : persistent sidebar (w-60) + scrollable main area.
 * Mobile  : sidebar hidden behind a slide-in drawer toggled by a
 *           hamburger button in the sticky header.
 */
export default function AppShell() {
  const { user }          = useAuth()
  const roleLabel         = user ? ROLE_LABEL[user.role] : ''
  const location          = useLocation()
  const [open, setOpen]   = useState(false)

  // Close drawer on route change (nav link tapped on mobile)
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">

      {/* ── Desktop sidebar (hidden below md) ─────────────────────────── */}
      <div className="hidden md:flex md:h-full md:w-60 md:shrink-0">
        <Sidebar />
      </div>

      {/* ── Mobile drawer overlay ──────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 ease-in-out md:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Close button inside drawer */}
        <button
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
        <Sidebar />
      </div>

      {/* ── Main area ─────────────────────────────────────────────────── */}
      <main className="flex flex-1 min-w-0 flex-col overflow-y-auto">

        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 gap-3">

          {/* Left: hamburger (mobile) + brand */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="md:hidden shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Menu size={20} />
            </button>
            <span className="truncate text-sm font-semibold text-muted-foreground tracking-wide uppercase">
              Smart Attendance
            </span>
          </div>

          {/* Right: notifications + sync pill + role badge */}
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            <SyncIndicator />
            {user && (
              <span className="hidden sm:inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary whitespace-nowrap">
                {roleLabel}
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 sm:p-6 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
