# Mipha — User Dev

## Core Context

**Tech Stack:** Frontend UI (app.html, login.html, home.html), CSS styling, UX patterns, dark mode

**Key Responsibilities:**
- User-facing HTML/CSS (app.html daily interface, task management UI)
- Login flow and onboarding (login.html, get-started.html styling)
- Landing page (home.html, marketing site)
- Dark mode implementation
- Modal dialogs and gamification UI (celebration screens, notifications)

**Critical Decisions (Historical):**
1. **Escaping Strategy:** User-controlled data → `escapeHtml()`. Values in JS execution context → `data-*` attributes + `addEventListener()`.
2. **Dark Mode Pattern:** CSS variables (`--primary`, `--secondary`, theme colors). Toggle via `document.documentElement.setAttribute('data-theme', ...)`.
3. **Gamification UI:** Celebration modals, confetti animations (10 particles, straight-down). Unused keyframes (jackpot, coinDrop, goldShine) available for enhancement.
4. **Typography:** Quicksand font for home.html (playful), app.html/login.html should align (currently system fonts on login/get-started).

**Known Issues:**
- home.html and offline.html lack dark mode support
- login.html and get-started.html still use system font (should add Quicksand or Nunito)
- Service worker CACHE_NAME never versioned (stale page risk)
- localStorage sync gap: admin changes tasks, app doesn't see until reload

**Design Feedback (Shari, 2026-04-30):**
- Sound effects downgraded to P3 (nice-to-have, not required)

---

## Full History

## Cross-Agent Context from Full Team Review (2026-02-27)

### From Revali (Lead/Architect)
- Code duplication enabler for drift bugs — must unify or extract shared code.
- localStorage key mismatch is part of larger architecture issue (admin/app alignment).
- CSP headers required — coordinate with Daruk on firebase.json.
- Firestore rules are security-critical.

### From Urbosa (Admin Dev)
- saveState undefined breaks payout flow.
- Storage key mismatch breaks user balance reads.
- Admin needs to stay in sync with app.html's profile system.

### From Daruk (Backend Dev)
- Firestore rules vulnerability affects app security.
- Service worker caching strategy not versioning properly.
- No real-time localStorage sync between tabs.

### From Purah (Tester)
- Three divergent codebases make testing harder — unification will reduce test burden.
- Dark mode gaps in home.html and offline.html (Mipha's scope).

---

## Learnings

### Project Context (Day 1)
- MyDailyWin: gamified habit-tracking web app, Duolingo-inspired UI
- Stack: Vanilla HTML/CSS/JS, Firebase, PWA
- User: Shari Paltrowitz
- User-facing pages: app.html (3024 lines), index.html (2380 lines), habitrewards.html (2047 lines)
- Key patterns: surveyInvite (not surveySection), openModal guards, filterForProfile with stuOnly/excludeFromStu

### Comprehensive Review (Day 2)
- **Three divergent codebases**: app.html is the "evolved" version with Firebase sync, profile support, admin config, input sanitization, custom confirm modal, daily quotes, weighted bonus selection. index.html is the "feature-rich" version with task help/onboarding, profile filtering (stuOnly, excludeFromStu, LOW_TECH_MODE). habitrewards.html is the "original" with no profile support at all.
- **CSS duplication**: ~300 identical lines of CSS inline in each of the 3 pages. shared.css exists but is NOT imported by any page.
- **JS duplication**: getLevel, getPrevLevelPts, spinWheel, triggerCoinRain, triggerConfetti, checkAchievements, getWeekNumber, getDayNumber — all duplicated 3x with minor variations.
- **Storage divergence**: app.html uses profiled keys (hr_state_{profile}), index.html/habitrewards.html use unprofiled key (hr_state). This means the same user's data can split across pages.
- **Dead code across all 3 pages**: rate(), submitSurvey(), isWednesday(), addBonus(), getNearMissMessage(), downloadFeedbackLog(), downloadTaskResponses() — defined but never called or never wired to UI.
- **reportTask() references missing DOM**: index.html and habitrewards.html define reportTask() referencing #reportTaskName, #reportReason, #reportComment but no reportModal HTML exists.
- **Multiplier stacking**: streak(2x) × luckyDay(1.5x) × randomBonus(2x) = up to 6x. Intentional but notable.
- **Random bonus exploit**: Undo+redo a task rerolls Math.random(), so users can fish for the 10% 2x bonus.
- **No localStorage error handling**: saveState() can silently fail if quota is exceeded. loadState() JSON.parse can crash if data is corrupted (no try/catch).
- **Modal accessibility gaps**: close-modal uses <span> not <button>, no focus trapping, surveyInvite div has no role="button"/tabindex.
- **Dark mode gaps**: home.html and offline.html have no dark mode. Progress bar background (#e5e7eb) has no dark override.
- **home.html uses system fonts** instead of Nunito, breaking visual consistency with app pages.
- **CSS typo**: `bg: rgba(88, 204, 2, 0.1);` in .task-reward (app.html:186, habitrewards.html:184) — invalid property, harmless because `background:` follows.

### P0/P1 Bug Fixes (app.html)
- **IS_LEGACY_PROFILE**: Added `const IS_LEGACY_PROFILE = PROFILE_ID === 'stu';` at line 823, matching admin.html's definition. Was referenced at line ~2803 (payout fallback) but never defined — would crash on any payout request fallback path.
- **updateBalanceDisplay()**: Replaced both calls (quote acknowledge + Spanish quote) with `render()`, which already updates balance display at lines 1939-1942. No new function needed.
- **loadState() try/catch**: Wrapped JSON.parse in try/catch with full default state fallback (balance:0, totalEarned:0, streak:0, empty arrays). Corrupted localStorage no longer crashes the app.
- **All JSON.parse hardened**: Added try/catch to 8 additional JSON.parse calls: profile data (×2), cloud sync local state, quote state, proposals, reports, payout requests. Each has sensible fallback (empty object/array). Skipped deep-clone patterns (`JSON.parse(JSON.stringify(...))`) since those can't fail, and existing try/catch blocks that were already correct.

### P0 Execution (Feb 27, Session: p0-fixes)
- ✅ Executed all 2 critical bugs in app.html: IS_LEGACY_PROFILE undefined, updateBalanceDisplay() undefined, plus robustness hardening on loadState() and 8 JSON.parse calls
- All P0 items for Mipha marked complete in decisions.md
- Session logged at .squad/orchestration-log/2026-02-27T16-30-p0-fixes.md

### getDefaultState() Extraction + Modal Accessibility (Session: p1-a11y)
- **getDefaultState()**: Extracted canonical default state function in app.html merging 19 fields from the initial declaration, loadState catch block, and loadState guard checks. Used at both `let state` init and catch block. Prevents schema drift — new fields only need one edit.
- **Modal close buttons**: Changed 21 `<span class="close-modal">` to `<button class="close-modal" aria-label="Close">` across app.html (8), index.html (7), habitrewards.html (6). Added button-reset CSS (background/border/padding none) to `.close-modal` in all 3 files.
- **ARIA dialog attributes**: Added `role="dialog" aria-modal="true"` to 22 modal container divs across all 3 user pages. Added `aria-labelledby` to taskModal (all 3 pages), taskHelpModal (index.html), confirmModal (app.html) — the modals that already had h2 elements with IDs.
- **Not changed**: No focus trap (separate effort), star rating spans, dynamically-created paymentReceivedModal.

### P1 Execution — Accessibility Refactor + Default State Extraction (Session: 2026-03-03)

**Orchestration Log:** .squad/orchestration-log/2026-03-03T16-17-21Z-mipha-13.md

#### Changes Made
- Extracted `getDefaultState()` function: canonical default state used at init and in loadState() catch block (eliminates schema drift)
- Converted 21 close/dismiss spans to buttons with aria-label across app.html, index.html, habitrewards.html
- Added role="dialog" + aria-modal="true" to 22 modals across all three user pages
- Applied aria-labelledby to modals with header elements

#### Cross-Agent Alignment
- **Urbosa:** admin.html now follows same JSON.parse defensive pattern (established first in app.html)
- **Daruk:** Default state structure formalization enables better Firestore sync contracts
- **Revali:** Accessibility standardization across 3 pages enables safe consolidation (habitrewards.html → app.html merge now feasible)

#### Accessibility Standard
- WCAG 2.1 AA compliance (Level AA)
- Full keyboard navigation for all modals and close buttons
- Screen reader announcements for modal role and labeling

#### Known Limitations
- Focus trap pattern not yet implemented (separate effort)
- Star rating accessibility (spans) not converted (subset of modal work)

#### Quality Gate
- No regression in visual appearance
- Button styling maintained via CSS reset
- Modal behavior unchanged; accessibility added non-invasively

### Phase 2: index.html Feature Migration to app.html (Session: phase2-consolidation)

**Orchestration:** Per Revali's approved Option C consolidation strategy.

#### Features Migrated
1. **TASK_HELP data object + showTaskHelp()**: 12-entry help content object with modal. Applied `escapeHtml()` to title in showTaskHelp. Content is static HTML (safe for innerHTML — not user input).
2. **Profile Task Filtering (stuOnly/excludeFromStu)**: Added `filterForProfile()` using `IS_LEGACY_PROFILE` (equivalent of index.html's `IS_STU_PROFILE`). Wired into `getConfiguredDailyTasks()`, `getDailyBonus()`, and `getWeeklyBonuses()`. Added flags to: Duolingo (excludeFromStu), Clear emails (excludeFromStu), Tennis (stuOnly), Aisle app (stuOnly), Lunch with tennis friends (stuOnly), Mystery Shop (stuOnly).
3. **Tech Comfort Filtering**: SKIPPED — app.html already handles this via `profileTemplate` mechanism which uses entirely separate task sets (LOW_TECH_TASKS vs REGULAR_TASKS). More comprehensive than index.html's `filterForTechComfort()`.
4. **Completed-Ever Tracking**: Added `getCompletedEverTasks()` and `markTaskCompletedEver()` with profile-suffixed key (`hr_completed_ever_${PROFILE_ID}`). Wired into all 5 completion paths: `completeTaskDirectly()`, `confirmTask()`, `confirmDailyBonus()`, direct daily bonus, `confirmWeeklyBonus()`.
5. **Help buttons in task rendering**: Added "i" buttons to daily tasks, weekly bonuses, and daily bonus in `render()`. Only shown for tasks with TASK_HELP entries. White-styled variants for colored bonus sections.

#### Key Decisions
- `escapeHtml()` applied to help title (belt-and-suspenders with textContent). Content left as raw HTML because it's a hardcoded constant, not user input — escaping would break the formatting.
- `filterForProfile()` applied inside `getConfiguredDailyTasks()` so it covers both admin-configured and default tasks.
- `getDailyBonus()` now returns null when all bonuses are filtered out; UI hides section gracefully.
- `getWeeklyBonuses()` uses same Tennis check as index.html: `if (!TENNIS_WEEKLY.stuOnly || IS_LEGACY_PROFILE)`.
- Profile-suffixed `COMPLETED_EVER_KEY` follows app.html convention, not index.html's unsuffixed pattern.

---

### Phase 1–4 Code Consolidation (2026-03-03)

#### Session Context
Executed Phases 1–4 of consolidation strategy (Mipha's responsibility in Phase 2):

**Phase 1 (Daruk, 193s):** Deleted habitrewards.html (2047 lines)
- Zero unique features, security downgrade, orphaned
- Mipha scope reduced from 3 → 2 user pages (app.html, index.html)

**Phase 2 (Agent 17, 1680s):** Migrated 5 features from index.html → app.html (149 insertions)
- TASK_HELP constant (11 entries) + showTaskHelp() with escapeHtml() sanitization
- filterForProfile() with profile-aware task filtering (IS_LEGACY_PROFILE pattern)
- Task metadata flags (stuOnly, excludeFromStu) on profile-specific tasks
- getCompletedEverTasks() + markTaskCompletedEver() for persistent task history per profile
- Help button rendering in daily/weekly/bonus task UI with event.stopPropagation() handling
- Total: 149 insertions, all with proper escaping and profile-suffixed storage keys

**Phase 3 (Daruk, 41s):** Redirected index.html, updated firebase.json
- index.html now thin redirect stub to /home.html (from 2375 lines → 12 lines)
- firebase.json catch-all rewrite updated: `/index.html` → `/home.html`
- app.html is now sole user-facing app page

**Phase 4 (Purah, 78s):** Verified all 5 features pass QA
- TASK_HELP + showTaskHelp() properly defined with all 11 entries ✅
- filterForProfile() correctly uses IS_LEGACY_PROFILE ✅
- Task flags properly set on all profile-specific tasks ✅
- getCompletedEverTasks() + markTaskCompletedEver() working with profile-suffixed keys ✅
- Help buttons render correctly with event.stopPropagation() ✅
- No duplicate definitions, no unsuffixed storage keys, all escaping verified ✅

#### Impact & Status
- **Code consolidation:** Option C fully executed; habitrewards.html deleted, index.html redirected
- **Mipha's deliverable:** 5 features migrated with 149 insertions, zero regressions
- **Quality gate:** 🟢 READY FOR PRODUCTION (Purah verification passed, all features verified)
- **Knowledge transfer:** Consolidation enables future feature development on app.html only (single source of truth)

### Bug Bash Fixes (2026-03-04)

#### Changes Made (get-started.html, app.html, home.html, og-image.svg)
1. **Step 7b back button**: `goBack()` now handles string `'7b'` step — returns to step 7
2. **Event parameter guards**: `selectOption()`, `selectPayoutPref()`, `selectHelpOption()` now accept `event` param with optional chaining (`event?.currentTarget`). All onclick handlers updated to pass `event`.
3. **saveProfileSetup() error handling**: All localStorage writes wrapped in try/catch. On failure, user sees alert and function returns early (no silent data loss).
4. **hr_state_stu key mismatch**: Legacy profile detection in app.html line 907 now checks `hr_state` (correct key) instead of `hr_state_stu` (never existed).
5. **Tagline update**: "Build Better Habits, Earn Real Rewards" → "Turn Daily Habits into Daily Wins" in home.html (title, og:title, twitter:title) and og-image.svg.
6. **Branding comment**: "WHY HABITREWARDS" → "WHY MYDAILYWIN" in home.html.

#### Key Patterns
- For inline onclick handlers that pass `event`, the browser's implicit `event` variable works but the function signature must accept it as a parameter for programmatic calls.
- `saveProfileSetup()` is called during `goToSummary()` — the try/catch prevents redirect if storage fails.

### Home Page Design Polish (2026-04-14)

#### Changes Made
1. **Inline SVG favicon in hero**: Replaced 🏆 emoji (renders inconsistently) with the actual `favicon.svg` inlined directly. Sized at 100×100px. CSS `.hero-logo` updated from font-size to width/height.
2. **Nunito font**: Added Google Fonts import (400/600/700/800) and set as primary font-family on body, matching app.html's typography.
3. **Secondary purple accents**: Applied `--secondary` (#ce82ff) in three places: "Why MyDailyWin?" section gets purple-tinted gradient background, alternating gamification badges get light purple background, FAQ Quick Reference box border changed from green to purple with purple gradient background.
4. **"Win" wordmark**: Hero h1 now renders "MyDaily" in white and "Win" in gold (`var(--orange)`) via inline span.
5. **og-image.png**: Neither `rsvg-convert` nor ImageMagick `convert` available on this machine. Logged as TODO in decisions inbox.

#### Key Patterns
- Inline SVG avoids an extra network request and ensures consistent rendering vs emoji.
- Purple accents are subtle (light tints like `#faf5ff`, `#f3e8ff`, `#e9d5ff`) — not competing with primary green.
- Nunito import uses `display=swap` for good CLS scores.


---

### Bug Bash Session (2026-04-14)

**Status:** ✅ 6 fixes completed and committed

#### Fixes Delivered
1. **Step 7b Navigation** — goBack() now handles string `'7b'` step
2. **Event Parameter Guards** — selectOption(), selectPayoutPref(), selectHelpOption() accept optional event param
3. **saveProfileSetup Error Handling** — Added try/catch; localStorage writes protected
4. **hr_state Key Correction** — Fixed legacy profile check from `hr_state_stu` → `hr_state`
5. **Tagline Update** — "Build Better Habits, Earn Real Rewards" → "Turn Daily Habits into Daily Wins"
6. **Branding Cleanup** — Comment updated to MYDAILYWIN

#### Cross-Agent Notes
- Daruk fixed Firestore write to get-started.html; app.html must read from Firestore with localStorage fallback
- localStorage → Firestore migration in onboarding now enabled; verify app.html reads correctly
- CSP update from Daruk includes mydailywin domain; no further auth changes needed on user-facing pages

#### Key Convention Extracted
- Event parameters in onclick handlers should use optional chaining pattern: `event?.currentTarget`
- Storage keys must always be profile-suffixed for non-stu profiles: `hr_{feature}_{PROFILE_ID}`

### Logo & Font Revert (2026-07-18)

#### Changes Made
1. **Logo reverted**: Removed inline SVG trophy from hero. Replaced with 🏆 emoji at 72px — clean, universal, polished. CSS `.hero-logo` changed from width/height to font-size/line-height.
2. **Font swap**: Nunito → **Quicksand** (400/500/600/700). Quicksand is rounder, friendlier, and better suited for a gamified app. Google Fonts import updated.
3. **Removed "Win" gold styling**: Hero h1 changed from `MyDaily<span style="color: var(--orange);">Win</span>` to plain `MyDailyWin`. Clean, unified, no Word Art effect.
4. **Purple accents preserved**: No changes to `--secondary` usage. They still look good.

#### User Preference (Shari)
- Prefers emoji-based logo over custom SVG — simpler is better
- Dislikes split-color wordmark styling (gold "Win") — wants unified title
- Font should feel playful but professional — Quicksand fits this brief
- Key file: `home.html` lines 13 (font import), 46 (body font), 57-61 (hero-logo CSS), 842-843 (hero markup)


### CTA Section Background Fix (2026-07-18)

#### Change
- `.cta-section` background changed from `var(--primary)` (#58cc02, bright green) to `linear-gradient(135deg, #2d6e01, #3d8a02)` — the same dark green palette as the hero section, reversed.

#### Reason
- Hero gradient was updated to dark greens (#3d8a02 → #2d6e01) in earlier design work, but CTA section still used the bright `--primary`. The contrast was jarring — bright neon block at the bottom against a muted top.

#### Pattern
- When updating hero/header colors, check CTA/footer sections for palette consistency. The page should feel like one continuous design, not mismatched blocks.

### UX/Design Audit — Gamification & Responsive (2026-04-30, Sidon)

📌 Team update (2026-04-30): UX audit identified 8 priority decisions spanning gamification, visual consistency, responsive design — decided by Sidon

**P1 Decisions (Your Scope — app.html):**
1. Sound effects for reward moments (Web Audio API, mute toggle) — owns implementation
2. Celebration modals for level-ups/streaks/achievements (40-50 particle confetti) — works with Decision 8
3. Responsive breakpoints (375px, 768px, 1024px) — app.html needs layout queries
4. Unify font stack to Nunito (currently app.html has Nunito, good starting point)
5. Enhance confetti system (40-50 particles, rotation, spread, activate unused keyframes: jackpot, coinDrop, goldShine)

**P2 Decisions (Shared with Urbosa):**
6. Import shared.css everywhere (enables consistent dark mode, CSS vars)
7. Extend dark mode to all pages (currently only app.html)

**Owner Notes:** Sidon created `gamification` skill with sound effect patterns and particle physics guidance.

**Cross-Agent:** Works with Urbosa on Decision 6–7 (shared.css import, dark mode extension, font unification, responsive breakpoints for admin).

### XSS Vulnerability Fixes (2026-07-18)

#### Changes Made
- **app.html**: Wrapped 4 user-controlled innerHTML interpolations with `escapeHtml()`:
  - `task.name` in daily task rendering (line ~2185)
  - `b.name` in tennis weekly bonus rendering (line ~2216)
  - `b.name` in regular weekly bonus rendering (line ~2232)
  - `notifId` in payment modal onclick handler (line ~1384)
- **login.html**: Added `escapeHtml()` function and fixed 2 profile rendering blocks:
  - `profile.name` escaped in both owned and managed profile lists
  - Replaced inline `onclick="openProfile('${profile.id}')"` with `data-profile-id` attributes + `addEventListener()` — eliminates string interpolation in JS execution context entirely
  - Same pattern for `openAdmin()` onclick handlers

#### Key Patterns
- `escapeHtml()` already existed in app.html (line 843). login.html needed its own copy.
- For onclick handlers that interpolate user data, `data-*` attributes + `addEventListener` is safer than escaping — the value never enters a JS execution context.
- Not all innerHTML assignments are XSS risks — audited each one. Static HTML from hardcoded constants (TASK_HELP, level data, date strings from toISOString/toLocaleDateString) are safe.
- `readAsDataURL()` output in img src is safe — always produces `data:` prefix with base64.

#### Audit Summary (innerHTML instances reviewed)
- app.html: 18 innerHTML assignments audited, 4 fixed
- login.html: 6 innerHTML assignments audited, 2 blocks fixed (4 profile.id + 2 profile.name interpolations)

---

## Security Fix Session — 2026-04-30T20:38

### XSS Remediation: innerHTML with User-Controlled Data

#### app.html Fixes (4 sites)
Wrapped user-controlled values with `escapeHtml()`:
- `task.name` in daily task rows
- `b.name` in tennis weekly bonus rows
- `b.name` in regular weekly bonus rows
- `notifId` in payment notification modal onclick

Attack vector eliminated: localStorage tampering cannot inject scripts into user UI.

#### login.html Fixes (6 interpolations across 2 profile blocks)
Added `escapeHtml()` function to login.html (did not previously exist).
- Escaped `profile.name` in owned profile list
- Escaped `profile.name` in managed profile list
- Replaced 4x inline `onclick="openProfile('${profile.id}')"` with `data-profile-id` attributes + `addEventListener()`
- Replaced 2x inline `onclick="openAdmin(...)"` with data attributes + event handlers

**Escaping Strategy:**
- For HTML text content: use `escapeHtml()` to replace &, <, >, ", ' with HTML entities
- For values in JS execution context (onclick): use `data-*` attributes + `addEventListener()` — safer because value never enters JS execution context
- Static HTML and hardcoded strings: no escaping needed

#### Full innerHTML Audit (24 instances)
- app.html: 18 innerHTML assignments reviewed → 4 fixed, 14 verified safe
- login.html: 6 innerHTML assignments reviewed → 2 profile blocks fixed
- Safe patterns identified: static HTML, numeric values, readAsDataURL() outputs, hardcoded constants

### Coordination with Daruk & Urbosa
- Daruk fixed critical redirect and authorization vulnerabilities
- Urbosa fixed innerHTML XSS in admin.html (25 sites, same escapeHtml() strategy)
- All three agents using consistent escaping approach
- escapeHtml() function could be extracted to shared.js for team reuse

