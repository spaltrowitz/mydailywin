# Mipha — History

## Key Patterns & Corrections

### Escaping & Security
- **XSS strategy:** User-controlled data → `escapeHtml()`. Values in JS execution context (onclick) → `data-*` attributes + `addEventListener()`. Static HTML/hardcoded constants are safe for innerHTML.
- **innerHTML audit:** app.html had 18, login.html had 6 — only user-controlled data needs escaping. login.html needed its own `escapeHtml()` copy (now in js/utils.js).

### Architecture
- **Code consolidation (Option C):** Merged 3 divergent codebases → single app.html. Deleted habitrewards.html (zero unique features), redirected index.html. Migrated 5 features: TASK_HELP, filterForProfile(), task flags, completedEver tracking, help buttons.
- **getDefaultState():** Canonical default state merging 19 fields — used at init and catch block. Prevents schema drift.
- **Profile suffix pattern:** `(PROFILE_ID && !IS_LEGACY_PROFILE) ? '_' + PROFILE_ID : ''` — use everywhere for storage keys.
- **shared.css is single source of truth** for CSS variables. Pages should NOT redeclare `:root` vars unless overriding for dark mode.
- **Shared JS load order:** sw-init.js → Firebase SDK → firebase-config.js → utils.js → page scripts.

### Bug Fix Patterns
- `IS_LEGACY_PROFILE` must be defined as `PROFILE_ID === 'stu'` in every file that references it.
- All `JSON.parse` calls hardened with try/catch + sensible defaults. `saveState()` can silently fail on quota.
- `hr_state_stu` key was wrong — legacy profile check uses `hr_state` (unsuffixed).
- Event parameters in onclick: use optional chaining `event?.currentTarget`.
- Transient runtime properties prefixed with underscore (`_lastLevelName`) — not persisted to localStorage.

### UI/UX Patterns
- **Responsive:** 375px/768px/1024px breakpoints. All touch targets 44px min. CSS media queries only.
- **Celebrations:** Level-up via transient `_lastLevelName`, streak milestones at 7/14/30 days, 40-50 particle confetti with `prefers-reduced-motion` respect.
- **PWA install:** `beforeinstallprompt` handler with dismissible banner (localStorage flag).
- **Font:** Nunito via Google Fonts (`display=swap`). Quicksand was tried and reverted.
- **All Done card:** 50-particle confetti, sessionStorage fire-once-per-day.
- **Login bonus:** 20-particle confetti (Tier 1 micro-celebration), 5s auto-hide, pulse animation.

### Optimization (Impa audit)
- Deleted dead code: `rate()`, `submitSurvey()`, `currentRating` (-16 lines).
- Extracted `calculatePointsWithBonuses(basePoints)` (-20 lines) and `addPoints(amount)` (-10 lines).
- Net: -46 lines, 3 fewer duplication points.

## Cross-Project Frontend Knowledge (injected 2026-05-02)

### From MyDailyWin (Urbosa — Admin Dev)
- **Storage key mismatch was critical:** Dual-write needed in every write path. Canonical suffix pattern above.
- **innerHTML loop performance:** `innerHTML +=` in forEach is O(n²). Array.push() + join('') is O(n).
- **ARIA tab navigation:** `role="tablist"` + `aria-label` on container, `role="tab"` + `aria-selected` + `aria-controls` on buttons, `role="tabpanel"` on panels.
- **Responsive admin:** Scrollable horizontal tab strip (not hamburger). Tables use `overflow-x: auto`.
- **Task table dedup:** Extracted `renderTaskRow(task, category)` helper. Data-driven categories array.

### From EatDiscounted (Hockney — Frontend Dev)
- **SSE streaming:** AbortController on ReadableStream fetch. Abort-on-new-search, 30s timeout, cleanup on unmount.
- **Accessibility:** `aria-label` on inputs, `aria-live="polite"` + `role="status"` + `aria-busy` on results, `aria-current="page"` on active nav.
- **Error vs empty state:** Distinct UI states. 429 → rate-limit message. Red card + retry button.
- **Premium design:** 2px borders, hover shadows + scale(1.02-1.03), not-found at 60% opacity.

### From Slotted (Katara — Frontend Dev)
- **Security:** Hardcoded dev email (PII), credential console.logs, Firebase SW placeholder keys → build-time substitution.
- **npm overrides:** For deep transitive deps. Monitor upstream for removal.
- **TypeScript:** Type catch errors as `AxiosError` or `Error`, not `any`.

### From Scrunch (Frenchy — Frontend Dev)
- **Component decomposition:** Extract large components, wrap in `React.memo`, pass stable props.
- **Toast system:** React context `ToastProvider` + `useToast()`. Wire to all mutations.
- **setState-in-effect fix:** Render-time sync pattern. `data?.y ?? []` creates new arrays — `useMemo` when used as dependency.
- **React Query `placeholderData`:** Function searching caches for instant navigation.
- **Auth loading gate:** Never return null — `animate-pulse` placeholder.

### From HealthStitch (Kaylee — Frontend Dev)
- **CSS design system:** Custom properties, skeleton loaders, card hover elevation.
- **Sync freshness:** Green/amber/red by time, auto-refresh 60s, retry on error.
- **VITE_API_URL:** Shared config, single client module for all API calls.

## Owner Preferences (learned)
- Prefers emoji-based logo over custom SVG — simpler is better
- Dislikes split-color wordmark styling (gold "Win") — wants unified title
- Font should feel playful but professional — Quicksand fits (reverted from Nunito on home.html)
- Sound effects downgraded to P3 (nice-to-have)
- Purple accents are subtle tints (#faf5ff, #f3e8ff) — not competing with primary green

## Session Archive Summary

Mipha completed 15+ sessions spanning P0 bug fixes (IS_LEGACY_PROFILE, updateBalanceDisplay, JSON.parse hardening), modal accessibility (21 spans→buttons, 22 modals with ARIA), Phase 2 consolidation (5 features migrated from index.html→app.html with 149 insertions), XSS remediation (4 app.html + 6 login.html sites), font unification (Nunito + shared.css), responsive breakpoints, UX celebrations (level-up modals, streak milestones, enhanced confetti), PWA install prompt, home page design polish (logo, font, CTA fixes), and Impa optimization execution. Total impact: eliminated 3 divergent codebases, hardened all user-facing security, established accessibility standards, and delivered gamification UI.
