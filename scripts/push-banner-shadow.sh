#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

git add -A
git commit -m "fix(landing): remove shadow + halo from final CTA banner

User feedback: the purple banner should sit flat on the cream page,
no shadow halo. Removed the outer radial-gradient glow div and the
3-layer box-shadow on the banner itself. Banner now reads as a clean
rounded purple block."

git push origin master

echo "✅ Pushed."
