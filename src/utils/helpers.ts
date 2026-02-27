import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * cn  –  Merge Tailwind class names (shadcn/ui convention)
 * Combines clsx + tailwind-merge to safely deduplicate conflicting utilities.
 *
 * @example cn('px-4 py-2', isActive && 'bg-primary', 'px-6')
 * // → 'py-2 bg-primary px-6'
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * generateId  –  Tiny UUID v4 fall-back using crypto.randomUUID
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * formatDate  –  Locale-aware date formatter
 * @param iso ISO 8601 date string or Date object
 */
export function formatDate(iso: string | Date, locale = 'en-IN'): string {
  return new Intl.DateTimeFormat(locale, {
    year:  'numeric',
    month: 'short',
    day:   'numeric',
  }).format(typeof iso === 'string' ? new Date(iso) : iso)
}

/**
 * todayISO  –  Returns today's date as YYYY-MM-DD
 */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * capitalize  –  Capitalises the first character of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
