# Security Policy

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email security concerns to: partnership@drawintheair.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce (if applicable)
   - Potential impact
   - Suggested fix (if available)

We will respond within 48 hours and work to resolve critical issues promptly.

## Security Practices

### Secure Development

- All code changes are reviewed for security implications
- Dependencies are regularly updated and scanned
- Security headers are configured on all responses
- Input validation is enforced on all user inputs
- Output encoding prevents XSS attacks

### Authentication & Authorization

- Admin dashboard uses secure password authentication
- Session tokens are stored securely (HttpOnly, Secure, SameSite)
- Short session TTL (15 minutes)
- Rate limiting on login attempts
- No authentication required for public-facing features (by design)

### Data Protection

- **Minimal child data**: for learners added by a parent or teacher we store a first name or nickname, an age band, and activity progress. Children joining a class session type a first name or nickname. No surnames, dates of birth, contact details, photos, or video are collected from children
- **No biometric data**: No face recognition, video storage, or biometric identifiers
- **Pseudonymous analytics**: product events carry a per-browser device ID and per-tab session ID, never a name or email. Events are deleted after 365 days by a scheduled job
- **Local processing**: Camera video is processed locally, never transmitted
- **Cookies**: essential cookies and local storage only by default. Google Analytics 4, Microsoft Clarity, PostHog and the Meta Pixel load only after the visitor accepts them in the cookie banner

### Privacy for Children

- No child accounts
- Pseudonymous per-browser device ID only; never linked to a name or email
- No behavioural advertising to children
- Public reporting is aggregated with small groups suppressed
- Camera permissions are clearly explained
- No child data is sold. Sub-processors (Supabase, Stripe, Sentry, PostHog) are listed in the compliance dossier

### API Security

- CORS configured to deny by default
- Rate limiting on sensitive endpoints
- Input validation on all API routes
- No secrets in client-side code
- Environment variables for sensitive configuration

### Infrastructure

- HTTPS enforced
- Security headers (CSP, X-Frame-Options, etc.)
- Regular dependency updates
- No exposed admin endpoints in production

## Security Checklist

See `docs/security-checklist.md` for detailed security checklist.

## Compliance

This application is designed for early years education and complies with:
- UK GDPR and the UK Data Protection Act 2018 (data minimisation, retention limits, parent and teacher access, export and deletion)

## Updates

This security policy is reviewed and updated regularly. Last updated: 2024.

