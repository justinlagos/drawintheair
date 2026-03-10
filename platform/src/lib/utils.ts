import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge classNames using clsx and tailwind-merge.
 * Handles conditional classes and tailwind conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Format a date to a human-readable string.
 * Examples: "Jan 1, 2025", "Today at 2:30 PM", "Yesterday at 10:15 AM"
 */
export function formatDate(date: string | Date, includeTime = true): string {
  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) {
    return 'Invalid date'
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  const timeStr = includeTime
    ? d.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        meridiem: 'short',
      })
    : ''

  if (dateOnly.getTime() === today.getTime()) {
    return `Today${includeTime ? ` at ${timeStr}` : ''}`
  }

  if (dateOnly.getTime() === yesterday.getTime()) {
    return `Yesterday${includeTime ? ` at ${timeStr}` : ''}`
  }

  const formatted = d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })

  return `${formatted}${includeTime ? ` at ${timeStr}` : ''}`
}

/**
 * Format seconds into a readable duration string.
 * Examples: "1m 30s", "45s", "2h 15m"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) {
    return '0s'
  }

  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)

  if (minutes < 60) {
    if (remainingSeconds === 0) {
      return `${minutes}m`
    }
    return `${minutes}m ${remainingSeconds}s`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Format a number with locale-aware thousands separator.
 * Examples: "1,234", "1,234.56"
 */
export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format a number as a percentage.
 * Examples: "85%", "85.5%"
 */
export function formatPercent(n: number, decimals = 0): string {
  return `${formatNumber(n, decimals)}%`
}

/**
 * Generate a random 4-digit session code for students to join.
 * Returns a string like "A3K9", "X2M1", etc.
 */
export function generateSessionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Get star emoji representation for a star rating.
 * Examples: ⭐⭐⭐⭐⭐ (5 stars), ⭐⭐⭐⭐☆ (4 stars), ☆☆☆☆☆ (0 stars)
 */
export function getStarEmoji(stars: number, maxStars = 5): string {
  const filledStars = Math.min(Math.max(Math.round(stars), 0), maxStars)
  const emptyStars = maxStars - filledStars
  return '⭐'.repeat(filledStars) + '☆'.repeat(emptyStars)
}

/**
 * Simple pluralization helper.
 * Examples: pluralize(1, 'student') => 'student'
 *           pluralize(2, 'student') => 'students'
 *           pluralize(5, 'item', 'items') => 'items'
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  if (count === 1) {
    return singular
  }
  return plural || `${singular}s`
}

/**
 * Truncate a string to a maximum length with ellipsis.
 * Examples: truncate('Hello World', 8) => 'Hello...'
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str
  }
  return str.slice(0, maxLength - 3) + '...'
}

/**
 * Convert a string to title case.
 * Examples: 'hello world' => 'Hello World', 'user_name' => 'User Name'
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

/**
 * Convert snake_case to camelCase.
 * Examples: 'user_name' => 'userName'
 */
export function toCamelCase(str: string): string {
  return str.toLowerCase().replace(/[_-](.)/g, (_, char) => char.toUpperCase())
}

/**
 * Format bytes to a human-readable size.
 * Examples: 1024 => '1 KB', 1048576 => '1 MB'
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Sleep/delay for a specified number of milliseconds.
 * Useful for testing or artificial delays.
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if a string is a valid email address (basic validation).
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check if a string is a valid URL.
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Deep clone an object (works for JSON-serializable objects).
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}
