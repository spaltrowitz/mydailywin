# Research: Profile Sync + Homepage Beautification

## Current Architecture

### Profile Data Flow
1. **Get Started (onboarding)** — `get-started.js`
   - Creates profile with `generateProfileId()` (timestamp+random base36)
   - Saves to `localStorage` as `hr_profile_{id}` (JSON: name, activities, template, etc.)
   - Saves to `hr_profiles_index` (array of {id, name})
   - Links to auth user via `hr_user_profiles_{uid}`
   - **Does NOT save to Firestore** — `get-started.html` doesn't even load Firebase SDKs

2. **App page** — `app.js`
   - Reads profile name from `localStorage` (`hr_profile_{id}`)
   - Falls back to "Friend" if not found
   - **Does** sync `userState/{id}` to Firestore (points, streaks, tasks)
   - Cloud sync only works when user is signed in (`auth.onAuthStateChanged`)

3. **Admin page** — `admin.js`
   - Reads profile name from `localStorage` (`hr_profile_{id}`)
   - Falls back to "User" if not found
   - Checks Firestore `profiles/{id}` for owner/admin authorization
   - **But** `profiles/{id}` doc is never created by `get-started.js`!

4. **Login page** — `login.js`
   - Lists profiles from `hr_user_profiles_{uid}` in localStorage
   - Shows owned + managed profiles
   - Handles redirect back to admin page after sign-in

### Key Gaps
- Profile config (name, tasks, template) only in localStorage — not cross-device
- `profiles/{id}` Firestore document referenced by admin.js but never created
- Admin page shows profile ID as name when localStorage profile data missing
- App shows "Friend" when localStorage profile data missing

## Fix Plan

### 1. Save profile to Firestore during onboarding
- Add Firebase SDKs to `get-started.html`
- After `saveProfileSetup()`, also write to Firestore `profiles/{id}`
- Include: name, activities, template, ownerEmail, createdAt

### 2. Load profile from Firestore on new devices
- In `app.js`: if `hr_profile_{id}` not in localStorage, fetch from Firestore `profiles/{id}`
- In `admin.js`: same fallback
- Cache to localStorage after fetching

### 3. Homepage beautification
- Remove dark mode from phone mockup (force light theme on `.phone-screen` and `.phone-tap-hint`)
- Remove "tap to explore" button dark mode styles
- Visual polish: spacing, colors, shadows

## Files to Modify
- `get-started.html` — add Firebase script tags
- `js/get-started.js` — add Firestore write in `saveProfileSetup()`
- `js/app.js` — add Firestore fallback for profile name loading
- `js/admin.js` — add Firestore fallback for profile name loading
- `css/home.css` — force light mode on phone mockup, beautify
