# Privacy & Compliance Reference

When submitting an extension to the Chrome Web Store, the **Privacy Practices** tab is the most common reason for rejection, especially for apps aimed at children or education.

Use this guide to confidently fill out the privacy form and answer questions from school IT admins. All answers here reflect the actual implementation — they are not aspirational or approximate.

---

## Core Privacy Facts (What the Code Actually Does)

1. **The extension is a pure launcher.** It has no background scripts, no permissions, no content scripts, and collects nothing.
2. **Camera processing is strictly local.** MediaPipe runs in the browser. Video frames never leave the device. No image, frame, or coordinate is transmitted to any server.
3. **No child personal data is collected.** No accounts, no names, no emails, no profiles, no persistent identifiers tied to individuals.
4. **First-party anonymous analytics.** The web app sends anonymised usage events (e.g. "Bubble Pop mode started", session heartbeat) to Draw in the Air's own backend at `/api/track`. These events contain no personal data, no camera data, and cannot identify an individual. No third-party analytics services (Google Analytics, Meta Pixel, etc.) are used.
5. **No advertising.** There are no ads, no ad networks, and no data sold to third parties.

---

## 1. Chrome Web Store Privacy Form Answers

When filling out the **Privacy practices** tab on the Chrome Developer Dashboard:

### Single Purpose Description

**What they ask:** Describe the single purpose of your extension.

**What to write:**
> "This extension is a lightweight launcher for the Draw in the Air educational web application. When the user clicks the extension icon, it opens the application (https://drawintheair.com/play) in a new browser tab. The extension does not alter browser functionality, inject content scripts, collect data, or perform any background activity."

---

### Permissions Justification

**What they ask:** Explain why you need the requested permissions.

**What to write:**
> "This extension declares zero permissions. It uses only the `chrome.action.onClicked` API (which requires no declared permission) to open a new tab when the icon is clicked."

---

### Data Usage

**What they ask:** Does your item collect or use any data?

**What to select:**
- Do you collect or use user data? **No**
- Do you handle personal or sensitive user data? **No, not at all.**

**Important note for reviewers:** The *extension itself* collects no data. The web application it launches uses the camera locally for hand tracking and sends anonymised, non-personal usage analytics to its own server. No camera data or personal data is transmitted at any point.

---

## 2. Answering School / IT Admin Questions

Schools are heavily regulated (COPPA, FERPA, UK GDPR). Here are accurate answers to their standard questions:

### "Why does it need camera access?"

> "The application uses on-device computer vision (MediaPipe, loaded from Google's CDN) to track the position of the user's hand and fingers in real time. This creates the 'drawing in the air' experience without needing a mouse or touchscreen. The camera is only accessed while the app is open and in use."

### "Where is the video stored?"

> "Nowhere. Video frames are processed in real time inside the browser's memory. Only hand landmark coordinates are extracted, and the video frame is immediately discarded. No video data, screenshots, or images are ever sent to any server. This is verifiable by inspecting the app's network traffic — no video upload requests are made."

### "What data do you collect on children?"

> "None that is personal or identifiable. We collect anonymised usage events (for example, 'Bubble Pop mode was played for 4 minutes') via our own first-party analytics backend. These events contain no names, no account IDs, no camera data, and cannot be linked to an individual child. We do not use Google Analytics or any third-party tracking."

### "Is this COPPA / FERPA / UK GDPR compliant?"

> "Yes. Because we do not collect, process, or store personally identifiable information from children, the platform is inherently compliant. There are no accounts, no profiles, no persistent identifiers, and no video storage. Schools do not need to obtain parental consent for data collection because no personal data is collected."

### "What does the Chrome extension actually do?"

> "The Chrome extension is a bookmark-style launcher. Clicking its icon opens the Draw in the Air web app in a new browser tab. The extension itself has zero declared permissions and no background scripts. It does not read browsing history, inject code into pages, or collect any data whatsoever."

### "Do you share data with third parties?"

> "No. We do not share, sell, or transfer any data to third parties. The only external network request the app makes is downloading the MediaPipe hand-tracking model from Google's CDN (a one-time download of model weights). No user data accompanies that request."

---

## 3. Privacy Policy Page

The Chrome Web Store requires a link to a live privacy policy URL.

**Privacy policy URL:** `https://drawintheair.com/privacy`

The live `/privacy` page in the codebase (`src/pages/Privacy.tsx`) accurately states:
- Camera processing is local and on-device
- No video is transmitted or stored
- Anonymous usage analytics are sent to Draw in the Air's own server (not third parties)
- No child accounts or personal data are collected
- COPPA/UK GDPR compliance by design

Ensure this page is deployed and accessible before submitting to the Chrome Web Store.

---

## 4. Credential Security Note

⚠️ **Before submission:** The Google Apps Script deployment URL that was previously used for the admin analytics endpoint was exposed in git history. This URL must be considered compromised. You must:

1. Open your Google Apps Script project
2. Go to **Deploy → Manage Deployments**
3. Delete or revoke the old deployment (ending in `...gQ/exec`)
4. Create a **new deployment** with a fresh URL
5. Set the new URL as `VITE_SHEETS_ENDPOINT` in your production environment variables (Vercel dashboard, not in `.env`)

The admin PIN (`VITE_ADMIN_PIN`) must also be set to a strong, unique value in your production environment — not committed to any file. The codebase no longer contains any hardcoded fallback PIN.
