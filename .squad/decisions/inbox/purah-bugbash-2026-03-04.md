# Bug Bash Findings — Post-Rename QA Sweep
**Date:** 2026-03-04  
**Agent:** Purah (QA/Tester)  
**Scope:** Onboarding, auth, admin setup, settings, payout flows

---

## 🔴 Critical: Firebase Config Still References Old Project

**Files Affected:**
- app.html:851-853
- admin.html:513-515
- login.html:341-343

**Current State:**
All three files use `authDomain: "habitrewards-131.firebaseapp.com"` and `projectId: "habitrewards-131"`

**Should Be:**
`authDomain: "mydailywin.firebaseapp.com"` and `projectId: "mydailywin"` (or whatever the actual new Firebase project is)

**Decision Needed:**
1. Are we keeping the old Firebase project ID for now, or migrating to a new "mydailywin" project?
2. If keeping old project, should we add a comment explaining why?
3. If migrating, we need to update all 3 files + redeploy

---

## 🟡 Medium: get-started.html Step 7b Navigation Bug

**File:** get-started.html:752 and 971-992

**Issue:**
Step 7b (admin goals) uses string `'7b'` for currentStep, but `goBack()` function only handles numeric comparisons. Back button will not work from step 7b.

**Recommended Fix:**
Add to goBack() function:
```javascript
else if (currentStep === '7b') {
    currentStep = 7;
}
```

**Owner:** Mipha (User Dev) — onboarding flow

---

## 🟡 Medium: Missing Event Parameter Guards

**Files:** get-started.html:666, 744, 776

**Issue:**
Functions `selectOption()`, `selectPayoutPref()`, and `selectHelpOption()` call `event.currentTarget` without declaring event parameter. Works from onclick but will crash if called programmatically.

**Recommended Fix:**
Add event parameter to function signatures or use optional chaining:
```javascript
function selectOption(step, value, event) {
    const target = event?.currentTarget;
    if (!target) return;
    // ... rest of logic
}
```

**Owner:** Mipha (User Dev)

---

## 🟢 Low: Branding Cleanup

**File:** home.html:915  
**Issue:** HTML comment says `<!-- WHY HABITREWARDS -->` instead of `<!-- WHY MYDAILYWIN -->`  
**Owner:** Mipha (User Dev)

---

## ✅ Verified Clean

1. **SendGrid removal** — No references to sendAdminInvite cloud function remaining. EmailJS fully operational.
2. **Admin "pending" bug** — Verified fixed. `isAdminAccepted()` properly checks acceptedAt/firstName/name. localStorage sync works.
3. **Payout flow** — End-to-end tested. Firestore + localStorage fallback both working.
4. **Profile-suffixed storage keys** — All CSV downloads, reports, and data exports correctly use profile suffix.

---

## Recommendation

**Before Next Deploy:**
- Fix Bug 1 (Firebase config) — critical for production consistency
- Fix Bug 3 (step 7b navigation) — medium UX issue

**Can Wait:**
- Bug 4 (event parameter guards) — defensive coding, low risk
- Branding cleanup — cosmetic only
