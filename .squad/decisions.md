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
