
### Decision: Unified Font Stack (Nunito) Across All Pages
**Status:** ✅ Implemented  
**Date:** 2026-05-01  
**Agents:** Mipha (User Dev), Urbosa (Admin Dev)  
**Scope:** app.html, login.html, home.html, get-started.html, index.html, admin.html, admin-guide.html

**Context:** 
Sidon's UX audit identified font inconsistency: Nunito in app.html, Quicksand in marketing pages, system fonts in admin. Unified visual experience across platform requires single font stack.

**Decision:**
1. **Nunito is canonical** — applied to all 7 pages (weights: 400/600/700/800 via Google Fonts)
2. **Quicksand removed** — was used only in home.html (marketing page)
3. **System fonts removed** — was fallback in admin.html, admin-guide.html

**Implementation:**
- **Mipha (User Dev):** Unified 5 user-facing pages (app, login, home, get-started, index) to Nunito
- **Urbosa (Admin Dev):** Unified 2 admin pages (admin, admin-guide) to Nunito

**Impact:**
- Consistent visual language across marketing → login → app → admin funnel
- One font stack to maintain
- Supports future dark mode implementation (Sidon Decision #7)

---

### Decision: Consolidate CSS Variables (shared.css as Canonical Source)
**Status:** ✅ Implemented  
**Date:** 2026-05-01  
**Agents:** Mipha (User Dev), Urbosa (Admin Dev)  
**Scope:** app.html, login.html, home.html, get-started.html, index.html, admin.html, admin-guide.html, css/shared.css, css/admin.css

**Context:** 
Duplicate `:root` blocks across pages prevented single-source-of-truth for colors. CSS variables existed in shared.css but weren't imported. Any color change required editing 4+ files.

**Decision:**
1. **shared.css is the canonical source** for all CSS variables and reset styles
2. **Import shared.css first** in every page, before page-level `<style>` blocks
3. **No duplicate `:root` blocks** — pages inherit from shared.css only. Dark mode overrides or page-specific additions go in page-level `<style>`.
4. **CSS variables over hardcoded values** — use var(--primary), var(--bg), var(--card-bg), var(--text), var(--text-secondary), var(--border), var(--radius-box), var(--radius-btn)

**Implementation:**
- **Mipha:** Added shared.css import to app.html, login.html, home.html, get-started.html, index.html; removed duplicate `:root` blocks (9 lines per page); replaced 12 hardcoded hex values with variables
- **Urbosa:** Added shared.css import to admin.html, admin-guide.html; removed duplicate `:root` blocks from admin.css; replaced 5 hardcoded #58cc02 values with var(--primary); standardized border-radius: var(--radius-box), var(--radius-btn)

**Variables Defined (shared.css):**
- **Colors:** --primary (#58cc02), --bg (#f7f7f7), --card-bg (#ffffff), --text (#333333), --text-secondary (#555555), --border (#6c757d), --success (#28a745), --danger (#dc3545), --warning (#ffc107), --info (#17a2b8), --light (#e9ecef)
- **Spacing:** --radius-box (20px), --radius-btn (8px)

**Duplicate CSS Removed:**
- 42 lines total: 3x duplicate `:root` blocks (33 lines), 2x duplicate reset styles (9 lines)

**Impact:**
- Single source of truth for colors and spacing
- Future color/font changes only need shared.css edits — no page-by-page updates
- Enables consistent dark mode (Sidon Decision #7) via --data-theme selector

---

### Decision: Responsive Breakpoints (Mipha + Urbosa)
**Status:** ✅ Implemented  
**Date:** 2026-05-01  
**Agents:** Mipha (User Dev), Urbosa (Admin Dev)  
**Breakpoints:** 375px (small phone), 768px (mobile), 1024px (tablet)

**Context:** 
Sidon's UX audit identified zero responsive design. app.html and admin.html break at small screens (375px, 768px, 1024px). Admin tabs unscrollable on mobile.

**Decision:**
Add media queries with three tiers of responsive adjustments. Mobile-first reductions only (no layout reflow).

**Implementation:**
- **Mipha (app.html):** 3 responsive breakpoints with reductions for: header, balance hero, cards, modals, task rows, buttons, badges, star ratings, celebration modals
- **Urbosa (admin.html):** 3 responsive breakpoints with: scrollable tab strip (overflow-x, no hamburger), horizontal scroll tables (preserve column relationships), stacked stat grid (small phone), reduced fonts/padding

**Design Rationale (Urbosa):**
- **Scrollable tab strip** chosen over hamburger because:
  - All 7 tabs remain visible and immediately accessible
  - No JS changes required (no toggle state)
  - Consistent with existing interaction pattern
  - Admin needs rapid tab switching
- **Horizontal scroll tables** chosen over row stacking because:
  - Preserves column relationships (task name ↔ points ↔ dollar value)
  - 3-4 columns per table — stacking would be visually confusing

**Impact:**
- Admin and user pages usable on phones/tablets
- Desktop layout unchanged
- No structural HTML changes (CSS-only)
- No JavaScript changes

---

## 🔍 OPTIMIZATION AUDIT (2026-05-01, Impa)

### Decision: Codebase Optimization Roadmap
**Status:** 📋 AUDIT COMPLETE — PHASES PENDING EXECUTION  
**Date:** 2026-05-01  
**Agent:** Impa (Optimizer)  
**Scope:** 14 files, ~10,051 lines, ~443 KB

**Audit Findings:**

| Category | Lines | Items | Examples |
|----------|-------|-------|----------|
| Dead Code | ~40 | 5 | rate(), submitSurvey(), approvePayoutRequest(), shareApp(), functions/index.js stub |
| Duplicate Logic | ~362 | 15 | Points calc (3x), state updates (13x), suffix calc (10x), Firebase config (3x), SW registration (4x), button styles (3x) |
| Oversized Inline Code | ~748 | 8 | app.html 425-line `<style>`, home.html 104 inline styles, admin-guide.html 108-line `<style>` |
| Redundant Operations | 7 insights | — | Element batching, dual writes, no memoization, innerHTML reflow, class toggles |
| **TOTAL** | **~1,150-1,350** | — | **11-13% of codebase** |

**Token Cost Impact:** 30-40% reduction when working across multiple files (shared files read once, not per-page).

**Implementation Phases:**

| Phase | Tasks | Duration | Savings | Impact |
|-------|-------|----------|---------|--------|
| **Phase 1 (Quick Wins)** | Delete dead code (D1-D5), extract Firebase config + SW registration | 1-2h | 49 lines | Removes obsolete code, eliminates highest-frequency duplicates |
| **Phase 2 (Deduplication)** | Create js/utils.js, consolidate admin logic, centralize .btn styles, extract points calculation | 2-4h | 225 lines | Reduces cross-file duplication, centralizes business logic |
| **Phase 3 (CSS Extraction)** | Extract app.html inline CSS → css/app.css, convert inline styles → classes, consolidate remaining inline styles | 4-6h | 748 lines | Reduces HTML file sizes, enables shared CSS reuse, supports responsive design |

**Consolidation Targets (CO1-CO10):**
- CO1: Firebase config shared (24 lines)
- CO2: Service worker init shared (15 lines)
- CO3: Utils (escapeHtml, formatDollar, getSuffix) shared (40 lines)
- CO4: .btn* styles centralized to shared.css (60 lines)
- CO5: CSS custom properties for gradients/shadows (20 lines)
- CO6: app.html inline CSS → css/app.css (415 lines)
- CO7: admin-guide.html inline CSS → admin.css (85 lines)
- CO8: calculatePointsWithBonuses() helper (50 lines)
- CO9: addPoints() helper (25 lines)
- CO10: Admin payout Firestore/localStorage consolidation (50 lines)

**Decision:**
Approve Phase 1 (quick wins) immediately. Phases 2 & 3 dependent on team capacity and prioritization. Audit provides detailed line-by-line recommendations for each phase.

**Next Steps:**
1. Revali prioritizes phases
2. Daruk leads Phase 1 (dead code removal, JS extraction)
3. Mipha leads Phase 3 (CSS extraction)
4. Purah validates regression testing

**Reviewer:** Revali  
**Regression Check:** Purah  
**Owner:** Impa (audit), Daruk (Phase 1 JS), Mipha (Phase 3 CSS)


---

## 🧹 CODE OPTIMIZATION EXECUTION (2026-05-01)

### Phase 1 Complete: Shared JS Extraction (Daruk)

**Status:** ✅ COMPLETE  
**Date:** 2026-05-01  
**Agent:** Daruk (Backend Dev)  
**Decision Items:** DL8, DL9, DL10, CO3, D4

**What Executed:**
- Created `js/firebase-config.js` — extracted Firebase initialization from login.html, app.html, admin.html (~24 lines saved)
- Created `js/sw-init.js` — extracted Service Worker registration from home.html, login.html, get-started.html, app.html (~15 lines saved)
- Created `js/utils.js` — extracted escapeHtml and helper functions from app.html, login.html, admin.html (~15 lines saved)
- Deleted `functions/` directory — dead Cloud Functions stub, no exports. Removed from firebase.json. (~200 KB saved, 8300+ lines)

**Rationale:**
- Single source of truth for Firebase config, SW registration, escapeHtml
- Config changes now require editing 1 file instead of 3
- escapeHtml unified (was slightly different in each file)

**Load Order Contract:**
```
sw-init.js          (no deps)
Firebase SDK CDNs   (prerequisite for firebase-config.js)
firebase-config.js  (calls firebase.initializeApp)
utils.js            (no deps, prerequisite for page scripts using escapeHtml)
page-specific <script> (uses firebase.auth(), firebase.firestore(), escapeHtml())
```

**Risks Addressed:**
- **CSP:** Scripts use 'self' origin, allowed by existing policy. No changes needed.
- **Caching:** External JS files will be browser-cached. Config changes may need cache-busting query params.
- **SW cache:** sw.js may need to add js/*.js to offline cache list.

**Cross-Agent Notes:**
- Mipha/Urbosa: Use shared scripts for new pages instead of inlining.
- Revali: functions/ deletion aligns with earlier recommendation.

---

### Phase 1 Complete: app.html Dead Code + Helper Extraction (Mipha)

**Status:** ✅ COMPLETE  
**Date:** 2026-05-01  
**Agent:** Mipha (User Dev)  
**Decision Items:** D1, DL1, DL2

**What Executed:**

**D1 — Deleted rate(), submitSurvey(), currentRating**
- Rationale: Zero references. Feedback system fully refactored to submitFeedback()+feedbackModal. Legacy remnants.
- Risk: None — no HTML onclick, no JS calls, no string refs.

**DL1 — Extracted calculatePointsWithBonuses(basePoints)**
- Rationale: Streak × lucky × random bonus was copy-pasted in completeTaskDirectly() and confirmTask(). Consolidation prevents drift.
- Returns: { pts, bonusMsg, randomMult } — covers all caller needs.
- Risk: Low — pure calculation, no side effects.

**DL2 — Extracted addPoints(amount)**
- Rationale: state.balance += X; state.totalEarned += X appeared 11 times. Single update point prevents drift.
- Risk: None — mechanical 1:1 replacement.

**Impact:**
- Lines removed: 88
- Lines added: 42
- Net: 46 lines saved
- Duplication points: 3 eliminated
- Behavioral change: None (pure refactor)

---

### Phase 1 Complete: admin.html Deduplication + Optimization (Urbosa)

**Status:** ✅ COMPLETE  
**Date:** 2026-05-01  
**Agent:** Urbosa (Admin Dev)  
**Decision Items:** DL3, DL6, D2, D3, RO4

**What Executed:**

**DL3 — Extracted getProfileSuffix() helper**
- Pattern: '_' + PROFILE_ID or '' based on legacy status
- Why: 10 call sites — any change required 10 edits
- Risk: None — pure mechanical extraction.

**DL6 — Extracted formatDollar(amount) helper**
- Pattern: parseFloat(amount).toFixed(2)
- Why: 7 call sites repeating same computation
- Risk: None — identical computation, just named.
- Note: Did NOT touch (value/100).toFixed(2) patterns — those do division first, different semantic.

**D2 — Deleted approvePayoutRequest() (dead code)**
- What: 4-line wrapper around markPayoutSent()
- Why: Comment said "use markPayoutSent instead", zero references
- Risk: None — no callers.

**D3 — Deleted shareApp() (dead code)**
- What: 9-line share/clipboard function
- Why: Never referenced in any button, link, or onclick
- Risk: None — no UI references.

**RO4 — Converted innerHTML += loops to array-join**
- 4 forEach loops in displayTasks() now push to array, join once
- Why: innerHTML += forces DOM reparse per iteration (O(n²))
- Risk: None — identical HTML output, built more efficiently

**Impact:**
- Duplication eliminated: 2 helpers (getProfileSuffix, formatDollar)
- Dead code removed: 2 functions (13 lines)
- Performance: displayTasks() O(n²) → O(n)

**Cross-Agent Notes:**
- getProfileSuffix() and formatDollar() candidates for shared.js if app.html uses same patterns.

---

### Phase 1 Summary

**Overall Metrics:**
- Code removed: 101 lines (88 app.html + 13 admin.html)
- Code added: 42 lines (helpers + consolidation)
- Net reduction: 59 lines
- Size reduction: ~200 KB (functions/ deletion)
- Duplication points eliminated: 7 (3 shared JS + 2 app.html + 2 admin.html)
- Performance improvements: 1 (displayTasks O(n²) → O(n))
- Dead code removed: 5 functions
- CSP changes: 0

**Next Phases:** Phase 2 (dedup consolidation) and Phase 3 (CSS extraction) pending prioritization.

---

# Final Wave: Admin Optimization, Backend Fixes, UX Sweep (2026-05-01)

## Decision: Admin Optimization Sweep (Urbosa)
**Status:** ✅ IMPLEMENTED  
**Date:** 2026-05-01  
**Agent:** Urbosa (Admin Dev)

### 1. Payout Function Consolidation
**Decision:** Merge 4 payout functions into 2 unified ones with Firestore-first, localStorage-fallback pattern.
**Why:** localStorage auth fallback was removed (Daruk's security fix). Separate `*Local()` functions now redundant. Unified approach tries Firestore, catches errors, degrades to localStorage.
**Trade-off:** If Firestore fails silently, localStorage still records locally. Better than losing the action entirely.

### 2. Task Table Deduplication
**Decision:** Extract `renderTaskRow()` helper and iterate over categories array.
**Why:** 4 identical forEach loops with same template differed only in category name. Data-driven approach eliminates copy-paste risk.

### 3. CSV Escaping Unification
**Decision:** All CSV exports use `escapeCSV()` helper. `escapeHtml()` stays in js/utils.js for HTML contexts.
**Why:** Three download functions used inline `.replace(/"/g,'""')` which missed null handling, comma escaping, newline handling. `escapeCSV()` covers all cases.

### 4. admin-guide.html CSS Extraction
**Decision:** Move all inline styles to css/admin.css. No scoping prefix needed.
**Why:** admin-guide.html already imported admin.css. Inline styles duplicated existing rules (faq, btn) and added page-specific ones. Single source of truth.

### 5. displayStats() DOM Batching
**Decision:** Cache all getElementById results in single object at function top.
**Why:** 11 DOM lookups per call → 9 cached references. Reads as clean data structure instead of scattered lookups.

### 6. ARIA Tab Navigation
**Decision:** Full WAI-ARIA tabbed interface: tablist, tab, tabpanel roles with aria-selected state management.
**Why:** Screen readers had no way to navigate 7-tab admin interface. Standard ARIA pattern for accessibility.

**Impact:** -97 lines net (185 added, 282 removed). No behavioral changes. Accessibility improved.

---

## Decision: Forgot Password Flow (Daruk)
**Status:** ✅ IMPLEMENTED  
**Date:** 2026-05-01  
**Agent:** Daruk (Backend Dev)  
**Triggered by:** Sidon UX audit finding P2

**Context:** Users who sign in with email/password had no way to reset forgotten passwords.

**Decision:**
- Added inline "Forgot password?" link and reset form to login.html
- Uses Firebase Auth's built-in `sendPasswordResetEmail()`
- No modal — keeps it lightweight, consistent with existing toggle pattern (email form show/hide)

**Key Choices:**
1. Inline form, not modal — follows existing pattern
2. Pre-fill email from login form to reset form — small UX win
3. Friendly error messages — Firebase error codes mapped to human-readable strings
4. No backend changes — `sendPasswordResetEmail` is client-side Firebase Auth

**Files Changed:** login.html — CSS, HTML (reset form + forgot link), JS (showResetForm, hideResetForm, sendResetEmail, showSuccess, hideSuccess)

**Risks/Follow-ups:**
- Firebase password reset email template is generic — could customize in Firebase Console if branding matters
- Rate limiting handled by Firebase (auth/too-many-requests), no abuse concern

---

## Decision: SW Cache Regression Fix (Daruk)
**Status:** ✅ IMPLEMENTED  
**Date:** 2026-05-01  
**Agent:** Daruk (Backend Dev)

**Context:** Sidon's code sweep extracted shared CSS and JS into new files (css/shared.css, js/firebase-config.js, js/sw-init.js, js/utils.js). These files were never added to service worker's STATIC_ASSETS cache list. Additionally, index.html was missing. Offline users would see unstyled, broken pages.

**Decision:**
1. Added all 5 missing files to STATIC_ASSETS in sw.js
2. Bumped cache version: mydailywin-v2 → mydailywin-v3

**Rationale:** 
- Offline support is PWA core requirement
- Cache version bump forces activate event to clear old caches and re-download assets
- Without fix, existing installs would serve stale cached pages referencing missing files

**Process Rule (Going Forward):**
**Any PR that adds, removes, or renames a file must update sw.js STATIC_ASSETS and bump cache version. This is a review checklist item.**

---

## Finding: Fresh UX/Design Sweep (Sidon)
**Status:** 📋 AUDIT COMPLETE  
**Date:** 2026-05-01  
**Agent:** Sidon (UX/Design)  
**Scope:** app.html, index.html, home.html, login.html, get-started.html

### 15 Findings (Not in First Audit)

| # | Finding | Priority | Location | Recommendation |
|---|---------|----------|----------|-----------------|
| F1 | No PWA Install Prompt Handler | P1 | All pages | Add `beforeinstallprompt` handler + sticky banner (3 visits) |
| F2 | Login Bonus Disappears Too Fast (3s) | P1 | app.html ~1497 | Replace auto-hide with tappable card, add confetti |
| F3 | Spin Wheel No Easing (Linear 100ms) | P2 | app.html ~1567 | Exponential deceleration 60ms→400ms, add scale pulse |
| F4 | Achievements Toast-Only, Only 4 Total | P2 | app.html ~1793 | Add celebration modal, expand to 12+ milestones |
| F5 | task-help-btn 36x36px (Below 44px) | P2 | app.html ~294 | Change to min-width/min-height 44px |
| F6 | Onboarding Checkbox 20x20px | P2 | get-started.html ~204 | Increase visual checkbox to 28x28px |
| F7 | No Empty State When All Tasks Done | P2 | app.html ~2262 | Show celebratory card: "🎉 All done! Come back tomorrow." |
| F8 | manifest background_color Mismatch | P3 | manifest.json line 8 | Change #f0f2f5 → #f7f7f7 (match --bg) |
| F9 | Screenshots Array Empty | P3 | manifest.json line 31 | Add 2-3 phone-viewport screenshots |
| F10 | No Escape Key Handler for Modals | P3 | app.html ~3174 | Add global keydown listener: Escape closes topmost modal |
| F11 | Dark Mode Not Available on Other Pages | P3 | login.html, home.html, get-started.html | Read localStorage theme on all pages, apply dark-mode class |
| F12 | Login Bonus No Confetti | P2 | app.html ~1487 | Add `triggerConfetti()` after addPoints(25) |
| F13 | get-started.html Uses alert() | P3 | get-started.html ~719 | Replace with styled inline error message below input |
| F14 | Unused CSS Keyframes (7 defined) | P3 | app.html lines 32-42 | Wire `jackpot` into spin wheel reveal (F3), delete others |
| F15 | SW Cache Missing shared.css/JS | P3 | sw.js ~10-23 | Add shared CSS + js files to STATIC_ASSETS (✅ Daruk fixed) |

### Top 5 Highest-Impact NEW Improvements

| Rank | Finding | Impact | Effort |
|------|---------|--------|--------|
| **1** | **F1 — PWA Install Prompt** | Critical for daily retention. Without install, users forget URL. #1 growth lever. | Medium |
| **2** | **F2 + F12 — Login Bonus Celebration** | Daily re-engagement moment is currently silent/invisible. Making it a real celebration is #1 gamification win. | Low |
| **3** | **F7 — "All Done" Empty State** | Moment of maximum pride has no reward. Celebratory card drives sharing + next-day return. | Low |
| **4** | **F3 — Spin Wheel Easing** | Signature gamification moment. Flat animation undermines excitement. Easing is small code change, outsized feel improvement. | Low |
| **5** | **F15 — Cache shared.css/JS in SW** | Offline users get broken styling. Regression from recent refactor. | Very Low |

---

## Decision: User Feature Implementations (Mipha)
**Status:** ✅ IMPLEMENTED  
**Date:** 2026-05-01  
**Agent:** Mipha (User Dev)

### 1. PWA Install Prompt Strategy
**Choice:** Custom banner in app.html (card-style, dismissible), inline hero button in home.html.
**Why:** app.html users are existing — a card banner gives context without intrusiveness, dismiss state persists in localStorage. home.html visitors are new — an inline button in hero CTA area is natural, non-disruptive.
**Trade-off:** Banner doesn't re-show after dismiss. If user changes mind, they need to clear localStorage or use browser menu. Prevents nagging.

### 2. Login Bonus Confetti — Tier 1 (20 particles)
**Choice:** 20 particles for login bonus, matching Tier 1 (micro-celebration) from gamification skill.
**Why:** Login bonus is small daily moment — too much confetti devalues bigger celebrations (level-up = 50, streak milestone = 45). Keeping hierarchy clear preserves emotional payoff.

### 3. All Done Celebration — Tier 2 (50 particles)
**Choice:** 50 particles with green gradient card and dismiss button. Uses sessionStorage for once-per-session-per-day firing.
**Why:** Completing ALL daily tasks is peak engagement moment — deserves Tier 2. sessionStorage (not localStorage) fires once per browser session but re-triggers on close+re-open, feels correct for "welcome back, you already did it!" moment. Card auto-hides if tasks are undone.

### 4. No Sound Effects Added
**Choice:** Visual-only celebrations per user directive.
**Why:** Shari explicitly stated sound effects not a priority. Gamification skill includes sound guidelines but deferred.

### 5. manifest.json background_color Fix
**Choice:** Updated #f0f2f5 → #f7f7f7. Left theme_color at #58cc02.
**Why:** --bg in shared.css is #f7f7f7. Mismatch caused visible flash on PWA splash screen. theme_color already matches --primary.

---

## Finding: "Balancing" Task Safety Sweep (Mipha)
**Status:** 📋 RESEARCH COMPLETE  
**Date:** 2026-05-01  
**Agent:** Mipha (User Dev)  
**Requested by:** Shari Paltrowitz

**Finding:** No "balancing" task exists anywhere in source code. Searched all HTML files (app.html, admin.html, home.html, get-started.html, index.html), all JS files, all JSON files. Word "balancing" only appears in the original removal directive.

**Task may have:**
- Already been removed in prior change
- Exist only in Firestore user data (not in code defaults)
- Live in localStorage/Firestore if user added it via admin panel

**No code changes made.**

### Safety Review of Existing Physical Tasks

| Task | Location | Risk Level | Note |
|------|----------|------------|------|
| 🚶 Go for a walk | app.html (both templates), admin.html | Low | Walking is generally safe |
| 🧘 Do some stretching | app.html LOW_TECH_BONUSES | Low | Could aggravate injuries if done improperly |
| 🧘 Do 5 minutes of stretching | app.html REGULAR_BONUSES, admin.html | Low | Same as above |
| 🎾 Tennis/pickleball 3x this week | admin.html DEFAULT_PERMANENT_WEEKLY | **Moderate** | **⚠️ High-impact sport, could cause injury (falls, sprains) without proper conditioning** |

**Recommendation:** Tennis/pickleball task is highest-risk item. All others are low-intensity activities. None require immediate removal, but Shari should confirm tennis/pickleball task is appropriate for target user.

---

## Directive: Remove "Balancing" from Suggested Tasks (Shari Paltrowitz)
**Status:** 📋 RECEIVED & PROCESSED  
**Date:** 2026-05-01T20:37:00Z  
**Via:** Copilot Directive

**What:** Remove "balancing" from suggested tasks — could result in injury if someone isn't careful.

**Why:** User request — liability/safety. Team should review all suggested tasks for similar risks.

**Action Taken (Mipha):** Searched entire codebase. No "balancing" task found in code. Reviewed all physical tasks for safety concerns. Tennis/pickleball flagged as moderate risk.

**Recommendation:** Shari reviews tennis/pickleball task appropriateness. Consider adding a disclaimer or skill-level check before suggesting high-impact activities.

---


---

## Decision: Apple Sign-In Implementation (Daruk)
**Status:** ✅ Implemented  
**Date:** 2025-07-25  
**Agent:** Daruk (Backend Dev)  
**Scope:** login.html, js/login.js

**Context:** Apple Sign-In added to login.html alongside existing Google Sign-In.

**Decision:**
- Uses Firebase Auth `OAuthProvider('apple.com')` with popup flow (same as Google)
- Scopes: email, name
- Auth state listener handles post-sign-in redirect (no separate redirect logic needed)
- Button uses inline SVG for Apple logo (no external image dependency)

**Impact:**
- No changes to auth state listener or redirect logic — Apple auth result flows through same `onAuthStateChanged` handler
- Apple may return a private relay email on first sign-in; display name may be null on subsequent sign-ins (Apple only sends name on first auth)

---

## Decision: EmailJS Migration to Cloud Function (Daruk)
**Status:** ✅ Implemented  
**Date:** 2025-01-20  
**Agent:** Daruk (Backend Dev)  
**Scope:** functions/index.js, admin.html, firebase.json, CSP configuration

**Context:**
admin.html was using EmailJS client-side with exposed service/template IDs and public key. Medium security finding — any user could inspect page source and use those credentials.

**Decision:**
1. Migrate email sending to Firebase Cloud Function (`sendInviteEmail`)
2. Validates caller is authenticated via Firebase Auth
3. Calls EmailJS REST API server-side (credentials never exposed to client)
4. Validates input (email format, required fields)

**Implementation:**
- Cloud Function: `functions/index.js` — exports `sendInviteEmail` (v2 onCall)
- Client: admin.html uses `firebase.functions().httpsCallable()` instead of EmailJS SDK
- Removed from client: EmailJS CDN script, public key, service ID, template ID
- CSP updated: `*.cloudfunctions.net` replaces `api.emailjs.com` in connect-src
- firebase.json: Added `"functions"` config block

**Trade-offs:**
- Cold start latency on first invocation (~1-2s) — acceptable for invite emails
- Still using EmailJS (same 200/month free tier limit) — just calling from server side now

---

## Decision: Phase 2 CSS Optimization (Impa)
**Status:** ✅ Implemented  
**Date:** 2025-07-18  
**Agent:** Impa (Optimizer)  
**Scope:** shared.css, app.css, admin.css, home.css, login.css, get-started.css, sw.js

**What Was Done:**
1. Consolidated .btn CSS across 6 page-specific CSS files
2. shared.css now owns universal base properties (border, border-radius, font-size, cursor, transition, display, padding, min-height)
3. Each page CSS only specifies deltas
4. Removed dead CSS: `.btn-completed` (app.css), `.btn-outline` (home.css)
5. Bumped SW cache to v6

**What Was Already Done (Phase 1):**
- app.html keyframes (bounce, float, jackpot, etc.) — already removed
- home.html inline `style=""` attributes — already extracted to home.css
- Inline `<style>` blocks — already extracted to per-page CSS files

**Net Impact:**
- ~30 lines of redundant `.btn` CSS removed
- 2 dead CSS selectors removed
- All page CSS files inherit from shared.css — DRY principle
- Token cost reduction for multi-file AI reads

**Rationale:**
Centralizing base button properties ensures: (a) single source of truth for future changes, (b) lower token cost, (c) less style drift between pages.

---

## Decision: CSP unsafe-inline Elimination (Riju)
**Status:** ✅ Implemented  
**Date:** 2025-01-20  
**Agent:** Riju (Security)  
**Scope:** All HTML pages, all JS/CSS files, CSP meta tags, event handling

**Context:**
Security audit flagged `unsafe-inline` in script-src as High finding. All HTML pages had inline `<style>` blocks, inline `<script>` blocks (2000+ lines in app.html), and 57+ inline `onclick` handlers.

**Decision:**
1. Extract all inline code to external files (CSS and JS separated per page)
2. Convert inline event handlers to delegated listeners using `data-action` attributes
3. Add CSP meta tags with `script-src 'self'` + explicit CDN origins
4. Keep `'unsafe-inline'` for `style-src` only (not a code execution vector)

**CSP Policy Example:**
```
script-src 'self' https://www.gstatic.com https://apis.google.com https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com;
```

**Trade-offs:**
- **Pro:** XSS via inline script injection fully mitigated
- **Pro:** No build system required — works with vanilla HTML/JS
- **Con:** `style-src 'unsafe-inline'` remains (acceptable risk, not code execution vector)
- **Con:** Event delegation adds ~50 lines per JS file for dispatcher

**Files Changed:**
- app.html, offline.html — inline code extracted, CSP added, onclick→data-action
- New CSS files: css/app.css, css/offline.css
- New JS files: js/app.js, js/home.js, js/login.js, js/offline.js
- admin.html — CSP connect-src fix
- sw.js — cache manifest updated to v4

**Alternatives Considered:**
- Nonce-based CSP — requires server-side rendering; not viable with static Firebase Hosting
- Hash-based CSP — brittle; breaks on any code change
- Full style externalization — impractical without build step for 500+ inline style attributes

---

## Decision: UX Remaining Items Implementation (Sidon)
**Status:** ✅ Implemented  
**Date:** 2025-07-24  
**Agent:** Sidon (UX/Design)  
**Scope:** js/app.js, js/get-started.js, js/dark-mode.js (NEW), css/login.css, css/home.css, css/get-started.css, sw.js

**Context:**
Post-sweep findings F3 (spin wheel easing), F10 (Escape key), F11 (dark mode), F13 (toast) remained unimplemented. Polish items (P2-P3) that improve perceived quality and consistency.

**Decisions:**

1. **Spin wheel uses exponential deceleration** — `setTimeout` chain with `delay = 60 * e^(1.8 * progress)`. No external dependencies. Winner pre-determined for clean final frame.

2. **Escape key closes topmost modal** — single global `keydown` listener in app.js, finds `.modal.active` and calls `closeModal()`. No per-modal wiring needed.

3. **Dark mode respects localStorage('theme') then prefers-color-scheme** — shared `js/dark-mode.js` runs synchronously on page load to prevent flash. Same color palette as app.html dark mode (#131f24 bg, #202f36 cards, #37464f borders, #e5e5e5 text).

4. **Toast replaces alert() in get-started.html** — self-contained `showToast()` function in js/get-started.js, styled consistently with app.html toasts, includes dark mode support.

**Impact:**
- Dark mode now works across all user-facing page transitions (login → home → get-started → app)
- Spin wheel feels like a real slot machine moment (suspenseful deceleration)
- Keyboard users can dismiss modals without mouse
- No more jarring native browser dialogs in onboarding
- Consistent dark mode experience (unified palette)

**Supporting Changes:**
- Service worker cache bumped to v5
- Added `js/dark-mode.js` to SW precache list
- All JS validated with `node -c` syntax check

---
