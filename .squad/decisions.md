## 🔒 SECURITY AUDIT (2026-04-30, Riju)

### Decision: Firestore Rules Need Ownership Scoping (HIGH Priority)
**Status:** 📋 DECISION PENDING  
**Date:** 2026-04-30  
**Agent:** Riju (Security)  

**Context:** 
Four Firestore collections (`payoutRequests`, `userNotifications`, `userState`, `taskProposals`) currently allow any authenticated user to read/write/delete any document. The rules have TODO comments acknowledging this.

**Finding:** 
Any authenticated user can:
- Read/modify another user's balance (via `userState`)
- Create fake payout requests for any profile
- Delete another user's notifications
- Modify task proposals

**Impact:** 
🔴 CRITICAL if app is used by more than one family. Currently acceptable only because user base is a single household.

**Recommendation:** 
Scope collections to profile ownership before expanding user base. Blocker: Profiles must be created in Firestore (not just localStorage) for `isProfileOwner()` to work.

**Related:** Daruk's P0 Firestore rules overhaul (02-27) has helpers ready; blocked by get-started.html Firestore write.

**Owner:** Revali (decision), Daruk (implementation)

---

### Decision: Open Redirect in login.html Must Be Fixed
**Status:** 📋 DECISION PENDING  
**Priority:** P1 (HIGH)  
**Date:** 2026-04-30  
**Agent:** Riju (Security)  

**Context:** 
`login.html:355-377` reads `?redirect=` from URL params and navigates to it after auth without validation.

**Vulnerability:** 
Attacker could craft `login.html?redirect=https://evil.com` to phish credentials via social engineering.

**Fix:** 
Validate redirect URL is same-origin (same protocol + domain) before navigation. Use `new URL()` with try/catch or regex whitelist.

**Impact:** HIGH — phishing vector

**Owner:** Daruk (backend/security review)

---

### Decision: localStorage Auth Fallback is Bypassable
**Status:** 📋 DECISION PENDING  
**Priority:** P2 (MEDIUM)  
**Date:** 2026-04-30  
**Agent:** Riju (Security)  

**Context:** 
`admin.html:580-630` falls back to localStorage when Firestore is unavailable. Since localStorage is user-writable, a kid user could inject themselves as admin by writing to `hr_profile_admins_{profile}` or `hr_profile_{profile}`.

**Impact:** MEDIUM — requires browser DevTools knowledge, but bypasses trust boundary.

**Recommendation:** 
Remove localStorage fallback for admin authorization, or treat as read-only cache validated server-side.

**Related:** Urbosa auth flow; depends on Firestore profile creation (Daruk P0).

**Owner:** Revali (decision), Urbosa (implementation)

---

## 🎮 UX/DESIGN AUDIT (2026-04-30, Sidon)

### Decision 1: Add Sound Effects for Reward Moments
**Status:** 📋 DECISION PENDING  
**Priority:** P1  
**Date:** 2026-04-30  
**Agent:** Sidon (UX/Design)  

**Impact:** Gamification, reward psychology  

**Proposal:** 
Add audio feedback for task completion, spin wheel, level-up, achievement unlock, and streak milestones using Web Audio API (lightweight, no library needed). Include mute toggle in settings. This is the single biggest gap vs Duolingo-level experience.

**Owner:** Mipha (implementation) + Sidon (design guidance)

**Cross-Agent:** Works alongside Decision 2 (celebration modals) and Decision 8 (confetti enhancement).

---

### Decision 2: Create Celebration Modals for Major Moments
**Status:** 📋 DECISION PENDING  
**Priority:** P1  
**Date:** 2026-04-30  
**Agent:** Sidon (UX/Design)  

**Impact:** Gamification, retention  

**Proposal:** 
Level-up, streak milestones (7/14/30 days), and achievement unlocks should trigger full-screen celebration modals with enhanced confetti (40-50 particles), not just toasts. Currently these moments pass silently or with small toast only.

**Owner:** Mipha (implementation), Sidon (design)

**Depends on:** Decision 8 (enhanced confetti system).

---

### Decision 3: Unify Font Stack Across All Pages
**Status:** 📋 DECISION PENDING  
**Priority:** P2  
**Date:** 2026-04-30  
**Agent:** Sidon (UX/Design)  

**Impact:** Visual consistency  

**Current State:** 
- Nunito in app.html
- Quicksand in marketing pages (home.html, index.html)
- System fonts in admin.html

**Proposal:** 
Standardize on Nunito for all pages (app, admin, marketing, onboarding, login). This creates unified visual experience across platform.

**Owner:** Mipha (user pages), Urbosa (admin), Sidon (specification)

**Depends on:** Decision 4 (shared.css import standardization).

---

### Decision 4: Import shared.css Everywhere
**Status:** 📋 DECISION PENDING  
**Priority:** P2  
**Date:** 2026-04-30  
**Agent:** Sidon (UX/Design)  

**Impact:** Visual consistency, accessibility, code reuse  

**Current State:** 
shared.css exists with CSS variables, accessibility utilities, and focus states but is NOT imported by any user-facing page.

**Proposal:** 
Import shared.css in: app.html, index.html, habitrewards.html, admin.html, home.html, login.html, get-started.html. Eliminate duplicate CSS variable definitions across pages.

**Owner:** Mipha + Urbosa

**Note:** Removes three separate font-stack definitions if combined with Decision 3.

---

### Decision 5: Add Responsive Breakpoints to app.html and admin.html
**Status:** 📋 DECISION PENDING  
**Priority:** P2  
**Date:** 2026-04-30  
**Agent:** Sidon (UX/Design)  

**Impact:** Mobile experience  

**Current State:** 
- app.html: zero layout media queries; breaks at 375px, 768px, 1024px
- admin.html: zero layout media queries; tabs unscrollable on mobile

**Proposal:** 
Add breakpoints at 375px, 768px, and 1024px minimum. Admin tab bar needs horizontal scroll or collapse on mobile.

**Owner:** Mipha (app), Urbosa (admin)

---

### Decision 6: Add PWA Install Prompt Handler
**Status:** 📋 DECISION PENDING  
**Priority:** P2  
**Date:** 2026-04-30  
**Agent:** Sidon (UX/Design)  

**Impact:** PWA adoption, daily active users  

**Current State:** 
No `beforeinstallprompt` event listener exists anywhere.

**Proposal:** 
Add install prompt capture to home.html and app.html with custom "Install App" button. Track install metrics.

**Owner:** Mipha or Daruk

---

### Decision 7: Extend Dark Mode to All Pages
**Status:** 📋 DECISION PENDING  
**Priority:** P3  
**Date:** 2026-04-30  
**Agent:** Sidon (UX/Design)  

**Impact:** Visual consistency, user preference  

**Current State:** 
Dark mode only works in app.html. Navigating to login, home, admin, or onboarding pages breaks the dark experience.

**Proposal:** 
Extend dark mode CSS variables and toggle to all pages.

**Owner:** All frontend agents (Mipha, Urbosa)

**Depends on:** Decision 4 (shared.css import — enables consistent dark mode CSS).

---

### Decision 8: Enhance Confetti/Particle System
**Status:** 📋 DECISION PENDING  
**Priority:** P2  
**Date:** 2026-04-30  
**Agent:** Sidon (UX/Design)  

**Impact:** Gamification feel  

**Current State:** 
Confetti: 10 particles, straight-down trajectory. Unused keyframes (jackpot, coinDrop, goldShine) defined but never called.

**Proposal:** 
Increase to 40-50 particles with horizontal spread, rotation, varied sizes, and staggered spawn. Activate unused keyframes for celebration modals (Decision 2).

**Owner:** Mipha + Sidon

**Depends on:** Decision 1 (sound effects), Decision 2 (celebration modals) — part of gamification bundle.


---

## 2026-04-30 Security Fixes Session (Daruk, Mipha, Urbosa)

### Open Redirect Fix in login.html
**Status:** ✅ Implemented  
**Agent:** Daruk (Backend Dev)  
**Severity:** 🔴 CRITICAL → ✅ Fixed  

**Context:**
- `?redirect=` URL parameter was passed directly to `window.location.href` with no validation
- Attacker could craft `login.html?redirect=https://evil.com` to phish credentials after legitimate login

**Decision:**
Added `isSafeRedirect()` function that only allows:
1. Relative paths starting with `/` (rejects `//` protocol-relative URLs)
2. Absolute URLs matching `window.location.origin`

All other values silently rejected — no redirect occurs.

**Files changed:** login.html (lines 359-368)

---

### Firestore Rules Ownership Scoping
**Status:** ✅ Implemented  
**Agent:** Daruk (Backend Dev)  
**Severity:** 🔴 CRITICAL → ✅ Fixed  

**Context:**
- `payoutRequests`, `userNotifications`, `userState`, `taskProposals` only checked `request.auth != null`
- Any authenticated user could read/write/delete ANY other user's data in these collections

**Decision:**
All 4 collections now use `hasProfileAccess(profileId)` to verify the requesting user owns or administers the profile referenced by the document. Uses existing `isProfileOwner()` + `isProfileAdmin()` helpers.

**Caveat:** `hasProfileAccess()` requires the profile doc to exist in Firestore with `ownerEmail`. Until get-started.html is updated to write profiles to Firestore (not just localStorage), ownership checks will fail for localStorage-only profiles. This limitation is documented in the rules file and team history.

**Files changed:** firestore.rules (lines 96-175)

---

### Security Wave 2: Privilege Escalation & Injection Prevention
**Status:** ✅ Implemented  
**Agent:** Daruk (Backend Dev)  
**Date:** 2026-07-18  
**Severity:** 🔴 CRITICAL → ✅ Fixed  

#### Decision 1: No localStorage Fallback for Authorization
**Choice:** When Firestore is unavailable, deny admin access entirely rather than falling back to localStorage.

**Rationale:** localStorage is user-writable via DevTools. Any authorization check against it is bypassable. Firestore is the only trusted authority for admin status.

**Trade-off:** Admins cannot use the dashboard offline. Acceptable — admin operations (managing tasks, inviting admins, payouts) require Firestore anyway.

#### Decision 2: PROFILE_ID Allowlist Pattern
**Choice:** Validate with `/^[a-zA-Z0-9_-]+$/` — alphanumeric plus dash and underscore.

**Rationale:** PROFILE_ID is interpolated into localStorage keys (`hr_state_` + ID) and Firestore document paths. Without validation, crafted values could read/write arbitrary localStorage keys or target unintended Firestore paths.

**Coverage:** Pattern covers all existing profile IDs (e.g., `stu`, `emma-2024`, `test_profile`).

#### Decision 3: Aggressive localStorage Cleanup on Sign-Out
**Choice:** Clear all `hr_profile_*`, `hr_state*`, `hr_admin*`, `hr_pending_*`, `hr_user_profiles_*`, and `hr_additional_admins*` keys on sign-out.

**Rationale:** On shared devices (kid's tablet, school computer), the next user could inherit cached admin lists, profile data, or pending invites. Critical for a family/kid-oriented app.

**Trade-off:** Users signing back in re-fetch from Firestore. This is the correct behavior — Firestore is the source of truth.

---

### XSS Fixes: innerHTML with User-Controlled Data (app.html)
**Status:** ✅ Fixed  
**Agent:** Mipha (User Dev)  
**Date:** 2026-04-30  
**Severity:** 🔴 HIGH → ✅ Fixed  

**Problem:**
User-controlled data from Firestore and localStorage interpolated directly into innerHTML without escaping. Attacker could set profile name or task name to `<img onerror=alert(1)>` to execute arbitrary JavaScript.

**Fix Applied (4 sites):**
- `task.name` in daily task rows → wrapped with `escapeHtml()`
- `b.name` in tennis weekly bonus rows → wrapped with `escapeHtml()`
- `b.name` in regular weekly bonus rows → wrapped with `escapeHtml()`
- `notifId` in payment notification modal onclick → wrapped with `escapeHtml()`

**Files changed:** app.html

---

### XSS Fixes: innerHTML with User-Controlled Data (login.html)
**Status:** ✅ Fixed  
**Agent:** Mipha (User Dev)  
**Date:** 2026-04-30  
**Severity:** 🔴 HIGH → ✅ Fixed  

**Problem:**
Profile names and IDs interpolated into innerHTML and onclick handlers without escaping.

**Fix Applied (6 interpolations across 2 blocks):**
- Added `escapeHtml()` function (did not previously exist in login.html)
- Escaped `profile.name` in owned profile list
- Escaped `profile.name` in managed profile list
- Replaced 4x inline `onclick="openProfile('${profile.id}')"` with `data-profile-id` attributes + `addEventListener()`
- Replaced 2x inline `onclick="openAdmin(...)"` with data attributes + event handlers

**Strategy Decision:**
- For HTML text content: use `escapeHtml()`
- For values in JS execution context (onclick): use `data-*` attributes + `addEventListener()` (safer — value never enters JS context)
- Static HTML and hardcoded strings: no escaping needed

**Files changed:** login.html

---

### XSS Fixes: innerHTML Escaping in admin.html
**Status:** ✅ Implemented  
**Agent:** Urbosa (Admin Dev)  
**Date:** 2026-04-30  
**Severity:** 🔴 HIGH → ✅ Fixed  

**Problem:**
25 innerHTML assignments interpolating user-controlled data without escaping (task names, report comments, profile names, admin emails). localStorage tampering could inject scripts into admin dashboard.

**Fix Applied (25 sites):**
- Added `escapeHtml()` utility function
- Wrapped all user-controlled values before innerHTML insertion:
  - Task tables: 4x `t.name` (daily, bonus, permWeekly, weekly)
  - Levels: 1x `lvl.name`
  - Payments: 2x `p.month`, `p.notes`
  - Payout requests: 3x `userName`, `doc.id`, `r.id`
  - Reports: 4x `r.taskName`, `r.reason`, `r.comment`, `r.taskType`
  - Admins list: 5x `ownerName`, `currentUser.email`, `displayName`, `admin.email`, counts
  - Notifications: 3x `displayName`, `PROFILE_NAME`, `notification.id/email`

**Pattern:**
Always use `escapeHtml()` when interpolating any variable into innerHTML. Only numeric values and hardcoded HTML structures escape unescaped.

**Files changed:** admin.html (Commit d25fe40)

---

### User Priority Adjustment: Sound Effects
**Status:** 📌 Noted  
**Date:** 2026-04-30  
**From:** Shari Paltrowitz (via Copilot)  
**Context:** Sidon's UX audit recommended sound effects as P1 #1 improvement.

**Decision:**
Downgraded sound effects to P3 (nice-to-have, not required). Team should treat as optional enhancement, not core functionality.

**Rationale:** User feedback indicated existing visual feedback is sufficient; audio would be nice but not essential.

---

## 🎨 FONT & CSS CONSOLIDATION (2026-05-01, Mipha + Urbosa)

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

