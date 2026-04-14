# Daruk Decision — Bug Bash Findings (2025-04-14)

## Context
Backend/data layer bug bash revealed critical gap in onboarding flow and several security issues.

## Key Decisions

### 1. P0 Blocker: get-started.html MUST write to Firestore
**Decision:** Onboarding flow must be updated to write profile document to Firestore, not just localStorage.

**Rationale:**
- Firestore ownership rules currently cannot enforce access control (they check `ownerEmail` on profile doc)
- Profiles stored only in localStorage = no cloud sync, no cross-device access, lost on cache clear
- This blocks full implementation of Firestore security rules (TODO comments on lines 99-147)

**Implementation:**
1. Add Firebase SDK imports to get-started.html (firebase-app-compat.js, firebase-firestore-compat.js)
2. Initialize Firebase in get-started.html with same config as other pages
3. Update `saveProfileSetup()` to write to Firestore:
   ```javascript
   await db.collection('profiles').doc(answers.profileId).set({
       ownerEmail: pendingUserEmail,
       name: answers.userName,
       createdAt: firebase.firestore.FieldValue.serverTimestamp()
   });
   ```
4. Keep localStorage write for offline fallback and backwards compatibility

**Impact:**
- Enables full Firestore security scoping (ownership-based access control)
- Unblocks future cloud sync features
- Profiles persist across devices for authenticated users

---

### 2. P1 Security: CSP and authDomain must reference new domain
**Decision:** Update CSP frame-src and Firebase authDomain to include `mydailywin.firebaseapp.com`

**Rationale:**
- Site is now hosted at `mydailywin.web.app` but CSP only allows `habitrewards-131.firebaseapp.com`
- If Firebase auth helper iframe switches to new domain, Google Sign-In breaks
- authDomain in Firebase config should match hosting domain for proper redirects

**Implementation:**
1. firebase.json line 19: Add `https://mydailywin.firebaseapp.com` to `frame-src`
2. login.html, app.html, admin.html: Update `authDomain: "mydailywin.firebaseapp.com"`

**Note:** Keep `habitrewards-131` references for backwards compatibility during transition

---

### 3. P2 Data Consistency: Use localStorage for onboarding state
**Decision:** Change onboarding session handoff from sessionStorage to localStorage with explicit cleanup

**Rationale:**
- sessionStorage is lost on page refresh → orphaned profiles if user refreshes get-started.html
- localStorage persists through refresh, ensuring profile ownership is captured
- Explicit cleanup after profile creation prevents stale data

**Implementation:**
Replace:
- `sessionStorage.setItem('hr_pending_user_uid', ...)` → `localStorage.setItem('hr_onboarding_uid', ...)`
- `sessionStorage.setItem('hr_pending_user_email', ...)` → `localStorage.setItem('hr_onboarding_email', ...)`
- Clear in get-started.html after profile creation completes

---

### 4. email-templates/ cleanup
**Decision:** KEEP email-templates/ directory for now, document its purpose

**Rationale:**
- SendGrid Cloud Function removed, but email template still exists
- Template is NOT referenced anywhere in production code (verified via grep)
- EmailJS is the active email system, but template may be useful for future reference or EmailJS migration

**Action:** Add comment in functions/index.js documenting that email-templates/ is kept for reference

---

## Cross-Agent Impact

**Mipha (User Dev):**
- If get-started.html is updated to write to Firestore, test that app.html correctly reads from Firestore fallback
- SessionStorage → localStorage change may affect user flows if refresh happens mid-onboarding

**Urbosa (Admin Dev):**
- Admin page authorization flow depends on Firestore profile doc existing — currently works because of localStorage fallback
- Once profiles are in Firestore, admin.html can simplify auth logic

**Purah (Tester):**
- New test cases: Firestore profile creation on onboarding
- Test refresh during onboarding to verify localStorage persistence
- Verify CSP doesn't block Google Sign-In after domain updates

---

## Follow-Up Tasks
1. Implement P0 fix: Add Firestore write to get-started.html (Daruk)
2. Update CSP and authDomain (Daruk)
3. Add error handling to saveProfileSetup() (Daruk)
4. Fix localStorage key mismatch in app.html line 907 (Mipha or Daruk)
5. Test all auth flows after changes (Purah)

---

**Date:** 2025-04-14  
**Agent:** Daruk  
**Status:** Findings documented, awaiting prioritization for fixes
