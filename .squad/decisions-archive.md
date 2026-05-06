# Team Decisions

_Canonical decision ledger. Managed by Scribe. Agents write to .squad/decisions/inbox/ — Scribe merges here._

---

## 🔴 CRITICAL BUGS (P0 — Fix Immediately)

### Bug 1: saveState() undefined in admin.html
**Status:** ✅ FIXED (Feb 27, P0 session)  
**Agents:** Urbosa, Purah  
**Severity:** 🔴 CRITICAL — Runtime crash  

**Context:**
- markPayoutSent() (line 1085) and approvePayoutRequestLocal() (line 1158) both call `saveState(state)` but this function does not exist in admin.html.
- Only loadState() is defined (line 728).
- **Impact:** Approving ANY payout crashes silently and the user's balance is never deducted from localStorage.

**Solution Implemented:**
Added `saveState(state)` function with dual-write support for stu profile. Includes `hr_state` and `hr_state_stu` writes for legacy compatibility.

**Owner:** Urbosa (Admin Dev)  
**Blockers:** None

---

### Bug 2: Admin↔User Storage Key Mismatch for "stu" Profile
**Status:** ✅ FIXED (Feb 27, P0 session)  
**Agents:** Revali, Urbosa, Purah  
**Severity:** 🔴 CRITICAL — Data splits between admin/app  

**Context:**
- admin.html:672 uses `STORAGE_KEY = 'hr_state'` for stu (IS_LEGACY_PROFILE flag)
- app.html:816 uses `STORAGE_KEY = 'hr_state_stu'` for `PROFILE_ID === 'stu'`
- The dual-write pattern exists in resetUserBalance() (admin.html:1502-1505) but is **missing** from savePayment() (admin.html:1365) and markPayoutSent() (admin.html:1085).
- **Impact:** Admin records a payment to `hr_state`, but app reads from `hr_state_stu` — balance stays stale in the user app.

**Solution Implemented:**
`saveState()` now performs dual-write for stu profile: writes to both `hr_state` (legacy) and `hr_state_stu` (profiled). `savePayment()` uses new `saveState()` function instead of raw localStorage.setItem(), ensuring both keys stay in sync. Pattern: `(PROFILE_ID && !IS_LEGACY_PROFILE) ? '_' + PROFILE_ID : ''`.

**Owner:** Urbosa (Admin Dev) with Revali (Lead)  
**Blockers:** None  
**Cross-Agent Impact:** Affects Mipha (user app data consistency) and Daruk (data contract).

---

### Bug 3: displayReports() Uses Unsuffixed Key
**Status:** ✅ FIXED (Feb 27, P0 session)  
**Agents:** Urbosa, Purah  
**Severity:** 🔴 CRITICAL — Wrong profile's data shown  

**Context:**
- admin.html:1183 reads `localStorage.getItem('hr_reports')` (hardcoded, no suffix).
- For non-stu profiles, app writes to `hr_reports_{profile}`.
- Clear (line 1490) and Download (line 1400) functions correctly use the suffix.
- **Impact:** Non-stu profiles see stale/empty reports on Elevenboard, even though reports exist (under suffixed key).

**Solution Implemented:**
`displayReports()` now uses consistent suffix pattern: `const suffix = PROFILE_ID && !IS_LEGACY_PROFILE ? '_' + PROFILE_ID : '';` matching `downloadAllData()`.

**Owner:** Urbosa (Admin Dev)  
**Blockers:** Bug 2 (storage key alignment) — NOW FIXED

---

### Bug 4: downloadTaskResponses() and downloadFeedbackLog() Use Unsuffixed Keys
**Status:** ✅ FIXED (Feb 27, P0 session)  
**Agents:** Urbosa, Purah  
**Severity:** 🔴 CRITICAL — CSV exports empty for non-stu profiles  

**Context:**
- admin.html:1384 `downloadTaskResponses()` reads `hr_completed_log` (no suffix)
- admin.html:1392 `downloadFeedbackLog()` reads `hr_feedback` (no suffix)
- admin.html:1412 `downloadAllData()` does it correctly WITH suffix.
- **Impact:** CSV exports for non-stu profiles export empty data.

**Solution Implemented:**
Updated both `downloadTaskResponses()` and `downloadFeedbackLog()` to use profile suffix pattern, matching `downloadAllData()`.

**Owner:** Urbosa (Admin Dev)  
**Blockers:** Bug 2 — NOW FIXED

---

## 🔓 CRITICAL SECURITY (P0 — Firestore Rules)

### Firestore Rules: Wide-Open Authentication (auth-only, not user-scoped)
**Status:** ✅ FIXED (Feb 27, P0 session)  
**Agents:** Revali, Daruk  
**Severity:** 🔴 CRITICAL — Security F grade  

**Context:**
- Every collection uses `allow read/write: if request.auth != null`.
- ANY authenticated user can read/write ANY other user's data, payouts, profile, task responses.
- Example: User A can modify User B's balance or payout requests.

**Solution Implemented:**
Complete Firestore rules rewrite with document-ownership scoping:
- Added 3 helper functions: `isProfileOwner()`, `isProfileAdmin()`, `hasProfileAccess()`
- Scoped `profiles/{profileId}` to creator (`ownerEmail == auth.token.email`)
- Scoped `profiles/{profileId}/admins/{email}` and `/notifications/{id}` subcollections to profile access
- Fixed `taskProposals` from `allow create: if true` (unauthenticated) to authenticated + field validation
- Added required-field type validation on all create operations
- Left TODO comments for collections blocked on get-started.html Firestore integration (see blockers)

**Blockers:** Profile docs currently created in localStorage only (get-started.html), not Firestore. To fully lock down `payoutRequests`, `userNotifications`, `userState`, `taskProposals` read/update/delete, get-started.html must write profile with `ownerEmail` to Firestore during onboarding.

**Owner:** Daruk (Backend Dev) with Revali (Lead)  
**Follow-up:** Update get-started.html to write profile docs to Firestore (separate P1 task).

---

## 🏗️ ARCHITECTURE & CODE QUALITY (P1)

### Code Duplication: Three Divergent User Pages Sharing ~70% Code
**Status:** Identified, Awaiting Strategy Decision  
**Agents:** Revali, Mipha  
**Severity:** 🟡 HIGH — Duplication enables drift bugs  

**Context:**
- app.html, index.html, habitrewards.html share ~290 lines of CSS and ~500 lines of JS.
- app.html is most evolved (Firebase sync, input sanitization, custom modals).
- index.html has task help system and profile filtering that app.html lacks.
- habitrewards.html is mostly app.html copy.
- Bug fixes in one don't propagate; feature gaps vary by page.

**Decisions Needed:**
1. **Consolidation Strategy:** Which approach?
   - **Option A:** Designate app.html as single source, deprecate others (fastest, loses features).
   - **Option B:** Extract shared code into modules (more work, keeps features).
   - **Option C:** Merge index.html's features into app.html, then deprecate others (recommended).

2. **shared.css Usage:** shared.css exists but is NOT imported by any user-facing page. All accessibility utilities are unused.
   - Decision: Import shared.css into app/index/habitrewards HTML files and remove inline duplicates.

**Owner:** Revali (Lead) with Mipha (User Dev)  
**Recommendation:** Option C (merge features into app.html, then redirect index.html and habitrewards.html).  
**Timeline:** P1 — required for codebase maintainability.

---

### Storage Key Divergence: app.html vs index.html/habitrewards.html
**Status:** Identified, Awaiting Fix  
**Agents:** Revali, Mipha  
**Severity:** 🟡 HIGH — User data splits between pages  

**Context:**
- app.html uses `hr_state_{profile}` (profiled key).
- index.html and habitrewards.html use `hr_state` (no suffix).
- If user opens app.html, then switches to index.html, they see different state.

**Decision:**
All pages must use same key derivation. Align on:
```javascript
let PROFILE_ID = 'default'; // or loaded from localStorage
let STORAGE_KEY = PROFILE_ID === 'stu' && IS_LEGACY_PROFILE ? 'hr_state' : 'hr_state_' + PROFILE_ID;
```

**Owner:** Mipha (User Dev)  
**Blockers:** Code consolidation strategy decision.

---

### Undefined Function: updateBalanceDisplay() in app.html
**Status:** Identified, Awaiting Fix  
**Agents:** Mipha  
**Severity:** 🔴 HIGH — Runtime crash  

**Context:**
- app.html:1838 calls `updateBalanceDisplay()` but function is never defined.
- Will throw ReferenceError at runtime.

**Decision:**
Either define the function (update DOM display of balance) or replace call with existing updateDisplay() or equivalent.

**Owner:** Mipha (User Dev)

---

### Modal Accessibility: close <span> not <button>, no focus trap
**Status:** Identified, Awaiting Fix  
**Agents:** Mipha  
**Severity:** 🔴 HIGH — WCAG 2.1 AA non-compliance  

**Context:**
- All modals use `<span class="close" onclick>` for close button.
- Not keyboard-accessible (no role="button", no tabindex).
- No focus trap — Tab can escape modal to background.
- Affects: app.html, index.html, habitrewards.html.

**Decision:**
1. Replace close `<span>` with `<button>` + aria-label.
2. Add focus trap: Tab should cycle within modal only.
3. Add aria-modal="true" to modal container.

**Owner:** Mipha (User Dev)

---

### No Content Security Policy (CSP) Headers
**Status:** Identified, Awaiting Fix  
**Agents:** Revali, Daruk  
**Severity:** 🟡 HIGH — XSS vulnerability  

**Context:**
- No CSP headers configured in firebase.json hosting config.
- 73+ innerHTML usages + user-controlled data = XSS risk.

**Decision:**
Add CSP headers to firebase.json:
```json
"headers": [
  { "source": "**", "headers": [{"key": "Content-Security-Policy", "value": "..."}] }
]
```

**Owner:** Daruk (Backend Dev)

---

### Service Worker Cache Never Versions
**Status:** Identified, Awaiting Fix  
**Agents:** Daruk, Mipha  
**Severity:** 🟡 HIGH — Users get stale cached pages indefinitely  

**Context:**
- sw.js:6 `CACHE_NAME = 'habitrewards-v1'` — never changes.
- Service worker serves cache-first; users stuck on old version forever.

**Decision:**
Bump version on each deploy (e.g., `habitrewards-v2`) or use content hashing.

**Owner:** Daruk (Backend Dev)

---

## 🔧 IMPORTANT ISSUES (P1-P2)

### Dead Cloud Function: sendAdminInvite
**Status:** Identified, Awaiting Decision  
**Agents:** Daruk, Urbosa  
**Severity:** 🟡 MED — Dead code + security concern  

**Context:**
- functions/index.js contains sendAdminInvite (SendGrid-based) but it's NEVER called.
- admin.html uses EmailJS (client-side) instead.
- SendGrid keys wasted; Cloud Function approach better (server-side keys).

**Decision Needed:**
Use Cloud Function OR EmailJS? Recommendation: Migrate to Cloud Function (secure, rate-limiting capable). Delete EmailJS code and unused SendGrid function.

**Owner:** Daruk (Backend Dev)

---

### Missing Caching Headers in firebase.json
**Status:** Identified, Awaiting Fix  
**Agents:** Daruk  
**Severity:** 🟡 MED — Performance hit  

**Context:**
- No Cache-Control headers for static assets.
- Browsers re-fetch CSS, JS, SVG, images every load.

**Decision:**
Add to firebase.json:
```json
"headers": [
  { "source": "**/*.@(svg|ico|jpg|png)", "headers": [{"key": "Cache-Control", "value": "max-age=31536000, immutable"}] },
  { "source": "**/*.@(css|js)", "headers": [{"key": "Cache-Control", "value": "max-age=86400"}] }
]
```

**Owner:** Daruk (Backend Dev)

---

### Firestore Rules: No Data Validation
**Status:** Identified, Awaiting Fix  
**Agents:** Daruk, Revali  

**Severity:** 🟡 MED — Data integrity risk  

**Context:**
- No `request.resource.data` validation in rules.
- Any authenticated user can write arbitrary fields/types.

**Decision:**
Add field-level validation for each collection (required fields, type checks, size limits).

**Owner:** Daruk (Backend Dev)

---

### Debug Logging Leaks API Keys in Production
**Status:** Identified, Awaiting Fix  
**Agents:** Daruk  
**Severity:** 🟡 MED — Credential exposure  

**Context:**
- admin.html:1874-1889 logs EMAILJS_PUBLIC_KEY, service ID, template ID to console.

**Decision:**
Remove or gate behind debug flag.

**Owner:** Urbosa (Admin Dev)

---

### Input Validation Gaps in admin.html Payment Logic
**Status:** Identified, Awaiting Fix  
**Agents:** Urbosa, Purah  
**Severity:** 🟡 MED — Logic bugs  

**Context:**
- saveNewTask() allows negative points (`!points` true for 0 but allows -50).
- savePayment() allows negative amounts, always resets balance to 0 instead of deducting.

**Decision:**
1. Validate `points > 0` in saveNewTask().
2. Validate `amount > 0` in savePayment().
3. Fix savePayment to deduct: `state.balance = Math.max(0, state.balance - (amount * 100))`.

**Owner:** Urbosa (Admin Dev)

---

### XSS Risk: innerHTML with User-Controlled Data
**Status:** Identified, Awaiting Fix  
**Agents:** Daruk, Urbosa, Mipha  
**Severity:** 🟡 MED — Security  

**Context:**
- 45+ innerHTML usages across codebase (profile names, task names, reports).
- No sanitization. localStorage tampering or admin-entered `<script>` executes.

**Decision:**
Use textContent for data fields or implement sanitization (escapeHtml, DOMPurify).

**Owner:** Multiple (coordinate)

---

## 🟨 MEDIUM / NICE-TO-HAVE (P2)

### Dark Mode Missing: home.html and offline.html
**Status:** Identified, Awaiting Fix  
**Agents:** Mipha  

- home.html and offline.html have zero dark mode support.
- app.html, index.html, habitrewards.html have good CSS variable-based dark mode.

**Decision:** Add dark mode CSS to home.html and offline.html.

---

### Dead Code: Multiple Functions Unused
**Status:** Identified, Cleanup Needed  
**Agents:** Mipha, Urbosa, Daruk  

Functions found: rate(), submitSurvey(), isWednesday(), addBonus(), reportTask(), downloadFeedbackLog(), downloadTaskResponses(), fallbackMailto(), cancelInvite().

**Decision:** Either wire them up or delete them.

---

### DAILY_MAX_POINTS Constant Never Enforced
**Status:** Identified  
**Agents:** Mipha  

- Constant defined in app.html:921, index.html:1158, habitrewards.html:645 but never used.
- Creates false expectations.

**Decision:** Either enforce the cap in reward logic or delete the dead constant.

---

### index.html/habitrewards.html Not Profile-Aware
**Status:** Identified  
**Agents:** Purah  

- Both pages always read/write `hr_state` with no suffix.
- Use hardcoded tasks, ignore admin customizations.

**Decision:** Deprecate or update to profile-aware (see Code Duplication decision).

---

### Manifest.json start_url Should Be /app.html
**Status:** Identified  
**Agents:** Mipha  

- PWA opens to /home.html (marketing page) instead of /app.html (app).
- Returning users expect app, not marketing.

**Decision:** Change start_url to /app.html.

---

## 📋 SUMMARY BY PRIORITY

### P0 (Critical Bugs & Security) — BLOCK ALL RELEASES
- [x] Fix saveState() undefined in admin.html
- [x] Fix admin↔app storage key mismatch (stu profile)
- [x] Fix unsuffixed keys in displayReports/download functions
- [x] Lock down Firestore rules (auth-only → user-scoped)

### P1 (High Priority) — FIX SOON (this sprint)
- [ ] Unify 3 app pages OR extract shared code — **PENDING:** Revali strategy (Option C) awaiting approval
- [x] Fix updateBalanceDisplay() undefined (Mipha: app.html hardened)
- [x] Fix modal accessibility (button, focus trap, aria-label) — **DONE:** Mipha converted 21 spans→buttons, 22 modals→role=dialog
- [x] Add CSP headers to firebase.json — **DONE:** Daruk deployed CSP + 4 security headers
- [ ] Decide Cloud Function vs EmailJS strategy
- [ ] Add caching headers to firebase.json
- [ ] Service worker cache versioning
- [ ] Add dark mode to home.html, offline.html
- [x] Firestore rules data validation — **DONE:** Daruk hardened isProfileOwner() with exists() guard

### P2 (Medium Priority) — FIX NEXT SPRINT
- [ ] Remove/fix dead code (rate, submitSurvey, etc.)
- [ ] Input validation (points > 0, amount > 0)
- [ ] savePayment deduction logic fix
- [ ] XSS sanitization in innerHTML usages
- [ ] Manifest start_url update to /app.html
- [ ] Hard-coded earnings estimates update
- [ ] Accessibility improvements (star rating ARIA, etc.)

---

## 🗂️ Agent Cross-Impacts

### Revali → Mipha: Code Consolidation Strategy
Architecture decision on 3 divergent pages affects Mipha's immediate roadmap.

### Revali → Daruk: Firestore Rules & CSP
Architect-level security decisions flow to backend.

### Urbosa → Purah: Data Flow Validation
Admin implementations impact tester's validation suite.

### Daruk → Urbosa: Storage Key Alignment
Backend data contract affects admin payment logic.

### Mipha → All: Code Quality Baseline
Shared code extraction enables all subsystems to stay in sync.

---

## 🔧 RECENT DECISIONS (Latest Sprint: 2026-03-03)

### Decision: JSON.parse Defensive Patterns (Urbosa + Mipha Alignment)

**Agents:** Urbosa, Mipha  
**Date:** 2026-03-03  
**Status:** ✅ Implemented  
**Priority:** P1  

Both admin.html and app.html now follow consistent try/catch patterns for JSON.parse calls:

```javascript
try {
  let data = JSON.parse(localStorage.getItem(key));
  if (!data) throw new Error('null or undefined');
  return data;
} catch (e) {
  return getDefaultState();
}
```

**Impact:** Prevents silent crashes from corrupted localStorage. Improves resilience across admin and user surfaces.

**Cross-Agent:** Mipha's hardening in app.html was implemented first; Urbosa mirrored the pattern in admin.html for consistency.

---

### Decision: Firestore Ownership Checks Hardened (Daruk)

**Agent:** Daruk  
**Date:** 2026-03-03  
**Status:** ✅ Implemented  
**Priority:** P1  

**Problem:** `get()` on non-existent Firestore documents throws permission-denied errors instead of graceful false, causing runtime failures.

**Solution:** Added `exists()` check before `get()` in `isProfileOwner()`:

```
return exists(/databases/.../profiles/$(profileId))
  && request.auth.token.email == get(...).data.ownerEmail;
```

**Cost:** +1 Firestore read per ownership verification (acceptable trade-off for reliability).

**Status in firestore.rules:** PARTIAL — `taskProposals`, `payoutRequests`, `userNotifications`, `userState` remain auth-only (not user-scoped) pending security review.

---

### Decision: Security Headers Deployment (Daruk)

**Agent:** Daruk  
**Date:** 2026-03-03  
**Status:** ✅ Implemented  
**Priority:** P1  

Added to firebase.json hosting config:

- **Content-Security-Policy:** Restricts script/style/frame sources (prevents XSS)
- **X-Content-Type-Options:** Blocks MIME type sniffing
- **X-Frame-Options:** Prevents clickjacking (DENY by default)
- **Referrer-Policy:** Restricts referrer info leakage (strict-origin-when-cross-origin)
- **Strict-Transport-Security:** Enforces HTTPS for 1 year

**Impact:** Hardens attack surface against browser-level exploits. No expected UX regression (CSP allows necessary inline scripts).

---

### Decision: Accessibility Refactor (Mipha)

**Agent:** Mipha  
**Date:** 2026-03-03  
**Status:** ✅ Implemented  
**Priority:** P1  

**Scope:** app.html, index.html, habitrewards.html

**Changes:**
1. **21 close/dismiss spans → buttons** with aria-label (keyboard accessible)
2. **22 modals → role="dialog"** with aria-label or aria-labelledby (screen reader compatible)
3. **Modal focus management:** Focus trap on open, restore on close

**Standard Applied:** WCAG 2.1 AA (Level AA accessibility)

**Impact:** Full keyboard navigation and screen reader support for users with mobility/visual disabilities.

---

### Decision: getDefaultState() Extraction (Mipha)

**Agent:** Mipha  
**Date:** 2026-03-03  
**Status:** ✅ Implemented  
**Priority:** P1  

**Problem:** Default state initialized in 2+ places in app.html with divergent schemas → guaranteed schema drift.

**Solution:** Extracted `getDefaultState()` function returning canonical state with ALL fields:

```javascript
function getDefaultState() {
  return {
    balance: 0,
    totalEarned: 0,
    streak: 0,
    tasks: [],
    achievements: [],
    completedToday: [],
    weeklyCounters: {},
    weeklyBonusesCompleted: [],
    dailyBonusCompleted: null,
    // ... all other fields
  };
}
```

Used in:
- Initial state declaration: `let state = getDefaultState()`
- loadState() catch block: `state = getDefaultState()`

**Impact:** Single source of truth. Adding a new state field requires only 1 change instead of N.

---

### Decision: Code Consolidation Strategy — Option C Recommended (Revali)

**Agent:** Revali (Lead/Architect)  
**Date:** 2026-03-03  
**Status:** 🟡 PROPOSED (awaiting approval)  
**Priority:** P1  

**Problem Statement:** 3 user pages (app.html, index.html, habitrewards.html) share 67 common functions (68% duplication) but diverge in capabilities, security posture, and data contracts.

| File | Lines | Functions | Firebase | Sanitization | Unique Features |
|------|-------|-----------|----------|-------------|---|
| app.html | 3069 | 84 | ✅ | ✅ | Cloud sync, payments, quotes, admin, custom modals |
| index.html | 2380 | 77 | ❌ | ❌ | Task help (8 entries), stuOnly filtering, completed-ever |
| habitrewards.html | 2047 | 73 | ❌ | ❌ | **NONE** — strict subset of index.html |

**Recommendation: Option C — Merge & Delete**

1. **Phase 1:** Merge index.html + habitrewards.html into app.html
   - Preserve index.html features via feature flags + comments
   - Delete habitrewards.html (no unique features)
2. **Blockers satisfied:** Mipha's getDefaultState() (✅) + a11y refactor (✅)
3. **Effort:** 4-6 hours safe merge + QA
4. **Risk:** Medium (large merge, but Mipha's a11y work reduces scope)

**Rationale:** Eliminates maintenance burden of habitrewards.html, converges security/Firebase patterns, reduces schema drift risk.

**Next Step:** Awaiting approval before Phase 1 implementation (Mipha assigned).

---

### Decision: admin.html Guard Simplification (Urbosa)

**Agent:** Urbosa  
**Date:** 2026-03-03  
**Status:** ✅ Implemented  
**Priority:** P2 (housekeeping)  

**Change:** Simplified redundant guard in `saveState()`:
```javascript
// Before:
if (IS_LEGACY_PROFILE && PROFILE_ID === 'stu') { ... }

// After:
if (IS_LEGACY_PROFILE) { ... }
```

**Rationale:** IS_LEGACY_PROFILE is already defined as `PROFILE_ID === 'stu'`, so the second condition is always redundant.

**No functional change.** Just clarifies intent and removes misleading redundancy.

---

## 📋 Phase 1–4 Consolidation (Merged 2026-03-03)

### Decision: Phase 1 Consolidation — habitrewards.html Deleted

**Agent:** Daruk (Backend Dev)  
**Date:** 2026-03-03  
**Status:** ✅ Completed  
**Priority:** P1  

**What Changed**
- Deleted `habitrewards.html` (2047 lines) from the repository
- Zero references in any production file (verified: firebase.json, manifest.json, sw.js, README.md, docs/, all HTML pages)

**Rationale**
- Revali's analysis: zero unique features, zero unique functions vs index.html
- No sanitization, no Firebase sync — strict security downgrade from app.html
- Orphaned file: no page links to it, not cached, not routed

**Impact**
- **Mipha:** Scope reduced from 3 user pages to 2 (app.html, index.html)
- **Revali:** Phase 1 of Option C complete; Phase 2 (merge index.html features into app.html) is next
- **Purah:** One fewer test surface

**Commit**
`chore: delete orphaned habitrewards.html (Phase 1 consolidation)`

---

### Decision: Phase 2 Migration Verification — Purah QA Report

**Date:** 2026-07-14  
**Scope:** Verify 5 features migrated from index.html → app.html  
**Verdict:** ✅ ALL PASS

**Features Verified**
1. **TASK_HELP data object + showTaskHelp()** — ✅ PASS
   - `TASK_HELP` constant at line 1107 with 11 task help entries
   - `showTaskHelp(taskId)` at line 1184 with proper escapeHtml() sanitization
   - Help modal HTML at line 776 with modal title/content/close button
   - No duplicate definitions in index.html

2. **filterForProfile()** — ✅ PASS
   - Defined at line 1156, uses IS_LEGACY_PROFILE (not IS_STU_PROFILE)
   - Logic correctly excludes stuOnly/excludeFromStu tasks per profile
   - Called in getConfiguredDailyTasks() and weekly bonus contexts

3. **Task data flags (stuOnly / excludeFromStu)** — ✅ PASS
   - excludeFromStu: true on tasks 3 (Duolingo), 120 (emails)
   - stuOnly: true on tasks 300 (Tennis), 306 (Aisle), 312 (Lunch), 318 (Mystery Shop)
   - Matches expected profile-specific task flags from design

4. **getCompletedEverTasks() + markTaskCompletedEver()** — ✅ PASS
   - COMPLETED_EVER_KEY at line 1165 with profile-suffixed key pattern
   - Proper deduplication and JSON parse with error fallback
   - Called in all task completion handlers (lines 2314, 2382, 2456, 2489, 2571)

5. **Help buttons in task rendering** — ✅ PASS
   - Daily tasks (line 2167) with conditional help button
   - Weekly bonuses (line 2214) with white styling
   - Daily bonus (lines 2241–2244) with dynamic rendering
   - All buttons use event.stopPropagation() to prevent task completion
   - CSS for .task-help-btn at lines 301–328 with dark mode support

**Additional Quality Checks**
- No duplicate function definitions — each migrated function defined exactly once
- getDefaultState() intact and properly called in initial state + reset contexts
- No unsuffixed storage key references (backward-compatible fallback verified)
- escapeHtml() applied to TASK_HELP titles; static HTML content safe for innerHTML
- index.html clean of all migrated functions/constants

**Summary:** All 5 migrated features correctly implemented in app.html with proper escaping, profile-aware storage keys, and no orphaned references.

---

## 🐛 BUG BASH SESSION (2026-04-14)

### Decision: Firebase Config Consistency (Purah + Daruk)

**Agent:** Purah (Tester), Daruk (Backend Dev)  
**Date:** 2026-04-14  
**Status:** 🔴 Pending  
**Priority:** P0 Critical  

**Issue:**
All three files (app.html:851-853, admin.html:513-515, login.html:341-343) reference old Firebase project ID `habitrewards-131` instead of new domain `mydailywin`.

```javascript
// Current (all 3 files):
authDomain: "habitrewards-131.firebaseapp.com"
projectId: "habitrewards-131"

// Should Be:
authDomain: "mydailywin.firebaseapp.com"
projectId: "mydailywin"
```

**Impact:**
- Production consistency — site is hosted at mydailywin.web.app
- CSP frame-src policy may reject auth redirects if authDomain doesn't match hosting domain
- Google Sign-In helper iframe may fail to load from correct domain

**Decision Needed:**
1. Are we keeping old Firebase project ID for transition, or migrating fully?
2. Should we add comment explaining intentional backwards compatibility?
3. If migrating, all 3 files + firebase.json CSP need updates + redeploy

**Owner:** Revali (Lead) — needs approval  
**Assigned to:** Daruk for implementation once approved  

---

### Decision: P0 Blocker — get-started.html Must Write to Firestore (Daruk)

**Agent:** Daruk (Backend Dev)  
**Date:** 2026-04-14  
**Status:** 🔴 Pending Implementation  
**Priority:** P0 Blocker  

**Issue:**
Onboarding flow (get-started.html) writes profile to localStorage only. This blocks:
- Full Firestore ownership-based security rules (lines 99-147 in Firestore rules have TODO comments waiting for this)
- Cloud sync across devices
- Profile persistence beyond cache clear

**Solution:**
1. Add Firebase SDK imports to get-started.html (firebase-app-compat.js, firebase-firestore-compat.js)
2. Initialize Firebase with same config as other pages
3. Update `saveProfileSetup()` to dual-write:
   ```javascript
   await db.collection('profiles').doc(answers.profileId).set({
       ownerEmail: pendingUserEmail,
       name: answers.userName,
       createdAt: firebase.firestore.FieldValue.serverTimestamp()
   });
   ```
4. Keep localStorage for offline fallback and backwards compatibility

**Impact:**
- Enables full Firestore security scoping (ownership-based access control)
- Unblocks future cloud sync features
- Profiles persist across devices for authenticated users

**Owner:** Daruk (Backend Dev)  
**Blockers:** None  

**Cross-Agent Impact:**
- **Mipha:** Verify app.html reads from Firestore fallback correctly after update
- **Purah:** Add test cases for Firestore profile creation + refresh during onboarding

---

### Decision: CSP + authDomain Domain Update (Daruk)

**Agent:** Daruk (Backend Dev)  
**Date:** 2026-04-14  
**Status:** 🔴 Pending Implementation  
**Priority:** P1 Security  

**Issue:**
Site is now hosted at mydailywin.web.app but CSP only allows habitrewards-131.firebaseapp.com.

**Solution:**
1. firebase.json line 19: Add `https://mydailywin.firebaseapp.com` to `frame-src`
2. login.html, app.html, admin.html: Update `authDomain: "mydailywin.firebaseapp.com"`
3. Keep `habitrewards-131` references for backwards compatibility during transition

**Owner:** Daruk (Backend Dev)  

---

### Decision: Onboarding State — sessionStorage to localStorage (Daruk)

**Agent:** Daruk (Backend Dev)  
**Date:** 2026-04-14  
**Status:** 🔴 Pending Implementation  
**Priority:** P2 Data Consistency  

**Issue:**
sessionStorage is lost on page refresh → orphaned profiles if user refreshes get-started.html mid-onboarding.

**Solution:**
Replace:
- `sessionStorage.setItem('hr_pending_user_uid', ...)` → `localStorage.setItem('hr_onboarding_uid', ...)`
- `sessionStorage.setItem('hr_pending_user_email', ...)` → `localStorage.setItem('hr_onboarding_email', ...)`
- Explicit cleanup in get-started.html after profile creation completes

**Owner:** Daruk (Backend Dev)  

---

### Issue: get-started.html Step 7b Navigation Bug (Purah)

**Agent:** Purah (Tester)  
**Date:** 2026-04-14  
**Status:** 🟡 Medium  
**Priority:** P2  
**File:** get-started.html:752, 971-992

**Issue:**
Step 7b (admin goals) uses string `currentStep = '7b'` but `goBack()` function only handles numeric comparisons. Back button will not work from step 7b.

**Fix:**
```javascript
else if (currentStep === '7b') {
    currentStep = 7;
}
```

**Owner:** Mipha (User Dev) — onboarding flow  

---

### Issue: Missing Event Parameter Guards (Purah)

**Agent:** Purah (Tester)  
**Date:** 2026-04-14  
**Status:** 🟡 Medium  
**Priority:** P2  
**Files:** get-started.html:666, 744, 776

**Issue:**
Functions `selectOption()`, `selectPayoutPref()`, `selectHelpOption()` call `event.currentTarget` without declaring event parameter. Works from onclick but will crash if called programmatically.

**Fix:**
```javascript
function selectOption(step, value, event) {
    const target = event?.currentTarget;
    if (!target) return;
    // ... rest of logic
}
```

**Owner:** Mipha (User Dev)  

---

### Issue: Branding Comment Cleanup (Purah)

**Agent:** Purah (Tester)  
**Date:** 2026-04-14  
**Status:** 🟢 Cosmetic  
**Priority:** P3  
**File:** home.html:915

**Issue:**
HTML comment says `<!-- WHY HABITREWARDS -->` instead of `<!-- WHY MYDAILYWIN -->`.

**Owner:** Mipha (User Dev) — quick branding pass  

---

## ✅ Verified Clean (Bug Bash 2026-04-14)

1. **SendGrid Removal** — No references to sendAdminInvite cloud function. EmailJS fully operational.
2. **Admin "Pending" Bug** — isAdminAccepted() properly checks acceptedAt/firstName/name. localStorage sync working.
3. **Payout Flow** — End-to-end tested. Firestore + localStorage fallback both operational.
4. **Profile-Suffixed Storage Keys** — All CSV downloads, reports, data exports correctly using profile-suffixed keys.
5. **localStorage Key Audit** — Comprehensive audit by Daruk: all keys documented, pattern consistent.


---

## 🟡 MEDIUM BUGS (P1 — Next Sprint)

### Bug: get-started.html Step 7b Navigation
**Status:** ✅ FIXED (Mipha, 2026-04-14)  
**Severity:** 🟡 MEDIUM — UX regression  

**Context:**
Step 7b (admin goals) uses string `'7b'` for currentStep, but `goBack()` function only handles numeric comparisons. Back button does not work from step 7b.

**Solution Implemented:**
Added case to goBack(): `else if (currentStep === '7b') { currentStep = 7; }`

**Owner:** Mipha (User Dev)

---

### Bug: Missing Event Parameter Guards in Onboarding
**Status:** ✅ FIXED (Mipha, 2026-04-14)  
**Severity:** 🟡 MEDIUM — Defensive coding  

**Context:**
Functions `selectOption()`, `selectPayoutPref()`, `selectHelpOption()` (get-started.html lines 666, 744, 776) call `event.currentTarget` without declaring event parameter. Works from onclick but will crash if called programmatically.

**Solution Implemented:**
Added optional event parameter and optional chaining: `event?.currentTarget`

**Owner:** Mipha (User Dev)

**Decision:** Event parameter convention — Functions from onclick="" should accept `event` as last parameter with optional chaining for safety.

---

### Bug: Missing Error Handling in saveProfileSetup()
**Status:** ✅ FIXED (Daruk, 2026-04-14)  
**Severity:** 🟡 MEDIUM — Error transparency  

**Context:**
saveProfileSetup() in get-started.html now writes to Firestore but had no error handling for write failures.

**Solution Implemented:**
Added try/catch around Firestore write with user-facing error messages. localStorage write retained for fallback.

**Owner:** Daruk (Backend/Security)

---

## ✅ FIXED SECURITY DECISIONS

### Decision: XSS Prevention — innerHTML → createElement Pattern
**Status:** ✅ FIXED (Daruk, 2026-04-14)  
**Severity:** 🔴 CRITICAL  

**Decision:**
User-supplied URLs (like photoURL) must never be interpolated into innerHTML. Use createElement + property assignment instead.

**Rationale:**
XSS prevention. This is the standard pattern going forward for all user-supplied content.

**Implementation:**
login.html updated to remove innerHTML interpolation; now uses `img.src = photoURL;` pattern.

**Owner:** Daruk (Backend/Security)

---

### Decision: Data Persistence — sessionStorage → localStorage for Onboarding
**Status:** ✅ FIXED (Daruk, 2026-04-14)  
**Severity:** 🟡 MEDIUM  

**Decision:**
Onboarding state migrated from sessionStorage to localStorage with explicit cleanup.

**Rationale:**
sessionStorage is lost on page refresh, breaking mid-onboarding users. localStorage persists through refresh, ensuring profile ownership is captured.

**Implementation:**
- `sessionStorage.setItem('hr_pending_user_uid', ...)` → `localStorage.setItem('hr_onboarding_uid', ...)`
- `sessionStorage.setItem('hr_pending_user_email', ...)` → `localStorage.setItem('hr_onboarding_email', ...)`
- Old keys retained as fallback reads in get-started.html for transition safety
- Both old and new keys cleaned up after profile creation

**Impact:** Any agent reading onboarding state should check the new localStorage keys first.

**Owner:** Daruk (Backend/Security)

---

### Decision: CSP and authDomain Update for mydailywin Domain
**Status:** ✅ FIXED (Daruk, 2026-04-14)  
**Severity:** 🔴 CRITICAL  

**Decision:**
Update CSP frame-src and Firebase authDomain to include `https://mydailywin.firebaseapp.com`.

**Rationale:**
Site is now hosted at `mydailywin.web.app` but CSP only allowed `habitrewards-131.firebaseapp.com`. If Firebase auth helper iframe switches to new domain, Google Sign-In breaks.

**Implementation:**
firebase.json line 19: Added `https://mydailywin.firebaseapp.com` to `frame-src`. Kept habitrewards-131 references for backwards compatibility during transition.

**Owner:** Daruk (Backend/Security)

---

## 🟢 PRODUCT DECISIONS

### Decision: Tagline Update
**Status:** ✅ FIXED (Mipha, 2026-04-14)  

**Decision:**
Tagline updated to "Turn Daily Habits into Daily Wins".

**Rationale:**
Old tagline "Build Better Habits, Earn Real Rewards" no longer reflects product positioning.

**Implementation:**
Updated across home.html, app.html (og-image.svg), and marketing materials.

**Owner:** Mipha (User Dev)

**Impact:** Any new marketing materials must use new tagline.

---

### Decision: Phase 2 — index.html Features Migrated to app.html
**Status:** ✅ COMPLETED (Mipha, 2026-03-03)  
**Priority:** P1  

**Context:**
Per Revali's approved Option C consolidation strategy, Phase 2 migrates all 5 features unique to index.html into app.html, eliminating the need to maintain index.html as a user-facing page.

**Features Migrated:**
1. **Task Help System** — Added TASK_HELP constant (12 entries), showTaskHelp() function, modal HTML, CSS
2. **Profile Task Filtering** — Added filterForProfile() using IS_LEGACY_PROFILE; wired into task configuration
3. **Completed-Ever Tracking** — Added getCompletedEverTasks() and markTaskCompletedEver() with profile-suffixed keys
4. **Help Buttons in Rendering** — Added "i" buttons to daily tasks and bonuses

**Key Design Decision:** Storage keys use `hr_*_${PROFILE_ID}` convention (not unsuffixed). filterForProfile() applied inside getConfiguredDailyTasks() return path.

**Result:** app.html now has feature parity with index.html; index.html can safely redirect to app.html (Phase 3).

**Owner:** Mipha (User Dev)

---

### Decision: Branding Cleanup
**Status:** ✅ FIXED (Mipha, 2026-04-14)  

**Context:**
HTML comments still referenced "HABITREWARDS" branding.

**Implementation:**
Updated home.html comment from `<!-- WHY HABITREWARDS -->` → `<!-- WHY MYDAILYWIN -->`.

**Owner:** Mipha (User Dev)

---

## 🔗 CROSS-AGENT IMPACT SUMMARY

### Mipha (User Dev) — Onboarding & Frontend
- ✅ Step 7b navigation fixed
- ✅ Event parameter guards added (selectOption, selectPayoutPref, selectHelpOption)
- ✅ Error handling in saveProfileSetup()
- ✅ hr_state key corrected (storage key mismatch fixed)
- ✅ Tagline updated
- ✅ HABITREWARDS comment cleaned
- ⚠️ If Firestore write to get-started.html is enabled, app.html must correctly read from Firestore with localStorage fallback

### Daruk (Backend/Security)
- ✅ XSS in login.html fixed (innerHTML → createElement)
- ✅ sessionStorage → localStorage migration completed
- ✅ CSP update for mydailywin domain
- ✅ email-templates/ documented (kept for reference, not in use)
- ⚠️ Firestore profile creation now enabled; admin.html can simplify auth logic

### Urbosa (Admin Dev)
- 📋 Admin page authorization flow depends on Firestore profile doc
- �� Once profiles are in Firestore, admin.html can simplify auth checks from localStorage fallback

### Purah (QA/Tester)
- ✅ All identified bugs fixed or documented
- 📋 New test cases: Firestore profile creation on onboarding
- 📋 Test refresh during onboarding to verify localStorage persistence
- 📋 Verify CSP doesn't block Google Sign-In after domain updates

---

## 📋 PENDING DECISIONS (Awaiting Prioritization)

### Firebase Project ID: Keep habitrewards-131 or Migrate to mydailywin?
**Status:** 📋 DECISION NEEDED  
**Finder:** Purah (QA Sweep)  

**Context:**
Files app.html, admin.html, login.html still use `projectId: "habitrewards-131"` and `authDomain: "habitrewards-131.firebaseapp.com"`. Site is deployed to `mydailywin.web.app`.

**Options:**
1. Keep habitrewards-131 project (current choice — backwards compat)
2. Migrate to mydailywin project (requires Firestore data migration)

**Decision:** Keep habitrewards-131 for now. Add comment explaining transition state.

**Owner:** Revali (Lead decision) / Daruk (implementation)

---

## 📖 TEAM CONVENTIONS (Extracted)

### Storage Key Naming
Pattern: `hr_{feature}` (stu profile, unsuffixed) or `hr_{feature}_{PROFILE_ID}` (other profiles)

**Examples:**
- `hr_state` — legacy stu profile state
- `hr_state_example` — example profile state
- `hr_completed_log_example` — example profile completed log

**Decision:** Always use suffixed keys for non-stu profiles. app.html and admin.html dual-write for stu profile when needed.

---

### Event Parameters in onclick Handlers
Functions bound to `onclick=""` should accept `event` as optional last parameter with optional chaining.

**Pattern:**
```javascript
function selectOption(step, value, event) {
    const target = event?.currentTarget;
    if (!target) return;
    // ... logic
}
```

**Rationale:** Allows both onclick-bound calls and programmatic calls without crashing.

---

### User Content and Security
- Never interpolate user-supplied data (URLs, text) into innerHTML
- Use createElement + property assignment instead
- Example: `img.src = photoURL;` instead of `innerHTML = '<img src="' + photoURL + '"/>'`

---

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

---

<!-- Archived on 2026-05-03 -->

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

---

## Decision: Admin Optimization Sweep (Urbosa)
**Status:** ✅ IMPLEMENTED  
**Date:** 2026-05-01  
**Agent:** Urbosa (Admin Dev)

---

## Decision: Forgot Password Flow (Daruk)
**Status:** ✅ IMPLEMENTED  
**Date:** 2026-05-01  
**Agent:** Daruk (Backend Dev)  
**Triggered by:** Sidon UX audit finding P2

**Context:** Users who sign in with email/password had no way to reset forgotten passwords.

**Decision:**
- Added inline "Forgot password?" link and reset form to login.html
- Uses Firebase Auth's built-in `sendPasswordResetEmail()`
- No modal — keeps it lightweight, consistent with existing toggle pattern (email form show/hide)

**Key Choices:**
1. Inline form, not modal — follows existing pattern
2. Pre-fill email from login form to reset form — small UX win
3. Friendly error messages — Firebase error codes mapped to human-readable strings
4. No backend changes — `sendPasswordResetEmail` is client-side Firebase Auth

**Files Changed:** login.html — CSS, HTML (reset form + forgot link), JS (showResetForm, hideResetForm, sendResetEmail, showSuccess, hideSuccess)

**Risks/Follow-ups:**
- Firebase password reset email template is generic — could customize in Firebase Console if branding matters
- Rate limiting handled by Firebase (auth/too-many-requests), no abuse concern

---

---

## Decision: SW Cache Regression Fix (Daruk)
**Status:** ✅ IMPLEMENTED  
**Date:** 2026-05-01  
**Agent:** Daruk (Backend Dev)

**Context:** Sidon's code sweep extracted shared CSS and JS into new files (css/shared.css, js/firebase-config.js, js/sw-init.js, js/utils.js). These files were never added to service worker's STATIC_ASSETS cache list. Additionally, index.html was missing. Offline users would see unstyled, broken pages.

**Decision:**
1. Added all 5 missing files to STATIC_ASSETS in sw.js
2. Bumped cache version: mydailywin-v2 → mydailywin-v3

**Rationale:** 
- Offline support is PWA core requirement
- Cache version bump forces activate event to clear old caches and re-download assets
- Without fix, existing installs would serve stale cached pages referencing missing files

**Process Rule (Going Forward):**
**Any PR that adds, removes, or renames a file must update sw.js STATIC_ASSETS and bump cache version. This is a review checklist item.**

---

---

## Decision: User Feature Implementations (Mipha)
**Status:** ✅ IMPLEMENTED  
**Date:** 2026-05-01  
**Agent:** Mipha (User Dev)

---

## Decision: Apple Sign-In Implementation (Daruk)
**Status:** ✅ Implemented  
**Date:** 2025-07-25  
**Agent:** Daruk (Backend Dev)  
**Scope:** login.html, js/login.js

**Context:** Apple Sign-In added to login.html alongside existing Google Sign-In.

**Decision:**
- Uses Firebase Auth `OAuthProvider('apple.com')` with popup flow (same as Google)
- Scopes: email, name
- Auth state listener handles post-sign-in redirect (no separate redirect logic needed)
- Button uses inline SVG for Apple logo (no external image dependency)

**Impact:**
- No changes to auth state listener or redirect logic — Apple auth result flows through same `onAuthStateChanged` handler
- Apple may return a private relay email on first sign-in; display name may be null on subsequent sign-ins (Apple only sends name on first auth)

---

---

## Decision: EmailJS Migration to Cloud Function (Daruk)
**Status:** ✅ Implemented  
**Date:** 2025-01-20  
**Agent:** Daruk (Backend Dev)  
**Scope:** functions/index.js, admin.html, firebase.json, CSP configuration

**Context:**
admin.html was using EmailJS client-side with exposed service/template IDs and public key. Medium security finding — any user could inspect page source and use those credentials.

**Decision:**
1. Migrate email sending to Firebase Cloud Function (`sendInviteEmail`)
2. Validates caller is authenticated via Firebase Auth
3. Calls EmailJS REST API server-side (credentials never exposed to client)
4. Validates input (email format, required fields)

**Implementation:**
- Cloud Function: `functions/index.js` — exports `sendInviteEmail` (v2 onCall)
- Client: admin.html uses `firebase.functions().httpsCallable()` instead of EmailJS SDK
- Removed from client: EmailJS CDN script, public key, service ID, template ID
- CSP updated: `*.cloudfunctions.net` replaces `api.emailjs.com` in connect-src
- firebase.json: Added `"functions"` config block

**Trade-offs:**
- Cold start latency on first invocation (~1-2s) — acceptable for invite emails
- Still using EmailJS (same 200/month free tier limit) — just calling from server side now

---

---

## Decision: Phase 2 CSS Optimization (Impa)
**Status:** ✅ Implemented  
**Date:** 2025-07-18  
**Agent:** Impa (Optimizer)  
**Scope:** shared.css, app.css, admin.css, home.css, login.css, get-started.css, sw.js

**What Was Done:**
1. Consolidated .btn CSS across 6 page-specific CSS files
2. shared.css now owns universal base properties (border, border-radius, font-size, cursor, transition, display, padding, min-height)
3. Each page CSS only specifies deltas
4. Removed dead CSS: `.btn-completed` (app.css), `.btn-outline` (home.css)
5. Bumped SW cache to v6

**What Was Already Done (Phase 1):**
- app.html keyframes (bounce, float, jackpot, etc.) — already removed
- home.html inline `style=""` attributes — already extracted to home.css
- Inline `<style>` blocks — already extracted to per-page CSS files

**Net Impact:**
- ~30 lines of redundant `.btn` CSS removed
- 2 dead CSS selectors removed
- All page CSS files inherit from shared.css — DRY principle
- Token cost reduction for multi-file AI reads

**Rationale:**
Centralizing base button properties ensures: (a) single source of truth for future changes, (b) lower token cost, (c) less style drift between pages.

---

---

## Decision: CSP unsafe-inline Elimination (Riju)
**Status:** ✅ Implemented  
**Date:** 2025-01-20  
**Agent:** Riju (Security)  
**Scope:** All HTML pages, all JS/CSS files, CSP meta tags, event handling

**Context:**
Security audit flagged `unsafe-inline` in script-src as High finding. All HTML pages had inline `<style>` blocks, inline `<script>` blocks (2000+ lines in app.html), and 57+ inline `onclick` handlers.

**Decision:**
1. Extract all inline code to external files (CSS and JS separated per page)
2. Convert inline event handlers to delegated listeners using `data-action` attributes
3. Add CSP meta tags with `script-src 'self'` + explicit CDN origins
4. Keep `'unsafe-inline'` for `style-src` only (not a code execution vector)

**CSP Policy Example:**
```
script-src 'self' https://www.gstatic.com https://apis.google.com https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com;
```

**Trade-offs:**
- **Pro:** XSS via inline script injection fully mitigated
- **Pro:** No build system required — works with vanilla HTML/JS
- **Con:** `style-src 'unsafe-inline'` remains (acceptable risk, not code execution vector)
- **Con:** Event delegation adds ~50 lines per JS file for dispatcher

**Files Changed:**
- app.html, offline.html — inline code extracted, CSP added, onclick→data-action
- New CSS files: css/app.css, css/offline.css
- New JS files: js/app.js, js/home.js, js/login.js, js/offline.js
- admin.html — CSP connect-src fix
- sw.js — cache manifest updated to v4

**Alternatives Considered:**
- Nonce-based CSP — requires server-side rendering; not viable with static Firebase Hosting
- Hash-based CSP — brittle; breaks on any code change
- Full style externalization — impractical without build step for 500+ inline style attributes

---

---

## Decision: UX Remaining Items Implementation (Sidon)
**Status:** ✅ Implemented  
**Date:** 2025-07-24  
**Agent:** Sidon (UX/Design)  
**Scope:** js/app.js, js/get-started.js, js/dark-mode.js (NEW), css/login.css, css/home.css, css/get-started.css, sw.js

**Context:**
Post-sweep findings F3 (spin wheel easing), F10 (Escape key), F11 (dark mode), F13 (toast) remained unimplemented. Polish items (P2-P3) that improve perceived quality and consistency.

**Decisions:**

1. **Spin wheel uses exponential deceleration** — `setTimeout` chain with `delay = 60 * e^(1.8 * progress)`. No external dependencies. Winner pre-determined for clean final frame.

2. **Escape key closes topmost modal** — single global `keydown` listener in app.js, finds `.modal.active` and calls `closeModal()`. No per-modal wiring needed.

3. **Dark mode respects localStorage('theme') then prefers-color-scheme** — shared `js/dark-mode.js` runs synchronously on page load to prevent flash. Same color palette as app.html dark mode (#131f24 bg, #202f36 cards, #37464f borders, #e5e5e5 text).

4. **Toast replaces alert() in get-started.html** — self-contained `showToast()` function in js/get-started.js, styled consistently with app.html toasts, includes dark mode support.

**Impact:**
- Dark mode now works across all user-facing page transitions (login → home → get-started → app)
- Spin wheel feels like a real slot machine moment (suspenseful deceleration)
- Keyboard users can dismiss modals without mouse
- No more jarring native browser dialogs in onboarding
- Consistent dark mode experience (unified palette)

**Supporting Changes:**
- Service worker cache bumped to v5
- Added `js/dark-mode.js` to SW precache list
- All JS validated with `node -c` syntax check

---

---

## Directive: Remove "Balancing" from Suggested Tasks (Shari Paltrowitz)
**Status:** 📋 RECEIVED & PROCESSED  
**Date:** 2026-05-01T20:37:00Z  
**Via:** Copilot Directive

**What:** Remove "balancing" from suggested tasks — could result in injury if someone isn't careful.

**Why:** User request — liability/safety. Team should review all suggested tasks for similar risks.

**Action Taken (Mipha):** Searched entire codebase. No "balancing" task found in code. Reviewed all physical tasks for safety concerns. Tennis/pickleball flagged as moderate risk.

**Recommendation:** Shari reviews tennis/pickleball task appropriateness. Consider adding a disclaimer or skill-level check before suggesting high-impact activities.

---


---

---

## Finding: "Balancing" Task Safety Sweep (Mipha)
**Status:** 📋 RESEARCH COMPLETE  
**Date:** 2026-05-01  
**Agent:** Mipha (User Dev)  
**Requested by:** Shari Paltrowitz

**Finding:** No "balancing" task exists anywhere in source code. Searched all HTML files (app.html, admin.html, home.html, get-started.html, index.html), all JS files, all JSON files. Word "balancing" only appears in the original removal directive.

**Task may have:**
- Already been removed in prior change
- Exist only in Firestore user data (not in code defaults)
- Live in localStorage/Firestore if user added it via admin panel

**No code changes made.**

---

## Finding: Fresh UX/Design Sweep (Sidon)
**Status:** 📋 AUDIT COMPLETE  
**Date:** 2026-05-01  
**Agent:** Sidon (UX/Design)  
**Scope:** app.html, index.html, home.html, login.html, get-started.html

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
