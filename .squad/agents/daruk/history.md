# Daruk — Backend Dev

## Core Context

**Tech Stack:** Backend auth, Firestore rules, Cloud Functions, server-side security

**Key Responsibilities:**
- Firestore rules (ownership, data validation, auth checks)
- Cloud Function security (email delivery, payment logic)
- Authentication flows (Firebase Auth integration)
- Backend data integrity and rate limiting

**Critical Decisions (Current):**
1. **Ownership Model:** `ownerEmail` on profile doc identifies creator. `profiles/{profileId}/admins/{email}` subcollection tracks additional admins.
2. **Email Delivery:** Migrated from dual EmailJS+Cloud Function to Cloud Function server-side (EmailJS → Cloud Function migration, 2026-05-01).
3. **PROFILE_ID Pattern:** Validation via `/^[a-zA-Z0-9_-]+$/` prevents localStorage/Firestore path injection.
4. **Admin Auth:** Firestore-only authority for admin status. localStorage never trusted for authorization.
5. **Apple Sign-In:** Added OAuthProvider('apple.com') to login.html (2025-07-25).
6. **CSP Headers:** Content-Security-Policy + security headers in firebase.json (script-src 'self' + CDN origins, no unsafe-inline for scripts).

**Recent Achievements:**
- ✅ P0 Firestore rules overhaul (ownership scoping, field validation)
- ✅ P1 CSP headers + security headers added to firebase.json
- ✅ Phase 1–4 code consolidation (habitrewards.html deleted, index.html redirected to home.html)
- ✅ Bug bash: Auth, onboarding, data flow reviewed and stabilized
- ✅ EmailJS migration: Client-side keys removed, Cloud Function handles all email delivery (2026-05-01)
- ✅ Apple Sign-In implementation (2025-07-25)

**Known Blockers:**
- get-started.html must write profile docs to Firestore during onboarding (currently localStorage-only). Until fixed, Firestore ownership checks on `payoutRequests`, `userNotifications`, `userState`, `taskProposals` remain auth-only (TODO comments in firestore.rules).

**Ongoing Concerns:**
- Firebase API key not restricted (expected for client SDK)
- No explicit rate limiting on Cloud Function or EmailJS sends
- Ensure debug console.log statements fully removed (checked in Wave 2 security fixes)

---

## Recent Work (2026 Sprint)

### 2026-05-01T22:40 — EmailJS Migration & Cross-Agent Learnings

**Session:** 2026-05-01T22-40-27Z — backlog-sprint  

**Migration Summary:**
- **Before:** EmailJS public key and service ID exposed in admin.html (client-side)
- **After:** Created `sendInviteEmail` Cloud Function, admin.html now uses `firebase.functions().httpsCallable()`
- **Security Impact:** Email credentials now server-side only; client never handles sensitive keys

**Changes Made:**
- functions/index.js: Added `sendInviteEmail` (v2 onCall) with input validation
- admin.html: Removed EmailJS SDK script, public key, service ID, template ID references
- firebase.json: Added `"functions"` config block
- CSP updated: `*.cloudfunctions.net` replaces `api.emailjs.com` in connect-src

**Cross-Agent Context:**
- **From Riju:** CSP now enforces script-src 'self' + whitelist (no unsafe-inline). Cloud Function invokes via `firebase.app()` callable (same-origin, CSP-safe).
- **From Impa:** Cloud Function imports included in functions/index.js bundle. Service worker v5 includes all backend assets.
- **From Sidon:** Email delivery (invite links in admin, recovery links in auth) now handled by callable. UI already has styled toast notifications for success/error.

**Learnings:**
- Callable Cloud Functions authenticate via Firebase Auth tokens automatically (no CORS headers needed)
- EmailJS credentials in backend config allows future library swap without frontend code changes
- Error handling: catch both Network errors and function-specific errors (e.g., invalid email)
- Cold start latency ~1-2s acceptable for invite emails

---

### Security Fixes — Riju's Audit Findings (High Priority)

**Session:** Security fix sprint  

**Changes Made:**
1. **login.html CSP hardened:** Removed `'unsafe-inline'` from `script-src`. All JS was already external (js/login.js) with data-action event delegation, so no functional change — just tightening the policy.
2. **Profile ID generation:** Replaced timestamp-based `Date.now().toString(36) + random` with `crypto.randomUUID()` in js/get-started.js. Legacy IDs (e.g. "stu") unaffected.
3. **innerHTML audit (clean):** All innerHTML in admin.js and app.js already escapes user content via `escapeHtml()` from utils.js. No fixes needed.

**Learnings:**
- `crypto.randomUUID()` is available in all modern browsers (no polyfill needed for our target audience)
- CSP meta tags and server headers (firebase.json) are evaluated independently — most restrictive wins per-directive. The firebase.json global header still has `'unsafe-inline'` in script-src; a future sweep should remove it there too once all pages are verified clean.
- The codebase's innerHTML hygiene is solid — previous escapeHtml() work paid off.

---

### Historical Context (Archived)

**Previous Sessions Summary:**
- **2026-02-27:** Full team security review. P0 Firestore rules overhaul with ownership scoping and field validation.
- **2026-03-03:** CSP + security headers added to firebase.json. `isProfileOwner()` fixed with `exists()` guard.
- **2026-03-03:** Phase 1-4 code consolidation: habitrewards.html deleted, index.html redirected to home.html.
- **2026-04-14:** Comprehensive bug bash covering auth, onboarding, data flow. 10 bugs identified and prioritized.
- **2026-04-30:** Security audit completed by Riju. Apple Sign-In added. EmailJS migration prepared.

**Full historical details:** See `.squad/agents/daruk/history-archived.md` for pre-May 2026 context (P0 details, bug bash findings, phase consolidation work).

---

## Cross-Project Backend Knowledge (injected 2026-05-02)

The following learnings come from Backend agents across Shari's other personal projects.

### From EatDiscounted (Fenster)
- **API rate limiting:** Per-IP sliding window rate limiting (5/min on primary endpoint, 10/min on secondary, 20/min on reads). Return 429 + `Retry-After` header. Dead-code rate limit constants are a red flag — verify they're actually wired in.
- **In-memory caching:** TTL-based caching (1hr for API results, 5min for sitemaps). Key pattern: `restaurant::platform`. ~10-50x capacity multiplier for quota-limited APIs. Caveat: in-memory cache lost on deploy — needs Redis for serverless.
- **Search API migration:** Moved from Google CSE (100 free/day) to Brave Search API (2,000 free/month, 20x capacity). Brave supports same `site:` operator. Lesson: always have a fallback search provider ready.
- **Direct API integrations:** Upside and Bilt both have public no-auth REST APIs for restaurant data. Pattern: check for public APIs before defaulting to search-scraping approaches.
- **Unicode handling:** NFD decomposition + combining-mark stripping for transliteration ("Café" → "Cafe"). Special cases needed for ß→ss, æ→ae, œ→oe.
- **Security:** `.env.local` must be in `.gitignore` — check git history for prior exposure and rotate keys. Hardcoded salts in DB utilities are a risk. Remove dead code that references sensitive constants.
- **SQLite patterns:** WAL mode for concurrent reads, UNIQUE constraints, parameterized queries. Hot-reload fragility + SQLite on serverless is a known blocker.

### From Slotted (Zuko, alumni: Roy, Sam)
- **Security (critical patterns):** Never hardcode admin secret fallbacks — use fail-closed pattern (403 if env var unset). Strip sensitive fields (OAuth tokens, email, socialBattery) from all API responses via `stripSensitive()`. Always add new token fields to the sensitive fields list.
- **OAuth token storage:** Supabase Vault encryption (not plaintext DB columns). Pattern: `oauth_tokens` table stores vault secret UUIDs; SQL helper functions are SECURITY DEFINER. Old columns renamed to `_deprecated` (not dropped) for rollback safety.
- **CORS:** Whitelist specific origins in the `cors` callback. The default `callback(null, true)` in the else branch = security hole. No-origin requests (mobile, curl) allowed intentionally via `!origin` check.
- **Google webhooks:** Must always return 200 (even on errors) or Google deactivates the endpoint. For stale sync tokens (410), clear and retry immediately in the same call.
- **Notification dedup:** Cascading strategy — 1hr by relatedUserId → 5min by relatedId → 10min by title. Use unique notification types for filter logic.
- **Race conditions:** Solved with AFTER UPDATE trigger + FOR UPDATE lock (atomic DB-level, not application-level). Use `ON CONFLICT` upserts instead of delete-then-insert.
- **API normalization:** Accept both camelCase and snake_case in request bodies. Return both naming conventions in responses for frontend compatibility.
- **Account deletion:** CASCADE from users table + cancel meetups + notify participants + clear OAuth tokens + delete related records. Must handle all FK references.
- **RLS policies:** `get_current_user_id()` SECURITY DEFINER helper maps `auth.uid()` → internal UUID. Separate SELECT/INSERT/UPDATE/DELETE policies per table.
- **Duplicate detection:** Before inserting, check for existing records with overlapping criteria. Return 409 with existing ID.
- **Block/mute:** `blocked_users` table with RLS. Block check on friend invite + meetup creation. Blocking also removes existing friendship.

### From Scrunch (Danny)
- **Supabase query optimization:** Use `select('id', { count: 'exact', head: true })` for count-only queries — transfers zero rows instead of fetching all rows and checking `.length`.
- **Dedup performance:** Replace O(n²) `filter+findIndex` with O(n) Map-based dedup for list processing.
- **Parallel API calls:** Convert sequential `for` loops over external APIs to `Promise.all()`. Sequential fetches are the #1 latency killer.
- **TypeScript type drift:** When TS types drift from actual DB schema, the app silently degrades. `as unknown as Type` casts mask real errors. Use schema-generated types to stay in sync.
- **Loading gate anti-pattern:** Blocking render until all queries resolve is the #1 perceived perf killer. Use `placeholderData` + `staleTime` in React Query hooks and render with defaults immediately.
- **Search relevance:** Domain-aware keyword extraction with a domain vocabulary outperforms generic NLP (stop-word removal). Reddit search: 4-6 keyword terms optimal. Multi-query strategy (primary + fallback) doubles relevant results.
- **Fallback UX:** Never disguise navigation/fallback actions as content items. Show clear status (error vs. no results) with actionable next steps.

### From HealthStitch (Wash)
- **Sync architecture:** WHOOP = backend-pull (server fetches from API), Apple Watch = iOS-push (app pushes to backend). Different data sources need different sync strategies.
- **Metric normalization (critical):** WHOOP RMSSD ≠ Apple SDNN for HRV. Must maintain separate baselines per source/metric. API responses should nest by source (`hrv.whoop`, `hrv.apple_watch`).
- **Dedup strategy:** `INSERT OR IGNORE` with unique indexes on `(user_id, source, external_id)`. Both WHOOP and HealthKit provide stable external IDs.
- **Background sync (iOS):** Anchored queries (not date-based) are more reliable — no missed samples. JWT in Keychain (not UserDefaults) for background access. BGAppRefreshTask as fallback if no observer syncs in 2+ hours.
- **Sleep date normalization:** Always use start_at date ("night of") for consistency across sources.
- **SQLite performance:** Pre-compile prepared statements to module-level constants. WAL mode for concurrent reads.
- **PostgreSQL migration gotchas:** SQLite-isms to watch: `datetime('now')`, `INSERT OR IGNORE`, `date()` expressions, PRAGMAs. `ON CONFLICT` upserts are PG-compatible as-is.

## Session: 2026-05-06 — Security Audit Fixes

**Context:** Daruk fixed 3 high-priority security findings from Riju's audit.

**Work completed:**
- Replaced guessable timestamp profile IDs with `crypto.randomUUID()` in `js/get-started.js`
- Removed `'unsafe-inline'` from Content Security Policy in `login.html`
- Audited all `innerHTML` usage — no vulnerabilities found (all user content already escaped via `escapeHtml()`)

**Impact:** Security posture improved. UUID generation now cryptographically secure. CSP strengthened.

**Files:** js/get-started.js, login.html

**Note:** `firebase.json` global CSP still contains `'unsafe-inline'` in `script-src`. This should be removed once all pages are verified to have no inline scripts. Currently, per-page meta tags are the enforcement mechanism.

