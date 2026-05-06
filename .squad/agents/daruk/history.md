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

## Owner Preferences (learned)

- Security-first approach: validate at Firestore rules and Cloud Function level before any client-side trust
- Prefer server-side credential storage (Cloud Functions) over client-side keys
- Incremental migration over big-bang refactors (e.g., EmailJS → Cloud Function, phase-by-phase code consolidation)

## Recent Session Patterns

**May 2026 Focus:** Backend infrastructure security and CSP hardening
- EmailJS migration to Cloud Functions (client keys → server-only, May 1)
- CSP enforcement: hardened login.html + profile ID enumeration protection (May 6)
- Cross-agent collaboration on audit fixes (Riju audit findings, Sidon design updates)

**Key Pattern:** When refactoring security-sensitive code (auth, payment, email), pair changes with cross-agent review (Riju CSP expertise, Impa service worker integration).

---

---

## Cross-Project Backend Knowledge (Reference Summaries)

**From EatDiscounted (Fenster):** Rate limiting patterns (per-IP sliding window, 429 + Retry-After), in-memory caching (1-50x multiplier), search API migration strategy (fallback providers), public API integration patterns, Unicode transliteration (NFD decomposition), security (env vars, key rotation), SQLite optimization.

**From Slotted (Zuko & alumni):** Security patterns (fail-closed auth, stripSensitive() middleware, CORS whitelisting), OAuth vault encryption, webhook reliability (always 200), notification deduplication cascades, race conditions (DB-level transactions), API normalization (camelCase/snake_case), account deletion cascades, RLS + SECURITY DEFINER helpers, duplicate detection, block/mute logic with RLS.

**From Scrunch (Danny):** Query optimization (count-only patterns), O(n²) → O(n) dedup via Maps, Promise.all() parallelization, TypeScript type drift prevention, loading gates anti-pattern, search relevance (domain vocabulary), fallback UX patterns.

**From HealthStitch (Wash):** Sync architectures (backend-pull vs iOS-push), metric normalization per source, dedup via unique indexes (user_id, source, external_id), background sync anchored queries, sleep date normalization, prepared statements + WAL mode, SQLite→PostgreSQL migration patterns.

## Last Session (2026-05-06)

- Fixed 3 security audit findings: Profile ID UUIDs, login.html CSP, innerHTML audit complete
- firebase.json global CSP still has 'unsafe-inline' in script-src (future cleanup: verify all pages clean before removal)

