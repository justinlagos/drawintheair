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

- **No child PII stored**: We do not collect, store, or transmit personal information about children
- **No biometric data**: No face recognition, video storage, or biometric identifiers
- **Anonymous analytics**: All analytics are coarse-grained and anonymous
- **Local processing**: Camera video is processed locally, never transmitted
- **No tracking cookies**: Analytics use sessionStorage only

### Privacy for Children

- No child accounts
- No persistent identifiers
- No behavioral tracking
- Analytics are aggregated and anonymous
- Camera permissions are clearly explained
- No data sharing with third parties

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
- COPPA (Children's Online Privacy Protection Act) principles
- GDPR principles (no personal data collection)
- UK Data Protection Act principles

## Updates

This security policy is reviewed and updated regularly. Last updated: 2024.

