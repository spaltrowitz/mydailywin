
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
