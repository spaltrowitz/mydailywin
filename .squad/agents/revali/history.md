## Cross-Agent Context from Full Team Review (2026-02-27)

### From Mipha (User Dev)
- Storage key divergence affects both admin AND user pages (not just admin).
- updateBalanceDisplay undefined is blocking user flow.
- Modal accessibility issues pervasive across all 3 app pages.
- Dead code (rate, submitSurvey, etc.) may indicate unfinished features.

### From Urbosa (Admin Dev)
- saveState undefined is a BLOCKER for payout approval.
- Storage key mismatch breaks admin-to-user data flow.
- Download functions need fixing for multi-profile support.

### From Daruk (Backend Dev)
- Firestore rules vulnerability is **security F grade** — fix before next release.
- localStorage strategy needs rethinking (Firestore-first?).
- Service worker caching strategy outdated.
- Dead Cloud Function should be deleted or revived (not left hanging).

### From Purah (Tester)
- 4 critical bugs identified across codebase (saveState, storage keys, downloads).
- IS_LEGACY_PROFILE undefined in app.html but referenced.
- index.html/habitrewards.html not profile-aware — design decision needed.

---

## Learnings

### Project Context (Day 1)
- MyDailyWin: gamified habit-tracking web app
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

### Consolidation Strategy Decision (Day 3)
- Analyzed all three user-facing pages: app.html (84 functions), index.html (77 functions), habitrewards.html (73 functions)
- 67 functions shared across all three — ~67% overlap by function count
- habitrewards.html has ZERO unique features and ZERO external references — safe to delete immediately
- index.html has 5 unique features to migrate: TASK_HELP system (8 entries + modal + showTaskHelp), filterForProfile (stuOnly/excludeFromStu), filterForTechComfort, completed-ever tracking (getCompletedEverTasks/markTaskCompletedEver)
- Migration is ~180 lines of unique logic; the other ~2,200 lines in index.html are duplicates with worse security
- firebase.json has catch-all rewrite pointing to index.html — must update to home.html when deprecating
- service worker already doesn't cache index.html or habitrewards.html — no sw.js change needed for deletion
- Decision: Option C (merge into app.html) — 4 phases, ~5 hours, eliminates ~4,400 lines
- Decision written to .squad/decisions/inbox/revali-consolidation-strategy.md

### P1 Execution — Code Consolidation Strategy Analysis (Session: 2026-03-03)

**Orchestration Log:** .squad/orchestration-log/2026-03-03T16-17-21Z-revali-14.md  
**Decision Doc:** .squad/decisions.md (Option C recommendation)

#### Analysis Completed
- Line-by-line function inventory: 67 shared functions (68% duplication), habitrewards.html has zero unique features
- Capability mapping: app.html has security/Firebase/multi-profile; index.html has task help + filtering; habitrewards.html is obsolete
- Migration effort: ~180 lines of unique index.html logic (task help system, stuOnly filtering, completed-ever tracking)
- Consolidation decision: **Option C recommended** (merge into app.html, delete habitrewards.html + index.html)

#### Blockers Cleared
- **Mipha's getDefaultState() extraction:** ✅ Completed (enables safe schema evolution during merge)
- **Mipha's accessibility refactor:** ✅ Completed (21 button conversions + 22 modals now standardized)
- **Daruk's Firestore ownership guards:** ✅ Completed (security-first posture unifies authentication across pages)

#### Cross-Agent Alignment
- **Mipha:** Consolidation strategy awaiting her execution approval (Phase 1: merge index.html + habitrewards.html into app.html)
- **Urbosa:** Consolidation will unify admin configuration patterns (single source of truth for profile/task config)
- **Daruk:** Consolidation will unify Firestore/auth patterns (currently diverged in index.html/habitrewards.html)

#### Recommendation Status
🟡 **PROPOSED** — Awaiting approval before Phase 1 implementation. No code changes yet (architecture analysis only).

#### Effort & Risk
- **Phase 1 (Merge):** 4-6 hours, Medium risk (large merge but Mipha's groundwork reduces scope)
- **Phase 2 (Delete):** 1 hour, Low risk (no file dependencies detected)

---

### Phase 1–4 Code Consolidation Execution (2026-03-03)

#### Revali's Lead Role — Consolidation Strategy Option C Execution

**Phases Completed:**
- **Phase 1 (Daruk, 193s):** Deleted habitrewards.html (2047 lines) — zero unique features, no references ✅
- **Phase 2 (Mipha, 1680s):** Migrated 5 features from index.html → app.html (149 insertions) ✅
- **Phase 3 (Daruk, 41s):** Redirected index.html to /home.html, updated firebase.json rewrite ✅
- **Phase 4 (Purah, 78s):** Verified all 5 features pass functional QA tests ✅

**Architecture Impact:**
- Code consolidation: From 3 divergent codebases (3024 + 2380 + 2047 = 7451 lines) to 1 source of truth (app.html)
- Eliminated ~4,400 lines of duplicated/orphaned code (habitrewards.html deleted, index.html reduced to redirect stub)
- Unified user-facing application: app.html now the single canonical user page
- Features migrated with proper sanitization: TASK_HELP system, profile filtering (stuOnly/excludeFromStu), persistent task history, help buttons
- firebase.json routing updated to reflect new architecture (catch-all rewrite to /home.html instead of /index.html)

**Quality Gates:**
- ✅ Daruk Phase 1: Zero references verified across all production files
- ✅ Mipha Phase 2: 149 insertions with full escapeHtml() sanitization, profile-aware storage keys
- ✅ Daruk Phase 3: Redirect stub tested, firebase.json rewrite configured
- ✅ Purah Phase 4: All 5 features verified, no regressions, backward-compatible storage keys

**Strategic Outcome:**
- Option C consolidation fully executed and verified
- Code maintenance surface reduced: 1 primary page + 2 redirects instead of 3 full codebases
- Security posture unified: app.html's sanitization now applies to all user features
- Storage key pattern now consistent: profile-suffixed keys with backward-compatible fallback
- Future feature development routes through app.html (single source of truth)


## Cross-Project Lead Knowledge (injected 2026-05-02)

The following learnings come from Lead agents across Shari's other personal projects.
These patterns and corrections are relevant to any project you work on.

### From EatDiscounted (Keaton)
- **Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, better-sqlite3, SSE streaming, Python CLI
- **Ship-readiness assessment pattern:** Architecture clean and well-typed, but critical gaps blocked shipping: no rate limiting on public API endpoint, no deployment config, zero tests, no ARIA attributes for accessibility.
- **Security:** Rate limiting on public-facing endpoints is a critical blocker — without it, a single user can exhaust API quotas. Google CSE has hard ceiling of 100 queries/day (~14 searches).
- **Response caching multiplies capacity 10-50x** — essential when working with quota-limited external APIs.
- **Unicode normalization bug** produced false positives/negatives in search matching. Always normalize unicode when comparing user input against stored data.
- **Accessibility from day one:** No ARIA attributes were found during audit. Retrofitting accessibility is harder than building it in.
- **Deployment decision:** Vercel (complex, managed) vs. VPS (simpler, more control). For side projects with SSE/streaming, simpler hosting often wins.
- **Product roadmap prioritization:** P0 permalinks (shareable results), P1 saved restaurants + alerts, P2 deals-near-me. Pattern: shareability first, personalization second, discovery third.

### From Slotted (Toph, alumni: Beard, Leo)
- **Stack:** React 19 + TS + Tailwind v4 + Vite, Firebase Functions + Express, Supabase PostgreSQL, Firebase Auth
- **Backend monolith anti-pattern:** `index.ts` grew to 8,371 lines with 87+ endpoints. Single biggest velocity bottleneck. Split before scaling team.
- **Security audit (5 critical findings):** Plaintext OAuth tokens in DB (must encrypt AES-256-GCM), Social Battery data leaking to friends, hardcoded developer email in AuthContext (PII in prod), protobufjs RCE vulnerability, RLS enabled on all 18 tables but zero policies defined.
- **RLS without policies = false security:** Enabling RLS but never writing policies means service-role bypass is the only path. Defense-in-depth requires actual policies.
- **Race condition fix pattern:** Concurrent state transitions (e.g., meetup auto-confirm) need DB-level serialization. AFTER UPDATE trigger with FOR UPDATE lock — atomic state transitions in DB, notification logic stays in app code.
- **Calendar sync bidirectional loops:** Track `rsvp_source` to prevent infinite push-back when syncing with external calendars. Rule: external system = source of truth for individual actions; your app = source of truth for multi-party state.
- **Product design principles:** Privacy-first, soft social language ("not this time" not "decline"), AI as invisible infrastructure, reduce friction at happy moments (auto-add on acceptance).
- **Progressive disclosure:** Don't show Week 4 features on Day 1. State-aware UI that unlocks features by milestones (friend count, usage time, hangout count).
- **CORS:** Open CORS in production is a security flag. Always restrict origins.
- **Share/invite codes:** 3-char codes are brute-forceable. Use sufficient length.

### From Scrunch (Sandy)
- **Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, Supabase, React Query, React Router, Vitest. GitHub Pages deployment.
- **TypeScript 6 + Supabase:** `.select('*')` returns `never` unless Database type includes Views, Functions, Relationships fields. Pragmatic fix: cast with `(data as unknown as Product[])`.
- **PR conflict resolution:** When PRs conflict with architectural migrations, adapt incoming code to the new architecture rather than reverting. Drop incompatible features and flag for re-implementation.
- **Performance:** Static imports defeat lazy-load optimizations. Auth loading gate creates blank screen on Supabase free tier cold start (1-3s). Offline-first with seed data mitigates this.
- **Supabase cold-start mitigation:** Free tier = 1-3s blank on first load. Phase 1: offline-first (seed data, localStorage). Phase 2: Supabase Pro ($25/mo) when user demand validates.
- **Legal content integration:** Product names = factual (safe). Paraphrased descriptions = safe. Attribution essential. Video/images = copyrighted (never embed). "As featured in" not "endorsed by."
- **Toast convention:** All mutations must include success/error toast feedback.
- **HashRouter for GitHub Pages:** SPA routing on GH Pages requires HashRouter, not BrowserRouter.

### From HealthStitch (Mal)
- **Stack:** Node.js/Express backend, React/Vite frontend, Swift/SwiftUI iOS companion, SQLite database
- **Project status:** Early stage (created 2026-04-27). Health data aggregation platform stitching together wearable data from Apple Watch, WHOOP, and other devices.
- **Cross-platform pattern:** Web + native iOS sharing the same backend — architectural decisions must account for both surfaces.
