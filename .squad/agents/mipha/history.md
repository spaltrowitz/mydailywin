# Mipha — History

## Core Context

Mipha completed 15+ sessions spanning:
- P0 bug fixes: IS_LEGACY_PROFILE scoping, updateBalanceDisplay, JSON.parse hardening
- Modal accessibility: 21 spans→buttons, 22 modals with ARIA (dialog, modal, aria-modal)
- Phase 2 consolidation: 5 features migrated from index.html→app.html (TASK_HELP, filterForProfile, task flags, completedEver, help buttons), 149 insertions net
- XSS remediation: 4 app.html + 6 login.html sites with `escapeHtml()`
- Responsive design: 375px/768px/1024px breakpoints, 44px touch targets
- UX celebrations: level-up modals, streak milestones (7/14/30), confetti (40-50 particles) with prefers-reduced-motion
- PWA install: `beforeinstallprompt` handler with dismissible banner
- Code deduplication: deleted dead code (rate, submitSurvey, -16 lines), extracted calculatePointsWithBonuses (-20 lines), addPoints (-10 lines)
- Total impact: eliminated 3 divergent codebases, hardened all user-facing security, established accessibility standards

## Key Patterns & Corrections

### Escaping & Security
- **XSS strategy:** User-controlled data → `escapeHtml()`. Values in JS execution context → `data-*` attributes + `addEventListener()`. Static HTML/hardcoded constants safe for innerHTML.

### Architecture
- **Code consolidation (Option C):** Merged 3 divergent codebases → single app.html. Single source of truth.
- **getDefaultState():** Canonical default state merging 19 fields — prevents schema drift.
- **Profile suffix pattern:** `(PROFILE_ID && !IS_LEGACY_PROFILE) ? '_' + PROFILE_ID : ''` — use everywhere for storage keys.
- **shared.css is single source of truth** for CSS variables. Never redeclare `:root` vars.
- **Shared JS load order:** sw-init.js → Firebase SDK → firebase-config.js → utils.js → page scripts.

### Bug Fix Patterns
- `IS_LEGACY_PROFILE` must be defined as `PROFILE_ID === 'stu'` in every file that references it.
- All `JSON.parse` calls hardened with try/catch + sensible defaults.
- Event parameters in onclick: use optional chaining `event?.currentTarget`.
- Transient runtime properties prefixed with underscore (`_lastLevelName`) — not persisted to localStorage.
- **Cashout race conditions:** Check `btn.disabled` at function start before any logic. Prevents double-tap exploits.
- **Balance deduction timing:** Deduct balance immediately when user requests cashout, not when admin approves.

### UI/UX Patterns
- **Responsive:** 375px/768px/1024px breakpoints. All touch targets 44px min. CSS media queries only.
- **Celebrations:** Level-up via transient `_lastLevelName`, streak milestones at 7/14/30 days, 40-50 particle confetti with `prefers-reduced-motion` respect.
- **PWA install:** `beforeinstallprompt` handler with dismissible banner (localStorage flag).
- **Font:** Nunito via Google Fonts (`display=swap`).
- **All Done card:** 50-particle confetti, sessionStorage fire-once-per-day.
- **Login bonus:** 20-particle confetti (Tier 1 micro-celebration), 5s auto-hide.

## Cross-Project Frontend Knowledge (injected 2026-05-02)

### From MyDailyWin (Urbosa — Admin Dev)
- **Storage key mismatch was critical:** Dual-write needed in every write path. Canonical suffix pattern.
- **innerHTML loop performance:** `innerHTML +=` in forEach is O(n²). Array.push() + join('') is O(n).
- **ARIA tab navigation:** Full tablist/tab/tabpanel roles with aria-selected state.

### From EatDiscounted (Hockney — Frontend Dev)
- **SSE streaming:** AbortController on ReadableStream fetch. Abort-on-new-search, 30s timeout.
- **Accessibility:** `aria-label`, `aria-live="polite"` + `role="status"`, `aria-current="page"`.

### From Scrunch (Frenchy — Frontend Dev)
- **Component decomposition:** Extract large components, wrap in `React.memo`.
- **React Query `placeholderData`:** Function searching caches for instant navigation.
- **Auth loading gate:** Never return null — `animate-pulse` placeholder.

## Owner Preferences (learned)
- Prefers emoji-based logo over custom SVG — simpler is better
- Dislikes split-color wordmark styling — wants unified title
- Font should feel playful but professional — Quicksand preferred
- Sound effects downgraded to P3 (nice-to-have)
- Purple accents are subtle tints (#faf5ff, #f3e8ff) — not competing with primary green

## Recent Learnings

### 2026-05-06 — Critical Cashout Bug Fix & Reset Expansion

#### P0 Bug: Cashout Balance Deduction Timing
**Problem:** Balance deducted when admin marks as sent, not when user requests. User could request multiple cashouts before first processes.
**Exploit:** User requests $10 cashout → requests another $10 → balance still $100 → admin marks both sent → balance becomes $80.

**Solution:** Move deduction to `app.js:confirmCashout()`, run immediately after disabling button.

**New contract:**
- **User side:** On request, disable button, deduct balance, create Firestore request
- **Admin side:** On approval, mark sent, NO balance deduction

**Why:** Prevents exploitation, user sees correct balance immediately, Firestore is source of truth.
**Files:** js/app.js, js/admin.js

#### Double-Tap Protection
**Added:** `if (cashoutBtn.disabled) return;` at start of `confirmCashout()`.
**Why:** Mobile double-tap prevention. Defense in depth with balance check + Firestore validation.

#### Expanded Reset Function
**File:** seed-stu.html
**Added:** Clear `payoutRequests`, `userNotifications`, localStorage payout keys.
**Why:** Previous resets left stale data. Now fully clean.

#### Settings Modal Cleanup
**File:** app.html
**Removed:** Admin Mode section
**Why:** Stuart (70s user) should never see admin controls.

### 2026-07-18 — Three Bug Fixes

#### Login Profile Discovery via Firestore
**Problem:** After sign-out/sign-in, login page only checked localStorage for profiles — which was empty.
**Fix:** Made `loadUserProfiles()` async. After localStorage check, also queries Firestore for profiles where user's email is owner (`ownerEmail` field) or admin (legacy `stu` profile check). Persists discovered profiles to localStorage for offline access.
**File:** js/login.js

#### Login Dark Mode Override
**Problem:** Dark mode CSS vars made login page background go black while card stayed white.
**Fix:** Added `body.dark-mode` override in login.css that forces light-mode values for `--bg`, `--card-bg`, `--text`, `--text-light`. Changed `.login-card` background from hardcoded `white` to `var(--card-bg, white)`.
**File:** css/login.css

#### Removed Wordle Help Entry
**Problem:** Wordle task (id: 5) still had a TASK_HELP entry showing a help icon that should have been removed.
**Fix:** Deleted the `5: { ... }` entry from the TASK_HELP object.
**File:** js/app.js

