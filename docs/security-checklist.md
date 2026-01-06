# Security Checklist

Use this checklist when making changes to ensure security best practices.

## Input Validation

- [ ] All user inputs are validated (type, length, format)
- [ ] Server-side validation implemented (if applicable)
- [ ] No raw user input in SQL queries (N/A - no database)
- [ ] File uploads validated (if applicable)
- [ ] URL parameters sanitized

## XSS Prevention

- [ ] No `dangerouslySetInnerHTML` usage
- [ ] All user-provided strings are escaped
- [ ] Rich text is sanitized (if applicable)
- [ ] Content Security Policy configured
- [ ] Output encoding applied consistently

## CSRF Protection

- [ ] CSRF tokens on state-changing requests (if applicable)
- [ ] SameSite cookie attribute set
- [ ] Origin validation on API requests

## Authentication & Session Management

- [ ] Secure password storage (hashed, never plaintext)
- [ ] Session tokens use HttpOnly, Secure, SameSite
- [ ] Short session TTL (15 minutes)
- [ ] Rate limiting on login attempts
- [ ] Logout clears all session data
- [ ] No credentials in URLs or logs

## Data Protection

- [ ] No child PII collected or stored
- [ ] No biometric data stored
- [ ] No video frames stored
- [ ] Analytics are anonymous and aggregated
- [ ] No tracking cookies for children
- [ ] Data retention policies defined

## API Security

- [ ] CORS configured (deny by default)
- [ ] Rate limiting on sensitive endpoints
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive info
- [ ] No secrets in client code
- [ ] Environment variables for config

## Security Headers

- [ ] Content-Security-Policy (camera compatible)
- [ ] X-Frame-Options / frame-ancestors
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy configured
- [ ] Permissions-Policy (camera only where needed)
- [ ] Strict-Transport-Security (if HTTPS)

## Privacy

- [ ] Privacy policy clearly states data practices
- [ ] No unnecessary data collection
- [ ] Clear consent for camera access
- [ ] No third-party tracking
- [ ] Analytics are privacy-respecting

## Code Security

- [ ] No hardcoded secrets
- [ ] Dependencies up to date
- [ ] No eval() or similar dangerous functions
- [ ] Error handling doesn't expose internals
- [ ] Logging doesn't include PII

## Infrastructure

- [ ] HTTPS enforced
- [ ] Admin endpoints protected
- [ ] Regular security updates
- [ ] Monitoring for suspicious activity
- [ ] Backup and recovery procedures

## Testing

- [ ] Security testing performed
- [ ] Penetration testing (if applicable)
- [ ] Dependency scanning
- [ ] Code review for security issues

## Documentation

- [ ] Security policy documented
- [ ] Incident response plan
- [ ] Data handling procedures documented
- [ ] Privacy practices documented

