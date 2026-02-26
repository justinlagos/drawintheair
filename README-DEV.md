# Development Workflow

## Before Pushing Code

Always run these commands before pushing to catch errors early:

```bash
# 1. Check TypeScript types (fast)
npm run type-check

# 2. Run full validation (types + linting)
npm run validate

# 3. Test the build locally (slower, but catches build issues)
npm run build
```

## Pre-Push Hook

A pre-push hook is installed that automatically runs type checking before you push. If TypeScript errors are found, the push will be blocked.

To manually run the validation:
```bash
npm run validate
```

## Common Issues

### TypeScript Errors
- Always run `npm run type-check` before committing
- Fix all TypeScript errors before pushing
- The pre-push hook will prevent pushing if errors exist

### Build Failures
- Test builds locally with `npm run build` before pushing
- Check that all imports are correct
- Ensure no duplicate object properties

## CI/CD

GitHub Actions will automatically:
- Run type checking on every push to `main`
- Run linting on every push
- Block merging PRs with errors

