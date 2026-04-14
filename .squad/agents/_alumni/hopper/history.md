## Cross-Agent Context from Full Team Review (2026-02-27)

### From Eleven (User Dev)
- Storage key divergence affects both admin AND user pages (not just admin).
- updateBalanceDisplay undefined is blocking user flow.
- Modal accessibility issues pervasive across all 3 app pages.
- Dead code (rate, submitSurvey, etc.) may indicate unfinished features.

### From Max (Admin Dev)
- saveState undefined is a BLOCKER for payout approval.
- Storage key mismatch breaks admin-to-user data flow.
- Download functions need fixing for multi-profile support.

### From Dustin (Backend Dev)
- Firestore rules vulnerability is **security F grade** — fix before next release.
- localStorage strategy needs rethinking (Firestore-first?).
- Service worker caching strategy outdated.
- Dead Cloud Function should be deleted or revived (not left hanging).

### From Robin (Tester)
- 4 critical bugs identified across codebase (saveState, storage keys, downloads).
- IS_LEGACY_PROFILE undefined in app.html but referenced.
- index.html/habitrewards.html not profile-aware — design decision needed.

---

## Learnings

### Project Context (Day 1)
- HabitBuilder: gamified habit-tracking web app
- Stack: Vanilla HTML/CSS/JS, Firebase (Hosting + Auth + Firestore), EmailJS, PWA
- User: Shari Paltrowitz
- Key architecture: monolithic per-page HTML with inline JS, localStorage for state, Firebase for auth/hosting
- Admin↔user sync via localStorage keys (hr_admin_{profile} → getConfiguredDailyTasks)

### Full Architecture Review (Day 2)
- 12,703 lines across 9 HTML files; app.html (3024), index.html (2380), habitrewards.html (2047), admin.html (2026) are the big four
- **Massive code duplication**: 65+ functions are copy-pasted identically between index.html, habitrewards.html, and app.html (spinWheel, loadState, checkAchievements, render, etc.)
- **CSS duplication**: ~290 lines of identical inline CSS in app.html, index.html, habitrewards.html — shared.css exists (5KB) but NO page actually imports it
- **localStorage key inconsistency**: app.html uses `hr_state_stu` for legacy profile but admin.html maps stu→`hr_state` (IS_LEGACY_PROFILE). This mismatch is a data contract bug.
- **Firestore rules overly permissive**: Every collection is `allow read/write: if request.auth != null` — any authenticated user can read/modify ANY profile's data. taskProposals allows `create: if true` (unauthenticated writes).
- **No CSP headers**: No Content-Security-Policy configured in firebase.json or HTML meta tags
- **EmailJS credentials hardcoded**: public key, service ID, template ID all in admin.html:1856-1858
- **Firebase config in every page**: apiKey duplicated across app.html, admin.html, login.html
- **Service worker stuck at v1**: CACHE_NAME never changes, stale-while-revalidate but no versioning strategy
- **No storage event listeners**: admin and app don't communicate via storage events — changes in one tab aren't reflected in another
- **JSON.parse calls often unguarded**: Multiple `JSON.parse(localStorage.getItem(...))` without try/catch (app.html:833, 865, 1001, 1565)
- **innerHTML used 73 times total**: Some with user-controlled data (task names, comments) — sanitizeInput/escapeHtml exist in app.html only, not in index.html or habitrewards.html
- **Modal guard pattern inconsistent**: app.html openModal has null-check + warn, but some pages (admin.html:723) use one-liner without guards
- **Levels data duplicated**: allLevels array copy-pasted in app.html:2931, index.html:2311, habitrewards.html, admin.html:917
- Key files: app.html (main user app with profiles), index.html (original single-user app), habitrewards.html (simplified variant), admin.html (admin dashboard), functions/index.js (SendGrid email)
