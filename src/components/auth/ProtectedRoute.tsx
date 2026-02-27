import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { Role } from '@/types/auth'

interface ProtectedRouteProps {
  /** Roles permitted to access this subtree. Omit to allow any authenticated user. */
  allowedRoles?: Role[]
}

/**
 * ProtectedRoute
 * ─────────────────────────────────────────────────────────────────────────
 * 1. If the session is still loading → render nothing (avoids flicker).
 * 2. If the user is not authenticated → redirect to /login, preserving
 *    the intended destination in `state.from` so Login can redirect back.
 * 3. If `allowedRoles` is set and the user's role is not in the list →
 *    redirect to their own home dashboard (safe fallback).
 * 4. Otherwise → render the nested <Outlet>.
 */
export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    // Prevent a flash of the login page while rehydrating from localStorage
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Wrong role — send them to their own home
    const home = `/${user.role}/dashboard`
    return <Navigate to={home} replace />
  }

  return <Outlet />
}
