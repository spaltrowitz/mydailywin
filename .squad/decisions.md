# Decisions



> Older decisions archived to decisions-archive.md on 2026-05-03

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

---

### 1. Payout Function Consolidation
**Decision:** Merge 4 payout functions into 2 unified ones with Firestore-first, localStorage-fallback pattern.
**Why:** localStorage auth fallback was removed (Daruk's security fix). Separate `*Local()` functions now redundant. Unified approach tries Firestore, catches errors, degrades to localStorage.
**Trade-off:** If Firestore fails silently, localStorage still records locally. Better than losing the action entirely.

---

### 2. Task Table Deduplication
**Decision:** Extract `renderTaskRow()` helper and iterate over categories array.
**Why:** 4 identical forEach loops with same template differed only in category name. Data-driven approach eliminates copy-paste risk.

---

### 3. CSV Escaping Unification
**Decision:** All CSV exports use `escapeCSV()` helper. `escapeHtml()` stays in js/utils.js for HTML contexts.
**Why:** Three download functions used inline `.replace(/"/g,'""')` which missed null handling, comma escaping, newline handling. `escapeCSV()` covers all cases.

---

### 4. admin-guide.html CSS Extraction
**Decision:** Move all inline styles to css/admin.css. No scoping prefix needed.
**Why:** admin-guide.html already imported admin.css. Inline styles duplicated existing rules (faq, btn) and added page-specific ones. Single source of truth.

---

### 5. displayStats() DOM Batching
**Decision:** Cache all getElementById results in single object at function top.
**Why:** 11 DOM lookups per call → 9 cached references. Reads as clean data structure instead of scattered lookups.

---

### 6. ARIA Tab Navigation
**Decision:** Full WAI-ARIA tabbed interface: tablist, tab, tabpanel roles with aria-selected state management.
**Why:** Screen readers had no way to navigate 7-tab admin interface. Standard ARIA pattern for accessibility.

**Impact:** -97 lines net (185 added, 282 removed). No behavioral changes. Accessibility improved.

---

---

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

---

### Top 5 Highest-Impact NEW Improvements

| Rank | Finding | Impact | Effort |
|------|---------|--------|--------|
| **1** | **F1 — PWA Install Prompt** | Critical for daily retention. Without install, users forget URL. #1 growth lever. | Medium |
| **2** | **F2 + F12 — Login Bonus Celebration** | Daily re-engagement moment is currently silent/invisible. Making it a real celebration is #1 gamification win. | Low |
| **3** | **F7 — "All Done" Empty State** | Moment of maximum pride has no reward. Celebratory card drives sharing + next-day return. | Low |
| **4** | **F3 — Spin Wheel Easing** | Signature gamification moment. Flat animation undermines excitement. Easing is small code change, outsized feel improvement. | Low |
| **5** | **F15 — Cache shared.css/JS in SW** | Offline users get broken styling. Regression from recent refactor. | Very Low |

---

---

### 1. PWA Install Prompt Strategy
**Choice:** Custom banner in app.html (card-style, dismissible), inline hero button in home.html.
**Why:** app.html users are existing — a card banner gives context without intrusiveness, dismiss state persists in localStorage. home.html visitors are new — an inline button in hero CTA area is natural, non-disruptive.
**Trade-off:** Banner doesn't re-show after dismiss. If user changes mind, they need to clear localStorage or use browser menu. Prevents nagging.

---

### 2. Login Bonus Confetti — Tier 1 (20 particles)
**Choice:** 20 particles for login bonus, matching Tier 1 (micro-celebration) from gamification skill.
**Why:** Login bonus is small daily moment — too much confetti devalues bigger celebrations (level-up = 50, streak milestone = 45). Keeping hierarchy clear preserves emotional payoff.

---

### 3. All Done Celebration — Tier 2 (50 particles)
**Choice:** 50 particles with green gradient card and dismiss button. Uses sessionStorage for once-per-session-per-day firing.
**Why:** Completing ALL daily tasks is peak engagement moment — deserves Tier 2. sessionStorage (not localStorage) fires once per browser session but re-triggers on close+re-open, feels correct for "welcome back, you already did it!" moment. Card auto-hides if tasks are undone.

---

### 4. No Sound Effects Added
**Choice:** Visual-only celebrations per user directive.
**Why:** Shari explicitly stated sound effects not a priority. Gamification skill includes sound guidelines but deferred.

---

### 5. manifest.json background_color Fix
**Choice:** Updated #f0f2f5 → #f7f7f7. Left theme_color at #58cc02.
**Why:** --bg in shared.css is #f7f7f7. Mismatch caused visible flash on PWA splash screen. theme_color already matches --primary.

---

---

### Safety Review of Existing Physical Tasks

| Task | Location | Risk Level | Note |
|------|----------|------------|------|
| 🚶 Go for a walk | app.html (both templates), admin.html | Low | Walking is generally safe |
| 🧘 Do some stretching | app.html LOW_TECH_BONUSES | Low | Could aggravate injuries if done improperly |
| 🧘 Do 5 minutes of stretching | app.html REGULAR_BONUSES, admin.html | Low | Same as above |
| 🎾 Tennis/pickleball 3x this week | admin.html DEFAULT_PERMANENT_WEEKLY | **Moderate** | **⚠️ High-impact sport, could cause injury (falls, sprains) without proper conditioning** |

**Recommendation:** Tennis/pickleball task is highest-risk item. All others are low-intensity activities. None require immediate removal, but Shari should confirm tennis/pickleball task is appropriate for target user.

---

---

## 🔍 OPTIMIZATION AUDIT (2026-05-01, Impa)

---

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

---

## 🧹 CODE OPTIMIZATION EXECUTION (2026-05-01)

---

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

---

# Session: 2026-05-06 Admin Fixes, Reset, Security Audit, Testing

---

## 1. Admin Portal Tab Fixes (2026-05-06, Urbosa)

**Status:** ✅ IMPLEMENTED

### Event Delegation Handler Scope
**Choice:** Moved event delegation click handler inside the `auth.onAuthStateChanged` callback.
**Why:** All functions referenced by the handler (`showTab()`, `openAddTaskModal()`, etc.) are defined inside the auth callback. Handler was at top-level scope, so all function calls were undefined.
**Pattern:** CSP-compliant data-action/data-arg event delegation requires the handler to be in the same scope as the functions it calls. If functions are closure-scoped, the listener must be too.
**Trade-off:** Event listener won't be registered until auth check completes. However, this is acceptable because the entire admin interface is gated behind auth.

### Tab Layout: Horizontal Scroll vs. Wrapping
**Choice:** Changed desktop tabs from wrapping (`flex-wrap: wrap`) to horizontal scroll (`flex-wrap: nowrap` + `overflow-x: auto`).
**Why:** 
- Prevents the 7th tab (Settings) from wrapping to its own row on narrower screens
- Keeps all navigation visible in one consistent location
- Mobile pattern already used horizontal scroll — extends to desktop for consistency
**Styling:** Reduced tab padding (12px→10px), added `flex-shrink: 0`, `white-space: nowrap`, `scrollbar-width: thin`
**Trade-off:** Users on very narrow screens will need to scroll horizontally. Preferable to janky wrapping at different breakpoints.

### showTab() Fallback Logic
**Choice:** Changed fallback check from `t.getAttribute('onclick')?.includes(tabId)` to `t.getAttribute('data-arg') === tabId`.
**Why:** Admin page uses data-action/data-arg attributes for CSP compliance — no onclick attributes exist. Corrected fallback properly matches the tab button's data-arg.

---

## 2. Critical Bug Fix: Cashout Balance Deduction (2026-05-06, Mipha)

**Status:** ✅ IMPLEMENTED  
**Priority:** P0 (Critical)

### The Bug
1. User requests cashout → balance stays the same
2. User could request multiple cashouts before admin processes
3. Admin marks as sent → balance gets deducted (only once)
**Impact:** User could exploit this to request multiple payouts from the same balance.

### The Fix
**Changed timing:**
- **OLD:** Balance deducted in `admin.js:approvePayoutRequest()` when admin marks as sent
- **NEW:** Balance deducted in `app.js:confirmCashout()` immediately when user requests

**Race condition fix:** Added double-tap prevention at function start: `if (cashoutBtn.disabled) return;`

### Why This Works
- Prevents exploitation via multiple cashout requests
- User sees correct balance right away (UX improvement)
- Admin sees accurate "currently owed" calculation
- Defense in depth: balance check + button state check

### Additional Changes
- **seed-stu.html:** Added clearing of `payoutRequests` collection, `userNotifications` collection, localStorage payout keys
- **app.html:** Removed Admin Mode section (no longer needed)

---

## 3. Security Audit — May 2026 (2026-05-06, Riju)

**Status:** ⏳ FINDINGS DOCUMENTED — DECISIONS PENDING OWNER INPUT  
**Scope:** Full privacy & security review

### Audit Summary
**12 findings** ranging from Critical to Info level.

**Critical (2):**
- F1: Email as Firestore doc ID (PII exposure, GDPR/CCPA concern)
- F2: localStorage as source of truth for points (client can modify balance)

**High (3):**
- F3: User content not escaped in innerHTML calls (XSS risk)
- F4: Profile ID enumeration vulnerability (sequential numeric IDs)
- F5: CSP unsafe-inline scripts in login.html (CSP migration incomplete)

**Medium (4):**
- Rate limiting on payout requests missing
- GDPR/CCPA data export endpoint missing
- Logging/validation hardening needed
- Session timeout patterns

**Low (3):**
- Email validation patterns
- Input sanitization examples
- Dark mode edge cases

### Key Decisions

**Decision 1: Email as Firestore Doc ID**
**Status:** ⚠️ RISK ACCEPTED (medium-term fix recommended)
**Recommendation:** Hash emails (SHA-256) for doc IDs, store plaintext in doc data only. Requires data migration.
**Team input:** Shari to decide priority vs. implementation cost.

**Decision 2: localStorage as Source of Truth for Points**
**Status:** ⚠️ KNOWN LIMITATION (by design for offline-first)
**Mitigation Options:**
1. Accept risk (family trust model — not a security app)
2. Make Firestore authoritative, validate all writes server-side
3. Add tamper detection (hash balance + salt in localStorage)
**Team input:** Revali/Shari to decide if trust model is acceptable.

**Decision 3: CSP unsafe-inline for Scripts**
**Status:** ⚠️ PARTIALLY FIXED (login.html still has unsafe-inline)
**Fixed:** app.html, admin.html already migrated to external JS + event delegation
**Remaining:** login.html still has inline `<script>` tags
**Mitigation:** Extract login.html inline scripts → js/login.js. Remove `'unsafe-inline'` from CSP.

### Positive Findings
- Cloud Functions already implement auth checks and input validation
- Firebase Auth properly configured (Google + email/password)
- Admin authorization flow is solid (Firestore-first, no localStorage fallback)
- Most user content safely escaped via `escapeHtml()` utility
- Service Worker and offline support don't introduce new attack surface

### Implementation Priorities

| Priority | Item | Owner | Effort |
|----------|------|-------|--------|
| **P0 (Critical)** | F1: Hash email in Firestore doc IDs | Daruk | High (migration script) |
| **P0 (Critical)** | F2: Implement localStorage tamper detection OR accept trust model | Revali + Daruk | Medium |
| **P1 (High)** | F3: Escape all user content in innerHTML calls | Mipha + Daruk | Low |
| **P1 (High)** | F4: Profile ID enumeration mitigation (add UUIDs or UUID v4) | Daruk | Low |
| **P1 (High)** | F5: Complete CSP migration (remove unsafe-inline) | Daruk | Low |

---

## 4. Settings Modal Redesign (2026-05-03, Sidon)

**Status:** ✅ IMPLEMENTED

### What Changed
1. **Removed Admin Mode section entirely** — Stuart (70s user) should never see admin controls
2. **Condensed sections** — merged related actions
3. **Visual grouping** — used background cards instead of hr separators for better hierarchy
4. **Improved touch targets** — all buttons meet 44px minimum
5. **Reduced explanation text** — senior users don't need "why" text for every action

### Information Architecture
**Top priority (kept):**
- Cloud sync status — reassures user data is safe
- Balance display — core engagement metric

**Middle priority (consolidated):**
- Suggest Task + Contact Developer merged into "Get Help" section
- Share Progress kept (social proof/bragging rights driver)

**Lower priority (removed):**
- "Refer a Friend" — removed. Family app (Stuart + Shari), not viral growth. Referring is low-value noise.

### Senior-Friendly Considerations
- Large balance display remains (32px, color contrast)
- Simplified language (no jargon)
- Fewer choices = less decision paralysis (5 sections → 3 cards)
- Clear visual hierarchy

### Trade-offs
**Removed "Refer a Friend":** This app is built for a specific user (Stuart) and his admin (Shari). Not a platform product. Referral adds UI noise without value. If growth becomes a priority, add dedicated "Invite" flow in main UI.

---

## 5. Purah Smoke Test Report (2026-05-01)

**Status:** ⏳ FINDINGS LOGGED — CRITICAL ISSUES REQUIRE FIXES  
**Scope:** CSP validation, onclick migration, SW cache, file integrity, dark mode, Apple Sign-In

### Critical Issues

🔴 **admin.html CSP missing `cloudfunctions.net` in connect-src**
- Issue: `js/admin.js:1268` calls `firebase.functions().httpsCallable('sendInviteEmail')`. Firebase callable functions hit `*.cloudfunctions.net` which is NOT covered by CSP.
- Impact: Admin invite emails will be BLOCKED by browser CSP. Silent failure.
- Fix: Add `https://*.cloudfunctions.net` to admin.html CSP `connect-src`.

🔴 **admin.html missing `</body>` and `</html>` closing tags**
- Issue: File ends with `<script src="js/admin.js"></script>` — no closing tags.
- Impact: Browsers auto-close, but invalid HTML. May cause issues with parsers, SEO tools, accessibility scanners. Indicates possible file truncation.
- Fix: Add `</body>\n</html>` at end.

### Medium Issues

🟡 **app.html does NOT load `js/dark-mode.js` — FOUC risk**
- Issue: Dark mode is in `js/app.js` (body-end), not in head. Flash Of Unstyled Content (light → dark flicker) on load for dark mode users.
- Fix: Add `<script src="js/dark-mode.js"></script>` to app.html `<head>`.

🟡 **admin.html has NO dark mode support at all**
- Issue: No `js/dark-mode.js` loaded, no dark mode logic in `js/admin.js`.
- Fix: Add `<script src="js/dark-mode.js"></script>` to admin.html head, ensure `css/admin.css` has dark mode styles.

🟡 **cdn.jsdelivr.net whitelisted but unused**
- Issue: app.html and admin.html include `cdn.jsdelivr.net` in `script-src` but don't use it. Unnecessary attack surface.
- Fix: Remove `https://cdn.jsdelivr.net` from both CSPs.

### Green Checks

🟢 **Zero remaining `onclick=` attributes** — all migrated to data-action event delegation  
🟢 **SW cache includes all external JS and CSS files**  
🟢 **Apple Sign-In properly configured**  
🟢 **Firebase SDK, Google Auth, EmailJS properly whitelisted**

### Gate Status

🔴 **NOT READY** — 2 critical bugs must be fixed before user testing.

**Required before deploy:**
1. Add `https://*.cloudfunctions.net` to admin.html CSP connect-src
2. Add `</body></html>` to end of admin.html
3. Add `<script src="js/dark-mode.js"></script>` to app.html head

**Recommended (non-blocking):**
4. Remove `cdn.jsdelivr.net` from app.html and admin.html CSP
5. Add dark-mode.js to admin.html head

# Decision: Security Fixes from Riju's Audit

**Author:** Daruk (Backend Dev)  
**Date:** 2025-07-26  

## Changes

1. **login.html CSP:** `'unsafe-inline'` removed from `script-src`. Safe because all JS is already external with event delegation.
2. **Profile IDs:** New profiles use `crypto.randomUUID()` instead of timestamp-based IDs. Existing profiles unchanged.
3. **innerHTML audit:** No changes needed — all user content already escaped via `escapeHtml()`.

## Follow-up Needed

- **firebase.json global CSP** still has `'unsafe-inline'` in `script-src`. This should be removed once all pages (app.html, admin.html, get-started.html, home.html, etc.) are verified to have no inline scripts. The per-page meta tags are currently the enforcement mechanism.

# Decision: Admin Portal Visual Polish

**Author:** Sidon (UI/UX Designer)  
**Date:** 2025-07-25  
**Scope:** css/admin.css + admin.html (visual only)

## What Changed
Full visual polish pass on admin portal. All changes are CSS-only (no JS, no ID/attribute changes). Key design decisions:

1. **Gradient buttons instead of flat** — matches app.html's Duolingo-inspired feel
2. **Card hover lift** — subtle interactivity signal, consistent with modern design language
3. **Modal backdrop blur + slide-up animation** — premium feel without performance cost
4. **Empty states use dashed borders** — signals "nothing here yet" vs "something broke"
5. **Stat box highlights get glow shadow** — key numbers (total points, total $) visually pop
6. **Table headers de-emphasized** — transparent bg, smaller font, so data rows take focus
7. **Top bar deeper gradient** — more visual weight, subtle glow overlay

## Team Impact
- **Daruk/Impa:** No backend or service worker changes needed. Purely presentational.
- **Riju:** No CSP changes. No new external resources. backdrop-filter is CSS-only.
- **All:** If adding new admin UI elements, follow gradient button pattern and 16px border-radius for stat boxes.
