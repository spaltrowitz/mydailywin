# Purah — History

## Key Patterns & Corrections

### Critical Bugs Found
1. **`saveState` undefined in admin.html** — called but never defined. Breaks payout flow.
2. **`IS_LEGACY_PROFILE` undefined in app.html** — ReferenceError in payout fallback.
3. **STORAGE_KEY mismatch for "stu" profile:** Admin uses `hr_state`, app uses `hr_state_stu`. Dual-write in resetUserBalance but NOT in savePayment.
4. **index.html and habitrewards.html ignore admin config** — always use hardcoded tasks, unsuffixed keys.
5. **Download functions use unsuffixed keys** — won't find non-legacy profile data.
6. **DAILY_MAX_POINTS** declared but never enforced.
7. **No negative balance guard** on task undo.
8. **No openModal/closeModal null guards** in admin.html.

### Key Storage Map
- Admin writes: `hr_admin_{profile}` (customTasks), user reads: `hr_state_{profile}`, `hr_date_{profile}`, `hr_week_{profile}`, `hr_reports_{profile}`
- Legacy "stu": admin uses `hr_admin` / `hr_state`, app.html uses `hr_admin` / `hr_state_stu`

### Verified Patterns
- surveyInvite (not surveySection) — correct across all user pages
- Streak: 7+ days = 1.5x, 14+ days = 2x
- Spin wheel: unlocks when ALL daily tasks complete, limited to once/day
- Streak increments per task completion but `checkStreak()` guards by date

### Consolidation Verification (Phase 4)
Verified all 5 migrated features (TASK_HELP + showTaskHelp, filterForProfile, task flags, completedEver tracking, help buttons) — all pass with proper escaping, profile-suffixed keys, correct logic, no duplicates, no regressions. Gate: 🟢 READY FOR PRODUCTION.

### Bug Bash Results
- **Critical:** Firebase project ID references still "habitrewards-131" in 3 files (runtime config mismatch risk).
- **Medium:** get-started.html step 7b back button broken (numeric vs string comparison), missing event parameter null checks.
- **Verified clean:** No SendGrid references, admin pending bug fixed, payout flow operational, profile-suffixed keys audit complete.

### Post-Parallel Agent Smoke Test
- 🔴 admin.html CSP `connect-src` missing `*.cloudfunctions.net` — blocks Cloud Function calls.
- 🔴 admin.html missing `</body></html>` closing tags (file truncated).
- 🟡 app.html doesn't load `js/dark-mode.js` in head → FOUC for dark mode users.
- 🟡 admin.html has zero dark mode support.
- 🟢 onclick migration 100% clean, SW cache complete, Apple Sign-In configured, data-action delegation working.
- **Lesson:** Parallel agent commits on shared files require structural integrity pass as mandatory gate. CSP is especially fragile.

## Cross-Project Tester Knowledge (injected 2026-05-02)

### From EatDiscounted (McManus)
- **Zero tests = zero confidence.** Even minimal suite prevents broken deploys.
- **Unicode normalization silent killer:** `"".includes("")` is true → false positives on empty strings.
- **Empty catch blocks hide failures:** Error states must be visually distinct from empty results.
- **Mock patterns:** `vi.fn()` on fetch, API keys in `beforeEach`, test success + failure paths.

### From Slotted (Sokka)
- **Payload key mismatches top failure cause:** Backend mixed camelCase/snake_case. Inspect each endpoint.
- **Polling helper:** `waitFor<T>(fn, predicate, maxAttempts, delayMs)` for async assertions.
- **Response mapping mismatches:** `friendshipId` vs `id` → requests to `/friends/undefined`.
- **Account deletion cascade testing:** Check all related tables for orphans.
- **Notification type overloading:** Single type for 4+ events → false dedup suppression.

### From MyDailyWin (Alumni: Helen, Robin)
- Independent verification confirms real bugs — same core bugs found by every tester rotation (storage keys, undefined functions). Architectural issues, not one-offs.

### From MyDailyWin (Riju — Security)
- **CSP `unsafe-inline` elimination:** 57+ onclick → `data-action` + event delegation.
- **Open redirect:** Always validate redirect targets.
- **Firestore rules: auth ≠ authorization.** Always scope to document owner.
- **Service worker cache versioning:** Adding external JS/CSS requires bumping SW cache version.

### From Scrunch (Rizzo), HealthStitch (Zoe)
- No testing learnings yet (early stage projects).

## Session Archive Summary

Purah completed 6+ sessions: comprehensive quality review (8 critical bugs identified, storage map documented), Phase 4 consolidation verification (all 5 features pass), full bug bash sweep (1 critical Firebase config, 1 medium step navigation, 4 low), post-parallel agent smoke test (2 critical CSP/HTML issues, 3 medium), and cross-agent context integration. Testing covers onboarding, auth, admin, settings, and payout flows with all prior bugs verified fixed.
