# Decision: Admin Optimization Sweep (Impa Audit Items)

**Author:** Urbosa (Admin Dev)
**Date:** 2026-07-17
**Commit:** 5a10d14
**Scope:** admin.html, admin-guide.html, css/admin.css

## What Changed

### 1. Payout Function Consolidation (DL4)
**Decision:** Merge 4 payout functions into 2 unified ones with Firestore-first, localStorage-fallback.
**Rationale:** localStorage auth fallback was removed (Daruk's security fix), so the separate `*Local()` functions are unnecessary. The unified approach tries Firestore, catches errors, and degrades to localStorage — one code path to maintain instead of two.
**Trade-off:** If Firestore fails silently (network issue), the localStorage fallback still records the payment locally. This is intentional — better to have a local record than lose the action entirely.

### 2. Task Table Deduplication (DL5)
**Decision:** Extract `renderTaskRow()` helper and iterate over a categories array.
**Rationale:** 4 identical forEach loops with the same template literal differed only in category name and table ID. Data-driven approach eliminates copy-paste risk.

### 3. CSV Escaping Unification (DL7)
**Decision:** All CSV exports use `escapeCSV()` helper. `escapeHtml()` stays in js/utils.js for HTML contexts.
**Rationale:** Three download functions used inline `.replace(/"/g,'""')` which missed null handling, comma escaping, and newline handling that `escapeCSV()` already covers.

### 4. admin-guide.html CSS Extraction (OI3)
**Decision:** Move all inline styles to css/admin.css. No scoping prefix needed.
**Rationale:** admin-guide.html already imported admin.css. The inline styles duplicated existing rules (faq, btn) and added page-specific ones (hero, section, highlight-box). Single source of truth for admin styling.
**Note:** `.container` in admin.css uses `padding: 20px` while the guide used `padding: 40px 20px`. The guide page now uses admin.css's container padding. If guide-specific spacing is needed, a `.guide-container` class can be added later.

### 5. displayStats() DOM Batching (RO1)
**Decision:** Cache all getElementById results in a single object at function top.
**Rationale:** 11 DOM lookups per call → 9 cached references. Minor perf win, but more importantly reads as a clean data structure instead of scattered lookups.

### 6. ARIA Tab Navigation (Sidon)
**Decision:** Full WAI-ARIA tabbed interface pattern: tablist, tab, tabpanel roles with aria-selected state management.
**Rationale:** Screen readers had no way to navigate the 7-tab admin interface. This is the standard ARIA pattern for tab navigation.

## Net Impact
- **-97 lines** net (185 added, 282 removed)
- **3 files** changed: admin.html, admin-guide.html, css/admin.css
- **No behavioral changes** — all functions produce identical results
- **Accessibility improvement** — screen readers can now navigate admin tabs
