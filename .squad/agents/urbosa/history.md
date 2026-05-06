# Urbosa — History

## Key Patterns & Corrections

### Critical Bug Fixes
- **`saveState()` undefined** in admin.html — added function with dual-write to `hr_state_stu` for stu profile.
- **Storage key mismatch:** Admin wrote `hr_state`, app read `hr_state_stu`. `savePayment()` now uses `saveState()` instead of raw `localStorage.setItem`, deducts by amount (not zeroing balance).
- **Profile suffix canonical pattern:** `(PROFILE_ID && !IS_LEGACY_PROFILE) ? '_' + PROFILE_ID : ''` — used everywhere via extracted `getProfileSuffix()` helper.
- **Download functions** (`displayReports`, `downloadTaskResponses`, `downloadFeedbackLog`, `downloadReports`) all use profile suffix now.
- **Guard simplification:** `IS_LEGACY_PROFILE && PROFILE_ID === 'stu'` → just `IS_LEGACY_PROFILE` (redundant check).
- All `JSON.parse` calls hardened with try/catch (loadState, loadAdminData) with safe defaults.
- `openModal()`/`closeModal()` now null-check `getElementById()`.

### Code Deduplication
- **`getProfileSuffix()`:** Extracted helper replacing 10 inline suffix computations.
- **`formatDollar(amount)`:** Extracted `parseFloat(amount).toFixed(2)` replacing 7 call sites.
- **`renderTaskRow(task, category)`:** Replaced 4 identical forEach loops with data-driven categories array iteration.
- **`escapeCSV()`:** Unified CSV escaping across 3 download functions.
- **Dead code removed:** `approvePayoutRequest()` (deprecated wrapper), `shareApp()` (unreferenced).
- **innerHTML loop fix:** 4 forEach loops using `innerHTML +=` (O(n²)) → array.push() + join('') (O(n)).

### Payout Consolidation
- Merged `markPayoutSent()` + `approvePayoutRequestLocal()` → single `approvePayoutRequest()` with Firestore-first, localStorage-fallback.
- Merged `dismissPayoutRequest()` + `dismissPayoutRequestLocal()` → same graceful degradation pattern.

### Security
- **XSS remediation:** Added `escapeHtml()` and wrapped 25 innerHTML sites: task tables (4), levels (1), payments (2), payout requests (3), reports (4), admins (5), notifications (3). Static HTML and numeric values left unescaped.
- **Pattern:** Always use `escapeHtml()` when interpolating any variable into innerHTML.

### CSS & Responsive
- **shared.css is single source of truth** for CSS variables. admin.css extends it — never redeclare.
- **Nunito font** on admin.html and admin-guide.html (400/600/700/800 weights).
- **Responsive breakpoints in admin.css:** 1024px (tablet), 768px (scrollable tab strip, table horizontal scroll, stacked payments, near-fullscreen modals), 375px (single-column stat grid).
- **Scrollable tab strip** (not hamburger) keeps all 7 tabs visible. Tables use `overflow-x: auto`.
- Replaced 5 hardcoded `#58cc02` with `var(--primary)`, standardized border-radius to CSS variables.
- admin-guide.html inline CSS (108 lines) extracted to admin.css.

### Accessibility
- **ARIA tabs:** `role="tablist"` + `aria-label`, `role="tab"` + `aria-selected` + `aria-controls`, `role="tabpanel"` on all 7 content sections.
- `showTab()` manages `aria-selected` state alongside active class.

### Performance
- **displayStats() DOM batching:** Cached 9 element references, eliminates 11 separate lookups per call.

## Cross-Project Frontend Knowledge (injected 2026-05-02)

### From MyDailyWin (Mipha — User Dev)
- **XSS prevention:** `escapeHtml()` for HTML content, `data-*` + `addEventListener()` for JS execution context. Audited 24 innerHTML instances.
- **Modal accessibility:** 21 `<span>` → `<button>` with `aria-label`. 22 modals got `role="dialog"` + `aria-modal="true"`.
- **getDefaultState():** Canonical default merging 19 fields. Prevents schema drift.
- **Code consolidation (Option C):** 3 codebases → 1 (app.html). Single source of truth.
- **Celebration modals:** Transient `_lastLevelName`, streak milestones at 7/14/30, 40-50 particle confetti with `prefers-reduced-motion`.
- **Responsive:** 375px/768px/1024px. 44px touch targets. CSS only.
- **PWA install:** `beforeinstallprompt` handler with dismissible banner.

### From EatDiscounted (Hockney — Frontend Dev)
- **SSE streaming:** AbortController cleanup. Abort-on-new-search, 30s timeout.
- **Accessibility:** `aria-label` on inputs, `aria-live="polite"` + `role="status"`, `aria-current="page"`.
- **Error vs empty state:** Distinct UI states. 429 → rate-limit message.
- **Premium design:** 2px borders, hover shadows + scale transforms, not-found at 60% opacity.

### From Slotted (Katara — Frontend Dev)
- **Security:** Hardcoded dev email (PII), credential console.logs, Firebase SW → build-time substitution.
- **npm overrides:** For deep transitive deps. Monitor upstream.
- **TypeScript:** `err: any` → `AxiosError` or `Error`.

### From Scrunch (Frenchy — Frontend Dev)
- **Component decomposition:** Extract, `React.memo`, stable props.
- **Toast system:** `ToastProvider` + `useToast()`. Wire to all mutations.
- **setState-in-effect fix:** Render-time sync. `useMemo` for dependency array stability.
- **Auth loading gate:** Never return null — `animate-pulse` placeholder.

### From HealthStitch (Kaylee — Frontend Dev)
- **CSS design system:** Custom properties, skeleton loaders, sync freshness indicator.
- **VITE_API_URL:** Single client module for all API calls.

## Session Archive Summary

Urbosa completed 12+ sessions: P0 bug fixes (saveState, storage key mismatch, input validation, debug log removal), P1 defensive patterns (JSON.parse hardening, guard simplification), XSS remediation (25 innerHTML sites), font unification (Nunito + shared.css), responsive breakpoints (3-tier admin layout), code deduplication (getProfileSuffix 10 sites, formatDollar 7 sites, renderTaskRow, escapeCSV), payout function consolidation (Firestore-first pattern), ARIA tab navigation, displayStats DOM batching, and admin-guide CSS extraction. Net impact: -97 lines in final optimization wave, all admin patterns now follow single-source-of-truth conventions.
