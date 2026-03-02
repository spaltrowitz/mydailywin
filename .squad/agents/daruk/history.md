## Cross-Agent Context from Full Team Review (2026-02-27)

### From Revali (Lead/Architect)
- Firestore rules overly permissive — requires document ownership scoping (P0).
- CSP headers missing — add to firebase.json (coordinate with me).
- Email system dual redundancy (SendGrid Cloud Function + EmailJS) — recommend Cloud Function.

### From Mipha (User Dev)
- Service worker CACHE_NAME never versioning causes stale pages.
- innerHTML XSS risk across 45+ instances — needs sanitization strategy.
- localStorage sync gap: admin changes tasks, app doesn't see them until reload.

### From Urbosa (Admin Dev)
- Debug logging leaks EmailJS keys in production (admin.html:1874-1889).
- Dead Cloud Function (sendAdminInvite) should be deleted if EmailJS is kept.

### From Purah (Tester)
- Data validation in Firestore rules is missing (no type checks).
- Auth token verification missing in Cloud Function (cors: true without verification).
- Race condition: sessionStorage items lost between navigation (login.html).

---

## Learnings

### Project Context (Day 1)
- HabitRewards: Firebase project habitrewards-131, hosted at habitrewards-131.web.app
- Stack: Vanilla HTML/CSS/JS, Firebase (Hosting + Auth + Firestore), EmailJS
- User: Shari Paltrowitz
- Auth: Google Sign-In + email/password, onboarding stores hr_pending_user_email → creatorEmail/ownerEmail
- Data contracts: hr_admin_{profile}, hr_state_stu, STORAGE_KEY, hr_profile_{id}

### Comprehensive Backend Review (Daruk)

#### Architecture Decisions Observed
- Dual email system: EmailJS (client-side, admin.html) for invites AND SendGrid Cloud Function (functions/index.js) — redundant, only EmailJS is actually called
- Heavy localStorage reliance: 20+ distinct key patterns, no Firestore-first strategy yet
- Cloud Function `sendAdminInvite` exists but is NOT wired from admin.html — dead code
- firebase.json uses SPA rewrite (`** → /index.html`) which will catch 404s
- No caching headers configured in firebase.json — missing production optimization
- Firestore rules use `request.auth != null` as sole guard — no per-user/per-profile scoping
- `taskProposals` collection allows `create: if true` — unauthenticated writes possible
- No data validation in Firestore rules (no `request.resource.data` checks)
- Service worker uses stale-while-revalidate but CACHE_NAME is `habitrewards-v1` (never versioned)

#### Key File Paths
- Firebase config: firebase.json, .firebaserc
- Firestore rules: firestore.rules (97 lines, all auth-only, no field validation)
- Cloud Functions: functions/index.js (SendGrid invite — unused)
- Auth flow: login.html → get-started.html (onboarding via sessionStorage handoff)
- EmailJS config: admin.html:1856 (public key, service ID, template ID exposed client-side)
- Service worker: sw.js (stale-while-revalidate, 12 static assets cached)

#### localStorage Key Map (Complete)
- `hr_profile_{id}` — profile metadata (get-started.html writes, app.html/admin.html reads)
- `hr_profiles_index` — array of all profiles on device
- `hr_user_profiles_{uid}` — profiles linked to Firebase Auth user
- `hr_managed_profiles_{email}` — profiles where user is admin
- `hr_state_{id}` / `hr_state` (legacy) — habit completion state
- `hr_admin_{id}` / `hr_admin` (legacy) — admin config (tasks, rewards, levels)
- `hr_week_{id}` / `hr_date_{id}` — weekly/daily reset tracking
- `hr_reports_{id}` — daily reports
- `hr_payout_requests{suffix}` — payout request fallback
- `hr_additional_admins_{id}` — legacy admin list
- `hr_profile_admins_{id}` / `hr_profile_invites_{id}` — admin/invite tracking
- `hr_admin_notifications_{id}` — notification fallback
- `hr_proposals` — task proposals
- `hr_survey_log` — onboarding survey export
- `hr_completed_log{suffix}` / `hr_feedback{suffix}` — history data
- `hr_quote_*` — quote display state
- `theme` — dark/light mode

#### Security Concerns Identified
- EmailJS public key hardcoded at admin.html:1856
- Firebase API key in 4 HTML files (expected for client SDK but no API key restrictions noted)
- No rate limiting on EmailJS sends or Cloud Function
- console.log debug statements leak EmailJS keys/config in production (admin.html:1874-1889)
- innerHTML used 45+ times across files — XSS risk if profile names contain HTML
- login.html:395 sets innerHTML with user.photoURL from Google — potential XSS vector
- login.html:498-519 sets innerHTML with profile.name from localStorage — XSS if tampered
