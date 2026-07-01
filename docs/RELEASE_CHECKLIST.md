# Production Release Checklist

Use this for every merge into `master`.

## Before merge
- [ ] PR scope reviewed (one focused change)
- [ ] Required CI checks passed (`lint`, `typecheck`, `secret-scan`)
- [ ] Vercel Preview deployment is **Ready**
- [ ] Teacher flow tested (sign-in → create class → assign activity)
- [ ] Student join tested (valid code joins; invalid/expired rejected)
- [ ] Activity assignment tested
- [ ] Start, pause and end tested
- [ ] Refresh tested (teacher and student)
- [ ] Reconnection tested (brief disconnect recovers)
- [ ] Camera tested (permission granted, denied, unavailable)
- [ ] No production secret exposure (env changes list names only)
- [ ] No unexpected database migration (or migration approved per DATABASE_MIGRATIONS.md)
- [ ] Rollback commit identified (previous good `master` SHA)

## After merge
- [ ] Vercel Production deployment is **Ready**
- [ ] Production commit matches the merged `master` commit
- [ ] Homepage opens (drawintheair.com)
- [ ] Authentication works
- [ ] `/join` works
- [ ] Teacher dashboard opens
- [ ] Classroom realtime connection works (teacher↔student reach same state)
- [ ] Camera initialises
- [ ] Error logs checked (Vercel + Supabase)
- [ ] No new high-severity failures
- [ ] Release recorded (date, PR, commit SHA)

## Separate manual webcam / classroom-device acceptance
Automated tests use **mocked** hand-landmark fixtures (no physical webcam in CI). Before a
pilot, also run a manual pass on real hardware:
- [ ] One child at ~2 m from the camera; wave-to-begin locks onto the primary participant
- [ ] Background people / extra hands are rejected
- [ ] Left and right hands both work
- [ ] Low light, slow and fast movement, edge-of-screen interaction
- [ ] Temporary tracking loss recovers without excessive lag
- [ ] Tested on a school laptop / Chromebook / external webcam / classroom display
