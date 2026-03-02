# Team Decisions

_Canonical decision ledger. Managed by Scribe. Agents write to .squad/decisions/inbox/ — Scribe merges here._

---

## 🔴 CRITICAL BUGS (P0 — Fix Immediately)

### Bug 1: saveState() undefined in admin.html
**Status:** Identified, Awaiting Fix  
**Agents:** Urbosa, Purah  
**Severity:** 🔴 CRITICAL — Runtime crash  

**Context:**
- markPayoutSent() (line 1085) and approvePayoutRequestLocal() (line 1158) both call `saveState(state)` but this function does not exist in admin.html.
- Only loadState() is defined (line 728).
- **Impact:** Approving ANY payout crashes silently and the user's balance is never deducted from localStorage.

**Decision:**
Add function to admin.html:
```javascript
function saveState(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
```
Or inline: replace `saveState(state)` calls with direct `localStorage.setItem(STORAGE_KEY, JSON.stringify(state))`.

**Owner:** Urbosa (Admin Dev)  
**Blockers:** None

---

### Bug 2: Admin↔User Storage Key Mismatch for "stu" Profile
**Status:** Identified, Awaiting Fix  
**Agents:** Revali, Urbosa, Purah  
**Severity:** 🔴 CRITICAL — Data splits between admin/app  

**Context:**
- admin.html:672 uses `STORAGE_KEY = 'hr_state'` for stu (IS_LEGACY_PROFILE flag)
- app.html:816 uses `STORAGE_KEY = 'hr_state_stu'` for `PROFILE_ID === 'stu'`
- The dual-write pattern exists in resetUserBalance() (admin.html:1502-1505) but is **missing** from savePayment() (admin.html:1365) and markPayoutSent() (admin.html:1085).
- **Impact:** Admin records a payment to `hr_state`, but app reads from `hr_state_stu` — balance stays stale in the user app.

**Decision:**
Either:
- **Option A:** Normalize both sides to one key. Choose: keep `hr_state` (legacy) or `hr_state_stu` (namespaced)?
- **Option B:** Ensure EVERY admin write to STORAGE_KEY for stu also writes to `hr_state_stu`.

Recommendation: Option B — add dual-write logic to saveState() or create saveUserState(profile, state) wrapper that handles dual-write automatically.

**Owner:** Urbosa (Admin Dev) with Revali (Lead) sign-off  
**Blockers:** None  
**Cross-Agent Impact:** Affects Mipha (user app data consistency) and Daruk (data contract).

---

### Bug 3: displayReports() Uses Unsuffixed Key
**Status:** Identified, Awaiting Fix  
**Agents:** Urbosa, Purah  
**Severity:** 🔴 CRITICAL — Wrong profile's data shown  

**Context:**
- admin.html:1183 reads `localStorage.getItem('hr_reports')` (hardcoded, no suffix).
- For non-stu profiles, app writes to `hr_reports_{profile}`.
- Clear (line 1490) and Download (line 1400) functions correctly use the suffix.
- **Impact:** Non-stu profiles see stale/empty reports on Elevenboard, even though reports exist (under suffixed key).

**Decision:**
Use consistent suffix pattern:
```javascript
let suffix = PROFILE_ID !== 'stu' && IS_LEGACY_PROFILE ? '' : '_' + PROFILE_ID;
let reports = localStorage.getItem('hr_reports' + suffix);
```

**Owner:** Urbosa (Admin Dev)  
**Blockers:** Bug 2 (storage key alignment)

---

### Bug 4: downloadTaskResponses() and downloadFeedbackLog() Use Unsuffixed Keys
**Status:** Identified, Awaiting Fix  
**Agents:** Urbosa, Purah  
**Severity:** 🔴 CRITICAL — CSV exports empty for non-stu profiles  

**Context:**
- admin.html:1384 `downloadTaskResponses()` reads `hr_completed_log` (no suffix)
- admin.html:1392 `downloadFeedbackLog()` reads `hr_feedback` (no suffix)
- admin.html:1412 `downloadAllData()` does it correctly WITH suffix.
- **Impact:** CSV exports for non-stu profiles export empty data.

**Decision:**
Update both functions to match downloadAllData() pattern using profile suffix.

**Owner:** Urbosa (Admin Dev)  
**Blockers:** Bug 2

---

## 🔓 CRITICAL SECURITY (P0 — Firestore Rules)

### Firestore Rules: Wide-Open Authentication (auth-only, not user-scoped)
**Status:** Identified, Awaiting Fix  
**Agents:** Revali, Daruk  
**Severity:** 🔴 CRITICAL — Security F grade  

**Context:**
- Every collection uses `allow read/write: if request.auth != null`.
- ANY authenticated user can read/write ANY other user's data, payouts, profile, task responses.
- Example: User A can modify User B's balance or payout requests.

**Decision:**
Implement document-ownership scoping. Example for `userState`:
```
match /userState/{profileId} {
  allow read, write: if request.auth != null && 
    (request.auth.uid == resource.data.ownerUid || 
     exists(/databases/$(database)/documents/profiles/$(profileId)/admins/$(request.auth.token.email)));
}
```

**Owner:** Daruk (Backend Dev) with Revali (Lead) sign-off  
**Blockers:** None  
**Secondary issues:** taskProposals allows unauthenticated creates (`allow create: if true`); add field validation.

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
- [ ] Fix saveState() undefined in admin.html
- [ ] Fix admin↔app storage key mismatch (stu profile)
- [ ] Fix unsuffixed keys in displayReports/download functions
- [ ] Lock down Firestore rules (auth-only → user-scoped)

### P1 (High Priority) — FIX SOON (this sprint)
- [ ] Unify 3 app pages OR extract shared code
- [ ] Fix updateBalanceDisplay() undefined
- [ ] Fix modal accessibility (button, focus trap, aria-label)
- [ ] Add CSP headers to firebase.json
- [ ] Decide Cloud Function vs EmailJS strategy
- [ ] Add caching headers to firebase.json
- [ ] Service worker cache versioning
- [ ] Add dark mode to home.html, offline.html
- [ ] Firestore rules data validation

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
