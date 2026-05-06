## Core Context

**Role:** Architecture Lead - Code Consolidation & Deduplication

**Key Achievements:**
- Led Phase 1-4 code consolidation: Deleted habitrewards.html (2047 lines), migrated 5 unique features from index.html to app.html
- Eliminated ~4,400 lines of duplicated code across 3 user-facing pages
- Unified routing: firebase.json catch-all now redirects to /home.html (app.html) instead of /index.html
- Architecture: From 3 divergent codebases → 1 source of truth (app.html as canonical user page)

**Owner Preferences (learned):**
- Architectural decisions: analyze impact across ALL affected surfaces (admin, user, service worker, firestore rules)
- Consolidation > feature parity: identify the most secure/complete version and merge into it
- Risk reduction: clear blockers before execution (get accessibility, security, storage fixed first)
- Cross-agent validation: get buy-in from downstream owners (Mipha, Urbosa, Daruk) before Phase 1

## Architecture Patterns (2026 Sprint)

**Pattern 1: Duplication Analysis**
- MyDailyWin had 67 shared functions (68% overlap) across 3 pages; habitrewards.html had zero unique features → safe to delete
- Unique features in index.html (task help, filtering, completed-ever): ~180 lines that migrated cleanly to app.html
- Decision: Merge into most-secure page (app.html with full escapeHtml), eliminate the others

**Pattern 2: Cross-Page Dependencies**
- Storage key divergence (app.html vs admin.html mapping) affects data contracts — consolidate at Firestore rules layer
- Service worker caching strategy outdated — revamp to version-tagged cache strategy
- Firebase config duplication across pages — consider shared config module (future work)

**Pattern 3: Security Posture Unification**
- Consolidation forced unified auth patterns: all pages now route through app.html (single Firestore auth context)
- Backward compatibility maintained via profile-suffixed storage keys + fallback patterns
- sanitizeInput/escapeHtml now applies to all user features (was app.html-only before)


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
