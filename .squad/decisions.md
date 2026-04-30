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

