/**
 * useNotifications
 * ─────────────────────────────────────────────────────────────────────────
 * React hook that reads the notification store for the current user and
 * re-syncs every 10 seconds so newly pushed notifications appear without
 * a page reload (simulating real-time delivery).
 *
 * Returns the full list (newest-first), unread count, and action helpers.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  getNotifications,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  clearNotifications,
  type AppNotification,
} from '@/services/notifications'

// ─── Derive the `to` routing key for the current user ─────────────────────────

function toKey(role: string, email: string): string {
  if (role === 'hod') return 'hod'
  return `${role}:${email}`
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseNotificationsReturn {
  notifications: AppNotification[]
  unreadCount:   number
  markRead:      (id: string) => void
  markAllAsRead: () => void
  remove:        (id: string) => void
  clearAll:      () => void
  refresh:       () => void
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const key = user ? toKey(user.role, user.email) : null

  const refresh = useCallback(() => {
    if (!key) { setNotifications([]); return }
    setNotifications(getNotifications(key))
  }, [key])

  // Initial load + polling every 10 s
  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 10_000)
    return () => clearInterval(timer)
  }, [refresh])

  // Also re-read on tab focus (user switches back from another tab)
  useEffect(() => {
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const markRead = useCallback((id: string) => {
    markNotificationRead(id)
    refresh()
  }, [refresh])

  const markAllAsRead = useCallback(() => {
    if (!key) return
    markAllRead(key)
    refresh()
  }, [key, refresh])

  const remove = useCallback((id: string) => {
    deleteNotification(id)
    refresh()
  }, [refresh])

  const clearAll = useCallback(() => {
    if (!key) return
    clearNotifications(key)
    refresh()
  }, [key, refresh])

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    markRead,
    markAllAsRead,
    remove,
    clearAll,
    refresh,
  }
}
