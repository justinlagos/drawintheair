# Chrome Web Store Submission Guide

This guide walks through the exact steps to package, test, and submit the Draw in the Air Chrome extension. It assumes all prerequisite fixes in this repo have been applied (icons, screenshots, credentials, docs).

---

## Pre-flight: Credential Check

⚠️ **Do this before anything else.**

The Google Apps Script deployment URL and admin PIN were previously exposed. Before any release build is created or deployed:

1. Open your Google Apps Script project → **Deploy → Manage Deployments**
2. Delete the old deployment (the URL ending in `...gQ/exec`)
3. Create a **new deployment** and copy the new URL
4. Set in your production environment (Vercel dashboard, not `.env`):
   - `VITE_ADMIN_PIN` = a strong, unique PIN (8+ chars)
   - `VITE_SHEETS_ENDPOINT` = the new Apps Script URL
   - `VITE_BUILD_VERSION` = `1.0.0`
5. Trigger a fresh production build from the clean environment

The `.env` file is now excluded from git tracking. Never commit it.

---

## 1. Verify the PWA in Production

Before submitting the extension, confirm the web app passes Chrome's PWA installability requirements.

### 1a. Check the manifest in Chrome DevTools

1. Visit `https://drawintheair.com/play` in Chrome
2. Open DevTools (F12 / Cmd+Option+I)
3. Go to **Application → Manifest**
4. Confirm: no errors, all icons load, name/description/theme colour appear correctly

**What you should see:**
- Name: "Draw in the Air"
- Icons: 192×192 (any), 192×192 (maskable), 512×512 (any)
- Display: standalone
- Theme colour: #6c47ff
- Background colour: #0f172a
- Screenshots listed

**If you see icon errors:** Ensure the production build includes the `/public/icons/` folder and that `manifest.json` references `/icons/icon-192.png`, `/icons/icon-192-maskable.png`, and `/icons/icon-512.png`.

### 1b. Verify Service Worker registration

1. In DevTools → **Application → Service Workers**
2. Confirm `service-worker.js` shows status "Activated and is running"
3. The service worker only registers on non-localhost origins — this is expected behaviour

**Note:** The service worker is gated to `location.hostname !== 'localhost'`. To test it locally, either use `npm run preview` on a built version, or temporarily remove the hostname check in `src/main.tsx` for local testing only.

### 1c. Run a Lighthouse PWA audit

1. In DevTools → **Lighthouse** tab
2. Select **Progressive Web App** category
3. Run the audit on `https://drawintheair.com/play`
4. Target score: 100 in all PWA checks

**Common PWA Lighthouse failures and fixes:**

| Failure | Fix |
|---|---|
| "No matching service worker" | Check SW registration in `src/main.tsx`, ensure it fires on production hostname |
| "Icons are not the correct size" | Verify `public/icons/icon-512.png` and `public/icons/icon-192.png` exist and are exactly those dimensions |
| "Manifest does not have a maskable icon" | Verify `public/icons/icon-192-maskable.png` is listed with `"purpose": "maskable"` in manifest |
| "start_url does not respond with a 200" | Ensure Vercel routing returns the app at `/` |
| "Not served over HTTPS" | Vercel enforces HTTPS — should pass automatically |

---

## 2. Test the Extension Locally

1. Open `chrome://extensions/`
2. Enable **Developer mode** (toggle, top right)
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder from this repository
5. Confirm "Draw in the Air" appears in the extensions list
6. Pin it to the toolbar
7. Click the icon — a new tab should open to `https://drawintheair.com/play`

**What to verify:**
- The correct production URL opens (not localhost, not staging)
- No console errors appear in the extension's service worker
- The extension icon shows clearly at 16px in the toolbar

**Extension readiness is independent of PWA readiness.** The extension only opens a URL. You can test extension behaviour even before the PWA audit passes.

---

## 3. Package the Extension

Run this exact command from the project root:

```bash
cd chrome-extension
zip -r ../draw-in-the-air-extension.zip . -x ".*" -x "__MACOSX/*"
```

This produces `draw-in-the-air-extension.zip` at the project root.

**Verify zip contents** — it should contain exactly:
```
manifest.json
service-worker.js
README.md
icons/
icons/icon-16.png
icons/icon-48.png
icons/icon-128.png
icons/README.md
```

It must NOT contain: `node_modules`, `.env`, `src`, `dist`, or any app source files.

---

## 4. Prepare Store Listing Assets

All assets are in `docs/cws-assets/`. Upload these to the Chrome Developer Dashboard:

| Asset | File | Dimensions | Required |
|---|---|---|---|
| Store icon | `cws-store-icon-128.png` | 128×128 | Yes |
| Small promo tile | `cws-promo-small-440x280.png` | 440×280 | Yes |
| Screenshot 1 | `cws-screenshot-1-tracing-1280x800.png` | 1280×800 | Yes (at least 1) |
| Screenshot 2 | `cws-screenshot-2-bubbles-1280x800.png` | 1280×800 | Recommended |
| Screenshot 3 | `cws-screenshot-3-paint-1280x800.png` | 1280×800 | Recommended |
| Large promo tile | `cws-promo-large-920x680.png` | 920×680 | Optional |

See `docs/asset-checklist.md` for full dimensions reference and naming conventions.

---

## 5. Set Up Chrome Developer Account

1. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Sign in with a Google account you intend to keep long-term (e.g. `partnership@drawintheair.com`)
3. Pay the **$5 one-time registration fee** if not already paid

---

## 6. Upload and Fill the Store Listing

1. In the Developer Dashboard → **New Item**
2. Upload `draw-in-the-air-extension.zip`
3. Complete the **Store Listing** tab:

### Title
`Draw in the Air — Trace, Learn & Play`
*(Max 45 characters — copy from `docs/store-copy.md`)*

### Summary (Short Description)
`A browser-based educational app where kids use webcam hand tracking to trace letters, numbers, and play games—no mouse required.`
*(Max 132 characters)*

### Detailed Description
Paste the full description from `docs/store-copy.md`.

### Category
Select **Education** (preferred) or **Fun & Games**

### Language
English

---

## 7. Privacy Practices Tab

This is the most scrutinised section. Answer using the exact language in `docs/privacy-compliance.md`.

**Single purpose:**
> "This extension is a lightweight launcher for the Draw in the Air educational web application. When clicked, it opens the app in a new browser tab. It declares zero permissions and collects no data."

**Data usage:**
- Collect user data? → **No**
- Handle personal/sensitive data? → **No**

**Privacy policy URL:** `https://drawintheair.com/privacy`

**Permissions justification:**
> "This extension declares zero permissions. No permissions are needed to open a new browser tab on icon click."

---

## 8. Distribution Tab

- **Visibility:** Public
- **Regions:** All regions (or restrict as desired)

---

## 9. Pre-Submission Checklist

Complete every item before clicking Submit:

- [ ] Production credentials are rotated (new Apps Script URL, new admin PIN set in Vercel)
- [ ] Fresh production build has been triggered in Vercel with new env vars
- [ ] Lighthouse PWA audit passes on `https://drawintheair.com/play`
- [ ] Chrome DevTools → Application → Manifest shows no errors
- [ ] Extension icon opens `https://drawintheair.com/play` (not localhost)
- [ ] Extension zip contains only the 8 files listed above
- [ ] All store screenshots are exactly 1280×800
- [ ] Promo tile (440×280) is ready and uploaded
- [ ] Privacy policy page is live at `https://drawintheair.com/privacy`
- [ ] Store copy has been pasted from `docs/store-copy.md`
- [ ] Privacy practices form completed using `docs/privacy-compliance.md`

---

## 10. Submit for Review

Click **Submit for Review**.

**Expected review timeline:**
- Automated checks: typically within a few hours
- Manual review: 1–3 business days for a first submission
- Because this extension targets children/education, a manual privacy review is likely — this can add 3–7 days

**Why this extension should pass without friction:**
- Zero declared permissions
- No content scripts
- No background activity
- Single clear purpose (launcher)
- Explicit, accurate privacy policy
- No data collection by the extension

---

## Common Rejection Reasons (and Why They Don't Apply Here)

| Rejection reason | Our status |
|---|---|
| Excessive permissions | Zero permissions declared |
| Vague privacy policy for camera use | Explicit, verified policy at /privacy |
| Misleading screenshots | Screenshots show actual gameplay |
| Keyword spamming in description | Store copy is natural language |
| Extension purpose unclear | Single purpose stated in manifest description |
| No privacy policy URL | URL provided and page is live |
| Hidden functionality | All behaviour is open: click → open tab |
