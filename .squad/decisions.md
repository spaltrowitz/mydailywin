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

