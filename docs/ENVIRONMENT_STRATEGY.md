# Environment Strategy

Four environments. Production data and credentials live **only** in Production.

| | Branch | URL | Supabase | Data | Service-role key |
|---|---|---|---|---|---|
| **Development** | task branch | localhost | local or non-prod project | safe test accounts | never present |
| **Preview** | every task branch | Vercel Preview URL | **non-production** project | synthetic teacher/learner | never present |
| **Staging** (if enabled) | one `staging` branch | fixed staging URL | **separate** staging project | synthetic school data | never present |
| **Production** | `master` | drawintheair.com | production (`fmrsfjxwswzhvicylaph`) | real data | server-side only (Edge Functions) |

## Rules
- The production Supabase project ref is **`fmrsfjxwswzhvicylaph`**. Preview and Staging
  must **not** point at it.
- The Supabase **service-role** key never appears in client (`VITE_`) code or in Preview.
  It belongs only in server-side environments (Supabase Edge Function env / server routes).
- Webcam frames and video stay on the device. No child video is uploaded, recorded, or stored.

## Defensive guard
`scripts/check-env-safety.mjs` fails the build/CI when:
- a Preview or Staging deployment points at the production Supabase ref;
- a privileged/service-role secret is exposed through a public `VITE_` variable;
- required public env vars are missing (hard-fail in production, warning elsewhere);
- the production environment is using an unexpected Supabase ref (warning).

It logs only safe identifiers — environment name, Vercel deploy type, the public Supabase
ref, and the commit SHA. It never prints secret values.

Run it:
```
npm run check:env-safety
```
Wire it into Vercel **Preview/Staging** build commands and it already runs in CI
(`secret-scan` job) and in `./scripts/check-task.sh`.

## Staging — recommendation
Vercel's standard model gives you **Production** (from `master`) and **Preview** (every
other branch) out of the box; a separate always-on "staging" is not a distinct first-class
environment on the Hobby/Pro plans the way Preview is.

- **Preferred:** treat **Preview** deployments as your pre-production environment (every
  PR already gets one). No extra branch needed.
- **If you need a fixed, always-on pre-production URL** (e.g. for a school to retest the
  same link): create **one** long-lived `staging` branch, give it its own Vercel
  Preview-scoped environment variables (separate Supabase project), and bookmark its
  stable Preview URL. Do **not** also create a `develop` branch. Confirm your current
  Vercel plan supports the staging setup you want before relying on it.
