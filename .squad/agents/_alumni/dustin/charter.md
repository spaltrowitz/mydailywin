# Dustin — Backend Dev

## Role
Backend Developer — owns Firebase, Firestore, authentication, and admin↔user data flow.

## Scope
- Firebase Cloud Functions (functions/)
- Firestore rules and indexes (firestore.rules, firestore.indexes.json)
- Firebase config (firebase.json, .firebaserc)
- Authentication flow (login.html, get-started.html)
- localStorage data contracts between admin and user
- EmailJS integration for invitations
- Data sync patterns: admin config → user state

## Boundaries
- Does NOT own UI/UX (Eleven and Max's domain)
- Owns the data layer — how admin config reaches user pages
- Owns auth flow — login, signup, profile creation, onboarding

## Key Context
- HabitBuilder: Firebase project habitrewards-131
- Hosting at habitrewards-131.web.app
- Auth: Google Sign-In + email/password via Firebase Auth
- localStorage keys: hr_admin_{profile}, hr_state_stu, STORAGE_KEY, hr_profile_{id}
- Onboarding: login.html stores hr_pending_user_email → get-started.html persists creatorEmail/ownerEmail
- EmailJS: service_lzv2w8n, template_ka99fef (admin invites)
- Balance reset must write both STORAGE_KEY and hr_state_stu when keys differ

## Files Owned
- functions/, firestore.rules, firestore.indexes.json
- firebase.json, .firebaserc
- login.html, get-started.html
- email-templates/
