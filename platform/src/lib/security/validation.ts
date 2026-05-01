/**
 * Input validation and sanitization utilities for API endpoints.
 * Centralizes boundary validation to prevent injection attacks.
 */

// ─── String Sanitization ───────────────────────────────────────────────────

/**
 * Sanitize a string by removing control characters and trimming.
 * Does NOT strip HTML — use sanitizeHtml() for that.
 */
export function sanitizeString(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') return ''
  // Remove null bytes and control characters (except newlines/tabs)
  const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  return cleaned.trim().slice(0, maxLength)
}

/**
 * Strip HTML tags to prevent stored XSS in text fields.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}

/**
 * Sanitize a string for safe inclusion in HTML email bodies.
 * Escapes HTML special characters.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// ─── Email Validation ──────────────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false
  if (email.length > 254) return false
  return EMAIL_REGEX.test(email)
}

// ─── UUID Validation ───────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUUID(id: unknown): boolean {
  if (typeof id !== 'string') return false
  return UUID_REGEX.test(id)
}

// ─── Safe Redirect Validation ──────────────────────────────────────────────

/**
 * Validate a redirect URL is safe (relative path only, no protocol injection).
 */
export function isSafeRedirect(url: string): boolean {
  if (!url.startsWith('/')) return false
  if (url.includes('://')) return false
  if (url.includes('//')) return false
  if (url.includes('\\')) return false
  // Block javascript: protocol attempts via URL encoding
  if (url.toLowerCase().includes('javascript:')) return false
  if (url.toLowerCase().includes('data:')) return false
  return true
}

// ─── Rate Limiting ─────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  resetAt: number
}

/**
 * In-memory rate limiter with automatic cleanup.
 * For production, consider Redis-backed rate limiting.
 */
export class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(
    private maxRequests: number,
    private windowMs: number,
  ) {
    // Clean stale entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || entry.resetAt < now) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs })
      return { allowed: true, remaining: this.maxRequests - 1, resetAt: now + this.windowMs }
    }

    if (entry.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt }
    }

    entry.count++
    return { allowed: true, remaining: this.maxRequests - entry.count, resetAt: entry.resetAt }
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (entry.resetAt < now) {
        this.store.delete(key)
      }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

// ─── Request IP Extraction ─────────────────────────────────────────────────

import { NextRequest } from 'next/server'

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    'unknown'
  )
}

// ─── Secure IP Hashing ────────────────────────────────────────────────────

import { createHash } from 'crypto'

/**
 * Hash IP address for privacy-safe logging using SHA-256.
 * The previous implementation used a weak custom hash.
 */
export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

// ─── Content Type Validation ───────────────────────────────────────────────

export function isJsonContentType(request: NextRequest): boolean {
  const ct = request.headers.get('content-type') || ''
  return ct.includes('application/json')
}

// ─── Payload Size Guard ────────────────────────────────────────────────────

/**
 * Check Content-Length header before parsing body.
 * Returns true if payload is within limits.
 */
export function isPayloadWithinLimit(request: NextRequest, maxBytes: number): boolean {
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return false
  }
  return true
}

// ─── Security Headers Helper ───────────────────────────────────────────────

export function securityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0', // Modern browsers: CSP replaces this
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://fmrsfjxwswzhvicylaph.supabase.co wss://fmrsfjxwswzhvicylaph.supabase.co https://api.anthropic.com https://api.stripe.com https://api.resend.com",
      "frame-src 'self' https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  }
}
