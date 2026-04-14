# Backend Bug Bash — Auth, Onboarding & Data Flow
**Date:** 2025-04-14  
**Agent:** Daruk (Backend Dev)  
**Focus:** login.html, get-started.html, firebase.json, firestore.rules, localStorage contracts, removed SendGrid

---

## 🔴 CRITICAL (P0) — Blocks Users

### **BUG-001: get-started.html does NOT write profile to Firestore**
- **File:** `get-started.html`, lines 828-835
- **What's wrong:** Profile data is saved ONLY to localStorage (`hr_profile_{id}`), never to Firestore. This means:
  - Firestore ownership rules CANNOT enforce access control (they check `ownerEmail` on the profile doc)
  - Profiles exist only on the device — no cloud sync, no cross-device access
  - If user clears localStorage, profile is lost forever
  - New users cannot benefit from Firestore security rules
- **Consequence:** Firestore rules TODO comments (lines 99-147 in firestore.rules) cannot be fully implemented
- **Fix:** Add Firestore write in `saveProfileSetup()`:
  ```javascript
  if (pendingUserEmail) {
      await db.collection('profiles').doc(answers.profileId).set({
          ownerEmail: pendingUserEmail,
          name: answers.userName,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
  }
  ```
- **Blocker:** get-started.html has NO Firebase SDK imports — must add `firebase-app-compat.js` and `firebase-firestore-compat.js`

---

## 🟠 HIGH (P1) — Security & Data Integrity

### **BUG-002: XSS vulnerability in login.html via Google photoURL**
- **File:** `login.html`, line 414
- **What's wrong:** `avatar.innerHTML = `<img src="${user.photoURL}" alt="Avatar">`;` directly interpolates user.photoURL without sanitization
- **Consequence:** If Google returns a malicious photoURL (unlikely but theoretically possible), XSS is possible
- **Fix:** Use DOM methods instead:
  ```javascript
  const img = document.createElement('img');
  img.src = user.photoURL;
  img.alt = 'Avatar';
  avatar.innerHTML = '';
  avatar.appendChild(img);
  ```

### **BUG-003: CSP frame-src references old domain**
- **File:** `firebase.json`, line 19
- **What's wrong:** `frame-src` includes `https://habitrewards-131.firebaseapp.com` but the site is now hosted at `mydailywin.web.app`
- **Consequence:** If Firebase auth helper iframe switches to the new domain, Google Sign-In will break
- **Fix:** Add `https://mydailywin.firebaseapp.com` to `frame-src`:
  ```
  frame-src https://accounts.google.com https://habitrewards-131.firebaseapp.com https://mydailywin.firebaseapp.com
  ```

### **BUG-004: Firebase authDomain is hardcoded to habitrewards-131**
- **Files:** `login.html:341`, `app.html:851`, `admin.html:513`
- **What's wrong:** All Firebase configs use `authDomain: "habitrewards-131.firebaseapp.com"` instead of the new custom domain
- **Consequence:** Auth redirects go to habitrewards-131.firebaseapp.com instead of mydailywin.web.app
- **Fix:** Update `authDomain` in all 3 files:
  ```javascript
  authDomain: "mydailywin.firebaseapp.com",
  ```
- **Note:** `.firebaseapp.com` is the Firebase subdomain — this should auto-redirect to the custom domain if configured

---

## 🟡 MEDIUM (P2) — Data Consistency & Edge Cases

### **BUG-005: localStorage key mismatch — hr_state_stu orphaned**
- **Files:** `app.html:907`, `admin.html:749`
- **What's wrong:**
  - `app.html` checks for legacy profile via `localStorage.getItem('hr_state_stu')` (line 907) to auto-redirect
  - `admin.html` writes to `hr_state_stu` when saving state for profile 'stu' (line 749)
  - BUT `app.html` uses `STORAGE_KEY = 'hr_state_' + PROFILE_ID` which for 'stu' would be `hr_state_stu` (line 883) — wait, that's WRONG
  - For 'stu', STORAGE_KEY should be `hr_state` (no suffix), NOT `hr_state_stu`
- **Actual bug:** `app.html` line 907 checks `hr_state_stu` but the actual key is `hr_state` for legacy profiles
- **Fix:** Change line 907 in `app.html`:
  ```javascript
  if (localStorage.getItem('hr_state')) {
      existingProfiles.push({ id: 'stu', name: 'Stu' });
  }
  ```

### **BUG-006: Session storage race condition on refresh**
- **Files:** `login.html:360-370`, `get-started.html:845-855`
- **What's wrong:** If user refreshes get-started.html mid-onboarding, `hr_pending_user_uid` and `hr_pending_user_email` are lost
- **Consequence:** Profile created without `creatorEmail` or `ownerEmail` → not linked to Firebase Auth user → orphaned profile
- **Fix:** Persist to localStorage instead of sessionStorage:
  ```javascript
  localStorage.setItem('hr_onboarding_uid', user.uid);
  localStorage.setItem('hr_onboarding_email', user.email);
  ```
  Then clear after profile creation completes

### **BUG-007: get-started.html missing error handling for profile save**
- **File:** `get-started.html`, lines 803-859
- **What's wrong:** `saveProfileSetup()` has NO try/catch — if localStorage write fails (quota exceeded, private browsing), user loses all onboarding data
- **Consequence:** Silent failure, no error message, data lost
- **Fix:** Wrap in try/catch:
  ```javascript
  try {
      localStorage.setItem('hr_profile_' + answers.profileId, JSON.stringify(profileData));
      // ... rest of saves
  } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Unable to save your profile. Please check your browser settings and try again.');
      return;
  }
  ```

---

## 🔵 LOW (P3) — Polish & Cleanup

### **BUG-008: Orphaned email-templates/ directory**
- **File:** `email-templates/admin-invite.html`
- **What's wrong:** SendGrid Cloud Function was removed (functions/index.js now empty), but email-templates/ still exists
- **Consequence:** Dead code, confusion
- **Status:** Email template is NOT referenced anywhere in production code (grep found zero references)
- **Fix:** Delete `email-templates/` directory if no longer needed, OR document that it's kept for reference

### **BUG-009: No Firestore write confirmation on profile creation**
- **File:** `get-started.html`, line 835
- **What's wrong:** After saving profile to localStorage, user is immediately redirected — no confirmation that data was saved
- **Consequence:** User unsure if onboarding succeeded
- **Fix:** Add visual confirmation before redirect:
  ```javascript
  localStorage.setItem('hr_profile_' + answers.profileId, JSON.stringify(profileData));
  // Show success message
  document.getElementById('summaryStatus').textContent = '✅ Profile saved!';
  ```

### **BUG-010: Legacy admin key migration incomplete**
- **Files:** `admin.html:585-600`, `admin.html:1626`
- **What's wrong:** Code still reads from `hr_additional_admins` (legacy) and migrates to `hr_profile_admins_{id}` (current), but migration is manual (user must visit admin page)
- **Consequence:** If user never visits admin page, legacy admins are never migrated to Firestore
- **Fix:** Add one-time migration on login.html after auth (proactive migration)

---

## ✅ VERIFIED SAFE — No Bug

### **SAFE-001: SessionStorage handoff pattern (login → get-started)**
- **Files:** `login.html:567-570`, `get-started.html:828-855`
- **Status:** Pattern is correct — sessionStorage is used for temporary auth state during onboarding flow
- **How it works:**
  1. User clicks "Create New Profile" on login.html (logged in)
  2. `hr_pending_user_uid` and `hr_pending_user_email` stored in sessionStorage
  3. User redirected to get-started.html
  4. get-started.html reads sessionStorage, attaches `creatorEmail`/`ownerEmail` to profile
  5. sessionStorage cleared after profile creation
- **Edge case:** If user refreshes, data is lost (BUG-006)

### **SAFE-002: Firebase config still references habitrewards-131 project**
- **Files:** All HTML files with Firebase config
- **Status:** This is CORRECT — Firebase project ID is `habitrewards-131` (confirmed in .firebaserc)
- **Explanation:** Custom domain `mydailywin.web.app` is an alias, but the underlying Firebase project is still `habitrewards-131`

### **SAFE-003: SendGrid function removed, no orphaned calls**
- **Status:** `grep -rn "sendAdminInvite" *.html` returned ZERO matches
- **Confirmed:** No HTML page references the old Cloud Function URL
- **Safe to leave:** functions/index.js is now a placeholder (lines 1-10)

---

## 📊 localStorage Key Audit — Complete Map

**Profile metadata:**
- `hr_profile_{id}` — Profile doc (name, forWho, template, creatorEmail, ownerEmail)
- `hr_profiles_index` — Array of all profiles on device
- `hr_user_profiles_{uid}` — Profiles created by Firebase Auth user
- `hr_managed_profiles_{email}` — Profiles where user is admin

**State data (per-profile):**
- `hr_state_{id}` or `hr_state` (legacy stu) — Habit completion state
- `hr_admin_{id}` or `hr_admin` (legacy stu) — Admin config (tasks, rewards, levels)
- `hr_week_{id}` — Weekly reset tracking
- `hr_date_{id}` — Daily reset tracking
- `hr_reports_{id}` — Daily reports
- `hr_payout_requests{suffix}` — Payout request fallback
- `hr_completed_log{suffix}` — History data
- `hr_feedback{suffix}` — Feedback history

**Admin management (per-profile):**
- `hr_profile_admins_{id}` — Current admin list (replaces legacy)
- `hr_profile_invites_{id}` — Pending admin invites
- `hr_admin_notifications_{id}` — Admin notifications fallback
- `hr_additional_admins` or `hr_additional_admins_{id}` — LEGACY (still read for migration)

**Global:**
- `hr_proposals` — Task proposals
- `hr_survey_log` — Onboarding survey export
- `hr_quote_*` — Quote display state
- `theme` — Dark/light mode

**Onboarding (temporary):**
- `hr_onboarding_uid` — User UID during profile creation (should be sessionStorage, see BUG-006)
- `hr_onboarding_email` — User email during profile creation (should be sessionStorage)

**Session-only (cleared after use):**
- `hr_pending_profile` — Profile ID for admin page auth redirect
- `hr_pending_profile_name` — Profile name for display
- `hr_pending_user_uid` — User UID for profile linking
- `hr_pending_user_email` — User email for profile ownership
- `hr_admin_tab` — Last active admin tab

---

## 🎯 Priority Summary

**P0 (1 bug):** BUG-001 — get-started.html must write to Firestore  
**P1 (3 bugs):** BUG-002 (XSS), BUG-003 (CSP), BUG-004 (authDomain)  
**P2 (3 bugs):** BUG-005 (key mismatch), BUG-006 (refresh race), BUG-007 (error handling)  
**P3 (3 items):** BUG-008 (cleanup), BUG-009 (UX), BUG-010 (migration)

**Total:** 10 bugs identified  
**Safe items:** 3 verified patterns (no action needed)
