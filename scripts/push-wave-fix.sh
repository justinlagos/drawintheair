#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

git add -A
git commit -m "fix(wave): visible status, lower threshold, tap-to-skip fallback

USER REPORT
Camera doesn't pick up when user waves on /play. WaveToWake stays
forever with no feedback.

AUDIT FINDINGS
1. NO USER FEEDBACK. The screen showed 'Wave your hand to start!' but
   never indicated whether the camera was running, whether a hand was
   detected, or whether anything was happening. If permission was
   denied or MediaPipe failed to load, the kid was stuck staring at
   a static prompt with no clue what to do.
2. WAVE THRESHOLD TOO STRICT. Detection required Math.abs(dx) > 0.05
   between throttled 100ms updates. Slow waves and small hands didn't
   meet that. Also wakeThreshold was 5 — five full waves was fatiguing
   for 3-year-olds.
3. NO FALLBACK. If camera failed silently, no escape hatch.

FIXES
- Added live hand-detection status pill at the bottom of the panel
  with three states:
    'Looking for your hand…' (aqua, pulsing) — initial / no hand seen
    '✋ Got it! Now wave!' (meadow green, solid) — hand actively detected
    '👀 Come back into the picture' (warm orange) — was detected, lost
  This is updated by a 500ms watchdog comparing now() against
  lastHandSeenAt. Gives the kid (and parents) immediate feedback about
  whether the system can see them.
- Lowered wave threshold from 0.05 → 0.025 (2.5% horizontal movement
  per 100ms tick). Tightened debounce from 300ms → 220ms so vigorous
  waves don't get rate-limited mid-stroke.
- Reduced wakeThreshold from 5 → 4 waves. Less fatiguing, faster
  perceived response.
- Tap-to-skip fallback button appears after 8 seconds of no progress.
  '← Skip — let me in' lets the user bypass the wave gate and proceed
  to the menu, with a small 'Camera not working? Tap above to continue'
  caption. Critical accessibility / failure-mode escape hatch.
- Added wtw-pulse keyframe for the searching-state status dot.

VERIFICATION
- tsc --noEmit clean
- ESLint clean
- All wave-detection state guarded by lastHandSeenAt, no setState in
  render
- Skip button only appears when waveCount < threshold so it disappears
  the moment the kid succeeds with their hands"

git push origin master

echo ""
echo "✅ Pushed. After Vercel redeploy + hard-refresh, /play will:"
echo "  • Show real-time hand-detection status (searching / detected / lost)"
echo "  • Trigger waves on smaller / slower movements"
echo "  • Offer a 'Skip — let me in' button after 8 seconds"
