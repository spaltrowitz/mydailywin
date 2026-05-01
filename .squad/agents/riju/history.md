# Riju — History

## Project Context
**Project:** MyDailyWin — gamified habit-tracking web app
**Stack:** Vanilla HTML/CSS/JS, Firebase (Hosting + Auth + Firestore), EmailJS, PWA
**User:** Shari Paltrowitz
**Repo:** mydailywin (spaltrowitz/mydailywin)

Two-role trust model: Admin (parent/manager) configures tasks, approves payouts, manages settings. User (kid/employee) completes tasks, earns points, spins wheel. Data syncs via localStorage keys and Firestore. Admin writes to `hr_admin_{profile}`, user reads via `getConfiguredDailyTasks()`. Balance resets write to both `STORAGE_KEY` and `hr_state_stu`. Profile creation propagates `hr_pending_user_email` from login into profileData.

Key security surfaces: firestore.rules, login.html (auth), admin.html (privilege), app.html (user), functions/ (Cloud Functions).

## Learnings

### 2025-01-XX — Full Security Audit

**Key Architecture Findings:**
- Two-role model (admin/user) with shared localStorage as primary data store
- Firestore used for cross-device sync but many collections lack ownership scoping (marked with TODOs)
- Auth flow uses Firebase Auth with Google + email/password
- Admin authorization uses multi-layered check: Firestore profile owner → Firestore admins subcollection → localStorage fallback → legacy 'stu' hardcoded owner
- EmailJS public key and service ID are client-side (expected for EmailJS but still an exposure)
- CSP is configured in firebase.json with 'unsafe-inline' for scripts
- login.html has open redirect vulnerability via `?redirect=` param
- No rate limiting on client-side payout requests
- Profile names from localStorage rendered as innerHTML without escaping in multiple places
- Firestore rules have 4 collections (payoutRequests, userNotifications, userState, taskProposals) with auth-only access (no ownership scoping)

**Key File Paths:**
- `firestore.rules` — Firestore security rules
- `login.html:355-377` — Open redirect vulnerability
- `admin.html:580-630` — localStorage auth fallback (bypassable)
- `admin.html:1227-1234` — Unescaped user content in innerHTML (reports)
- `admin.html:1724-1731` — Unescaped admin names in innerHTML
- `admin.html:1904-1906` — EmailJS keys exposed client-side
- `app.html:2180-2182` — Task names rendered without escaping
- `app.html:1785` — userState written to Firestore with doc ID = PROFILE_ID (guessable)

## Learnings

### CSP Refactor (unsafe-inline elimination)
- **Completed:** Extracted all inline `<style>` and `<script>` blocks from app.html and offline.html to external files
- **Pattern used:** `data-action` attribute + delegated `document.addEventListener('click', ...)` — works without build tools
- **CSP policy:** `script-src 'self' https://www.gstatic.com https://apis.google.com https://cdn.jsdelivr.net` — no 'unsafe-inline'
- **style-src:** Kept `'unsafe-inline'` for style attributes (low risk, no code execution vector)
- **Prior work:** login.html, home.html, get-started.html, admin.html were already partially migrated; app.html and offline.html were the remaining gaps
- **Key insight:** The app uses 57+ inline onclick handlers in app.html alone — all converted to event delegation pattern
- **Service worker:** Cache bumped to v4 to include new external assets
- **CDN origins whitelisted:** gstatic.com (Firebase SDK), googleapis.com (APIs), cdn.jsdelivr.net (EmailJS), fonts.googleapis.com/gstatic.com (Nunito font)
