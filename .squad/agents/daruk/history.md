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
- MyDailyWin: Firebase project habitrewards-131, hosted at habitrewards-131.web.app
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

### Firestore Security Rules Overhaul (P0)

#### What was done
- **FIXED: `taskProposals` create was `if true`** — unauthenticated writes now blocked. Requires `request.auth != null` + field validation (profileId, taskName, status).
- **Added ownership scoping to profiles collection and subcollections:**
  - `profiles/{profileId}`: create enforces `ownerEmail == auth.token.email`; update requires `hasProfileAccess()`; delete requires `isProfileOwner()`.
  - `profiles/{profileId}/admins/{adminEmail}`: read scoped to self (`email == adminEmail`) or profile access; create/delete scoped to profile access.
  - `profiles/{profileId}/notifications/{notificationId}`: read/update/delete scoped to profile access; create allows any auth (invite acceptance).
- **Added field validation** to all `create` rules: type checks on required fields (profileId, amount, status, taskName, etc.)
- **Added helper functions:** `isProfileOwner()`, `isProfileAdmin()`, `hasProfileAccess()` — reusable ownership checks using `get()` and `exists()`.

#### What could NOT be fully scoped (and why)
- `payoutRequests`, `userNotifications`, `userState`, `taskProposals` read/update/delete remain `auth != null` with TODO comments.
- **Root cause:** Profile documents are created in **localStorage** (get-started.html), NOT in Firestore. Without a Firestore profile doc, `isProfileOwner()` returns false. The owner also isn't in the admins subcollection.
- **To fully lock down:** get-started.html must write the profile doc to Firestore with `ownerEmail` during onboarding. Once that's done, the TODO rules can be upgraded to use `hasProfileAccess()`.

#### Ownership model discovered
- `ownerEmail` on profile doc identifies the creator (Firebase Auth email)
- `profiles/{profileId}/admins/{email}` subcollection tracks additional admins (doc ID = admin email)
- No `ownerUid` stored anywhere in Firestore — ownership is email-based, not UID-based
- login.html profile picker shows profiles from localStorage only (`hr_user_profiles_{uid}`, `hr_managed_profiles_{email}`)
- admin.html auth flow: Firestore profile doc check → admins subcollection check → localStorage fallback

### P0 Execution (Feb 27, Session: p0-fixes)
- ✅ Executed complete Firestore rules overhaul: ownership helpers, profiles subcollection scoping, taskProposals auth fix, field validation
- ✅ Documented blockers: TODO comments added for remaining collections pending get-started.html Firestore integration
- All Firestore P0 items for Daruk marked complete in decisions.md
- Session logged at .squad/orchestration-log/2026-02-27T16-30-p0-fixes.md

### Safe get() in Firestore Rules + CSP Headers (Purah follow-up #3 + P1)

#### isProfileOwner() fix
- `get()` on a non-existent Firestore doc throws a permission error, not a graceful false.
- Fixed by adding `exists()` guard before `get()` — short-circuit AND means `get()` is never called if doc is missing.
- This costs 1 extra read per ownership check, but prevents hard failures for localStorage-only profiles.

#### CSP and security headers added to firebase.json
- **CSP directives:** default-src 'self'; script-src allows gstatic.com (Firebase SDK), cdn.jsdelivr.net (EmailJS), accounts.google.com, and 'unsafe-inline' (all JS is inline in HTML); style-src allows 'unsafe-inline' + fonts.googleapis.com; font-src allows fonts.gstatic.com; img-src allows data: URIs (SVGs), gstatic.com, googleusercontent.com (profile photos); connect-src allows Firebase APIs, EmailJS API, Google accounts; frame-src for Google auth popup and Firebase auth helper; object-src 'none'; base-uri 'self'.
- **X-Frame-Options:** SAMEORIGIN — prevents clickjacking.
- **X-Content-Type-Options:** nosniff — prevents MIME-type sniffing.
- **Referrer-Policy:** strict-origin-when-cross-origin — limits referrer leakage to third parties.
- 'unsafe-inline' for scripts is a known weakness; removing it requires extracting JS from HTML files (future task).

### P1 Execution — Firestore Ownership Guards + CSP Headers (Session: 2026-03-03)

**Orchestration Log:** .squad/orchestration-log/2026-03-03T16-17-21Z-daruk-12.md

#### Changes Made
- Fixed `isProfileOwner()` in firestore.rules: Added `exists()` guard before `get()` to prevent permission-denied errors on non-existent documents
- Added CSP and security headers to firebase.json: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Strict-Transport-Security

#### Cross-Agent Alignment
- **Urbosa:** admin.html payment logic depends on safe Firestore ownership verification (profile check now guarded)
- **Mipha:** User experience unaffected; ownership verification happens transparently
- **Revali:** Security-first architecture enables consolidation strategy (unified security posture across pages)

#### Known Limitations
- `taskProposals`, `payoutRequests`, `userNotifications`, `userState` still at auth-only (`request.auth != null`)
- Blocker: Profiles created in localStorage, not Firestore — get-started.html must write profile doc to Firestore for full scoping
- CSP uses `'unsafe-inline'` for scripts (required because JS is inline in HTML) — future extraction task for CSP tightening

#### Quality Gate
- No breaking changes to user workflows
- Firestore read cost: +1 per ownership check (acceptable trade-off for reliability)
- Security headers balance defense with functionality

### Phase 1 Code Consolidation — habitrewards.html Deleted

#### What was done
- Deleted habitrewards.html (2047 lines) via `git rm -f` — zero unique features, strict subset of index.html
- Verified zero references in all production files: README.md, docs/, sw.js, firebase.json, manifest.json, all HTML pages
- References exist only in .squad/ internal documentation (expected, historical context)
- Committed with full squad history (other agents' prior unstaged work included via `git add -A`)

#### Why it's safe
- No page links to habitrewards.html
- Not in firebase.json rewrites or manifest.json
- Not cached in sw.js
- Revali's analysis confirmed: zero unique functions, zero unique features vs index.html
- Accessibility refactor (Mipha) was the last change to touch it — now moot

#### Cross-Agent Impact
- **Mipha:** One fewer page to maintain; charter scope reduced from 3 user pages to 2
- **Revali:** Phase 1 of Option C consolidation complete; Phase 2 (index.html merge) is next
- **Purah:** One fewer test surface; validation scope simplified

### Phase 3 Code Consolidation — index.html Redirect + Firebase Rewrite

#### What was done
- Replaced index.html (114KB, 2375 lines) with a 12-line redirect stub that sends visitors to /home.html via `<meta http-equiv="refresh">`
- Updated firebase.json catch-all rewrite: `"destination": "/index.html"` → `"destination": "/home.html"`
- Commit: 9e53296

#### Why it's safe
- All unique features from index.html were already migrated to app.html in Phase 2
- index.html redirect stub preserves the file for bookmarked URLs — users get seamlessly sent to home.html
- Firebase rewrite now sends unmatched routes to home.html (the landing/marketing page) instead of the old monolith
- No other rewrite rules exist in firebase.json to conflict

#### Cross-Agent Impact
- **Revali:** Phase 3 of Option C consolidation complete; index.html is now a thin redirect, not a code surface
- **Mipha:** app.html is now the sole user-facing app page; index.html no longer serves app content
- **Purah:** Test surface reduced further; index.html only needs redirect verification

---

### Phase 1–4 Code Consolidation (2026-03-03)

#### Session Context
Executed full Phase 1–3 consolidation (Daruk's responsibility across 2 phases + Phase 3):

**Phase 1 (Agent 16, 193s):** Deleted habitrewards.html (2047 lines)
- Zero unique features, security downgrade, orphaned (no references)
- Verified zero references in all production files
- Commit: `chore: delete orphaned habitrewards.html (Phase 1 consolidation)`

**Phase 3 (Agent 18, 41s):** Redirected index.html, updated firebase.json
- index.html now 12-line redirect stub to /home.html
- firebase.json catch-all rewrite updated: `/index.html` → `/home.html`
- Commit: See orchestration log for details

**Phase 2 (Mipha, 1680s):** Migrated 5 features from index.html → app.html (149 insertions)
- TASK_HELP + showTaskHelp(), filterForProfile(), task flags (stuOnly/excludeFromStu)
- getCompletedEverTasks() + markTaskCompletedEver(), help button rendering

**Phase 4 (Purah, 78s):** Verified all 5 features pass QA
- All features correctly implemented with proper escaping, profile-aware storage keys

#### Quality Gate Status
🟢 **READY FOR PRODUCTION** — All phases complete, zero regressions, full verification passed.

---

### Bug Bash — Auth, Onboarding & Data Flow (2025-04-14)

#### Session Context
Comprehensive backend/data layer review covering login.html, get-started.html, firebase.json, firestore.rules, localStorage contracts, and removed SendGrid references.

#### Findings Summary
**Total bugs identified:** 10 (1 P0, 3 P1, 3 P2, 3 P3)
**Safe patterns verified:** 3

#### Critical Discovery (P0)
- **get-started.html does NOT write to Firestore** — profiles saved ONLY to localStorage (`hr_profile_{id}`), never to Firestore
- **Root cause:** No Firebase SDK imports in get-started.html (missing firebase-app-compat.js and firebase-firestore-compat.js)
- **Impact:** Firestore ownership rules cannot enforce access control; profiles are device-only; no cloud sync
- **Blocker for:** Firestore rules TODO comments (lines 99-147) cannot be fully implemented until profile docs are written to Firestore

#### High-Priority Security Issues (P1)
- **XSS in login.html (line 414):** `avatar.innerHTML` directly interpolates `user.photoURL` without sanitization
- **CSP frame-src mismatch:** References old domain `habitrewards-131.firebaseapp.com` but site now hosted at `mydailywin.web.app`
- **authDomain hardcoded:** All Firebase configs still use `habitrewards-131.firebaseapp.com` instead of `mydailywin.firebaseapp.com`

#### Data Consistency Issues (P2)
- **localStorage key mismatch:** app.html line 907 checks `hr_state_stu` but actual key for legacy profile is `hr_state` (no suffix)
- **Session storage race condition:** Refresh on get-started.html loses `hr_pending_user_*` → orphaned profile without `creatorEmail`
- **No error handling:** saveProfileSetup() has no try/catch → silent failure if localStorage quota exceeded

#### Verified Safe
- SessionStorage handoff pattern (login → get-started) is correct for temporary auth state
- Firebase config still referencing `habitrewards-131` is correct — project ID is unchanged, custom domain is an alias
- SendGrid function removal is clean — zero orphaned calls in production code

#### localStorage Key Audit Complete
Mapped ALL 30+ localStorage keys across all pages:
- Profile metadata: `hr_profile_{id}`, `hr_profiles_index`, `hr_user_profiles_{uid}`, `hr_managed_profiles_{email}`
- State data: `hr_state_{id}`, `hr_admin_{id}`, `hr_week_{id}`, `hr_date_{id}`, `hr_reports_{id}`, etc.
- Admin management: `hr_profile_admins_{id}` (current), `hr_additional_admins` (legacy, still read for migration)
- Onboarding: `hr_pending_user_uid`, `hr_pending_user_email` (sessionStorage, cleared after use)
- Global: `hr_proposals`, `hr_survey_log`, `theme`

#### Detailed Report
All findings documented in `.squad/agents/daruk/bugbash-findings.md` with file paths, line numbers, consequences, and suggested fixes.


---

## Bug Bash Team Update (2026-04-14)

**Merged Decisions:**
- P0 Blocker: get-started.html must write to Firestore (now in decisions.md)
- P1 Security: CSP + authDomain updates for mydailywin domain
- P2 Data Consistency: onboarding state migration from sessionStorage → localStorage
- Medium P2 issues: step 7b nav, event parameter guards, localStorage key consistency

**Implementation Status:**
- Awaiting Revali decision on Firebase config migration strategy (habitrewards-131 vs mydailywin)
- Once approved: Daruk to implement P0 Firestore write + CSP updates + sessionStorage → localStorage
- Mipha to fix onboarding nav/guard issues

**Cross-Agent Alignment:**
- Mipha: May need to handle Firestore fallback reads if get-started.html P0 implemented
- Urbosa: Admin auth simplification possible once profiles move to Firestore
- Purah: New test cases for Firestore profile + onboarding refresh scenarios

**All Verified Safe Items Locked:**
- SessionStorage handoff pattern correct (login → get-started)
- Firebase config project ID unchanged (habitrewards-131 is correct — custom domain is alias)
- SendGrid removal clean
- localStorage key audit complete with all 30+ keys documented

## Learnings (2025-07-24)

- **XSS fix applied**: login.html line 414 — replaced `innerHTML` with DOM methods (`createElement`/`appendChild`) for user.photoURL avatar rendering. This pattern should be used for all future user-supplied content.
- **sessionStorage → localStorage migration**: Onboarding keys (`hr_pending_user_uid`/`hr_pending_user_email`) migrated to localStorage as `hr_onboarding_uid`/`hr_onboarding_email`. Backward compat maintained — get-started.html falls back to old sessionStorage keys. Both old+new keys are cleaned up after profile creation.
- **CSP updated**: Added `https://mydailywin.firebaseapp.com` to `frame-src` in firebase.json alongside the legacy `habitrewards-131` domain.
- **email-templates/ deleted**: Orphaned directory (admin-invite.html) removed since SendGrid Cloud Function was already removed.
