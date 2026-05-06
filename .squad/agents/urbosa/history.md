# Urbosa — History

## Core Context

Urbosa completed 12+ sessions of admin portal development:
- P0 bug fixes (saveState undefined, storage key mismatch, input validation, debug logs)
- P1 defensive patterns (JSON.parse hardening, guard simplification, null-checks)
- XSS remediation across 25 innerHTML sites using `escapeHtml()` utility
- Code deduplication: extracted `getProfileSuffix()` (10 sites), `formatDollar()` (7 sites), `renderTaskRow()`, `escapeCSV()`
- Payout function consolidation: merged to Firestore-first pattern with localStorage fallback
- Performance: innerHTML O(n²) → O(n) batching, displayStats DOM caching (9 elements)
- Accessibility: full ARIA tab navigation (tablist, tab, tabpanel roles)
- CSS: font unification (Nunito), responsive breakpoints (375/768/1024), horizontally scrollable tabs
- Optimization wave: -97 net lines in final phase, all patterns follow single-source-of-truth conventions

## Key Patterns & Corrections

### Critical Bug Fixes
- **`saveState()` undefined** in admin.html — added function with dual-write to `hr_state_stu` for stu profile.
- **Storage key mismatch:** Admin wrote `hr_state`, app read `hr_state_stu`. `savePayment()` now uses `saveState()` instead of raw `localStorage.setItem`, deducts by amount (not zeroing balance).
- **Profile suffix canonical pattern:** `(PROFILE_ID && !IS_LEGACY_PROFILE) ? '_' + PROFILE_ID : ''` — used everywhere via extracted `getProfileSuffix()` helper.
- All `JSON.parse` calls hardened with try/catch (loadState, loadAdminData) with safe defaults.

### Code Deduplication
- **`getProfileSuffix()`:** Extracted helper replacing 10 inline suffix computations.
- **`formatDollar(amount)`:** Extracted `parseFloat(amount).toFixed(2)` replacing 7 call sites.
- **`renderTaskRow(task, category)`:** Replaced 4 identical forEach loops with data-driven categories array iteration.
- **`escapeCSV()`:** Unified CSV escaping across 3 download functions.

### Payout Consolidation
- Merged `markPayoutSent()` + `approvePayoutRequestLocal()` → single `approvePayoutRequest()` with Firestore-first, localStorage-fallback.

### Security
- **XSS remediation:** Added `escapeHtml()` and wrapped 25 innerHTML sites. Static HTML and numeric values left unescaped.
- **Pattern:** Always use `escapeHtml()` when interpolating any variable into innerHTML.

### CSS & Responsive
- **shared.css is single source of truth** for CSS variables. admin.css extends it — never redeclare.
- **Responsive breakpoints in admin.css:** 1024px (tablet), 768px (scrollable tab strip, table horizontal scroll, stacked payments), 375px (single-column stat grid).

### Accessibility
- **ARIA tabs:** `role="tablist"` + `aria-label`, `role="tab"` + `aria-selected` + `aria-controls`, `role="tabpanel"` on all 7 content sections.

## Cross-Project Frontend Knowledge (injected 2026-05-02)

### From MyDailyWin (Mipha — User Dev)
- **XSS prevention:** `escapeHtml()` for HTML content, `data-*` + `addEventListener()` for JS execution context.
- **Modal accessibility:** 21 `<span>` → `<button>` with `aria-label`. 22 modals got `role="dialog"` + `aria-modal="true"`.

### From EatDiscounted (Hockney — Frontend Dev)
- **SSE streaming:** AbortController cleanup. Abort-on-new-search, 30s timeout.
- **Accessibility:** `aria-label` on inputs, `aria-live="polite"` + `role="status"`, `aria-current="page"`.

## Recent Learnings

### 2026-05-06 — Tab Event Delegation Scope Bug Fix

#### Tab Click Handler Scoping (Critical)
**Problem:** All 7 admin tabs not responding to clicks.
**Root cause:** Event delegation handler at top-level scope, functions defined in auth callback closure.
**Solution:** Moved handler into auth callback (line ~1420).
**Pattern:** CSP-compliant event delegation requires handler in same scope as functions it calls.
**Files:** js/admin.js

#### Tab Layout: Horizontal Scroll
**Problem:** 7 tabs wrapped to 2 rows on desktop.
**Solution:** `flex-wrap: nowrap` + `overflow-x: auto`, reduced padding, added `flex-shrink: 0`.
**Result:** All 7 tabs in 1 row, scrolls horizontally if needed (matches mobile pattern).
**Design principle:** Horizontal scrolling tabs > hamburger menu. Visibility matters.
**Files:** css/admin.css (lines 160-187)

#### Tab Matching Fallback Fix
**Problem:** Fallback checked for non-existent `onclick` attribute.
**Solution:** Changed to `t.getAttribute('data-arg') === tabId`.
**Why:** Admin uses data-action/data-arg for CSP compliance.
**Files:** js/admin.js line 186
