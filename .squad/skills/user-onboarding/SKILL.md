# Skill: User Onboarding

**Confidence:** high
**Domain:** Firebase Auth, Firestore Rules, Profile Bootstrap
**Last validated:** 2026-05-06

## When to use
When adding a new user profile to MyDailyWin (beyond the legacy "stu" profile).

## Checklist for new user profiles

### 1. Firestore Rules
- [ ] Ensure admin subcollection create rule allows profile owner to bootstrap first admin (`|| isProfileOwner(profileId)`)
- [ ] Add the new profile ID to userState read/write rules if user won't sign in (or generalize the anonymous auth pattern)
- [ ] Deploy rules BEFORE running the seed page: `firebase deploy --only firestore:rules`

### 2. Auth Setup
- [ ] Define `const auth = firebase.auth();` in any JS file that uses `auth`
- [ ] Keep meta CSP aligned with firebase.json server CSP (both need `'unsafe-inline'`, `accounts.google.com`)
- [ ] Anonymous auth for users who won't sign in: `auth.signInAnonymously()` in app.js
- [ ] `saveToCloud()` handles `currentUser.email || 'user-device'`

### 3. Seed Page
- [ ] Create a seed page (or generalize seed-stu.html) that writes profile doc + first admin
- [ ] Reset function must clear: localStorage keys, Firestore `userState/{id}`, `payoutRequests` where profileId matches, `userNotifications` where profileId matches
- [ ] Owner email must match the signed-in user running the seed page

### 4. Login/Admin Flow
- [ ] Login page `loadUserProfiles()` queries Firestore for owned profiles (not just localStorage)
- [ ] Admin auth allows first-time access when profile doesn't exist in Firestore yet
- [ ] Admin auth falls back to localStorage for returning admins when Firestore is unreachable

### 5. User App
- [ ] `STORAGE_KEY` pattern: `hr_state_{profileId}` (not `hr_state` for new profiles)
- [ ] `ADMIN_KEY` pattern: `hr_admin_{profileId}` (only legacy "stu" uses bare `hr_admin`)
- [ ] Install banner only shows on mobile (check user agent + viewport)
- [ ] Event delegation registered before init calls in admin.js

### 6. State Sync
- [ ] User app syncs to Firestore `userState/{profileId}` on every `saveState()`
- [ ] Admin dashboard reads from Firestore on load (`loadStateFromCloud()`)
- [ ] Debounce cloud saves (5s timeout) to avoid excessive Firestore writes

## Anti-patterns to avoid
- Never assume localStorage exists on a different device
- Never require `status is string` in Firestore admin create rule (seed pages send `role`)
- Never put event delegation after init calls that could throw
- Never reference `auth` without defining it first
- Never have mismatched meta CSP vs server CSP
