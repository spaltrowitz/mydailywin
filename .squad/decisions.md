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

