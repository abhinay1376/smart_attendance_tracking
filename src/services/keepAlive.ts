/**
 * keepAlive.ts
 * ────────────────────────────────────────────────────────────────────────
 * Pings the backend /health endpoint every 14 minutes so Render's free-tier
 * instance never cold-starts during an active session.
 *
 * Import this module ONCE at the app entry point (main.tsx) – it starts the
 * interval automatically on import.
 */

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000'

const INTERVAL_MS = 14 * 60 * 1000 // 14 minutes

function ping(): void {
  fetch(`${BASE}/health`, { method: 'GET', cache: 'no-store' }).catch(() => {
    // Silently ignore – network may be offline; we'll retry next interval.
  })
}

// Fire immediately on load so the instance wakes up right away.
ping()

// Keep pinging every 14 minutes.
setInterval(ping, INTERVAL_MS)
