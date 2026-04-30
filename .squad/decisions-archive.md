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

