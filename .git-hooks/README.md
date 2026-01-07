# Git Hooks

To install the pre-push hook that validates TypeScript before pushing:

```bash
# Copy the pre-push hook to git hooks directory
cp .git-hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

This will automatically run `npm run type-check` before every push, preventing TypeScript errors from being pushed to the repository.

