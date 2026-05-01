# Daruk — Backend Dev

## Core Context

**Tech Stack:** Backend auth, Firestore rules, Cloud Functions, server-side security

**Key Responsibilities:**
- Firestore rules (ownership, data validation, auth checks)
- Cloud Function security (email delivery, payment logic)
- Authentication flows (Firebase Auth integration)
- Backend data integrity and rate limiting

**Critical Decisions (Current):**
1. **Ownership Model:** `ownerEmail` on profile doc identifies creator. `profiles/{profileId}/admins/{email}` subcollection tracks additional admins.
2. **Email Delivery:** Migrated from dual EmailJS+Cloud Function to Cloud Function server-side (EmailJS → Cloud Function migration, 2026-05-01).
3. **PROFILE_ID Pattern:** Validation via `/^[a-zA-Z0-9_-]+$/` prevents localStorage/Firestore path injection.
4. **Admin Auth:** Firestore-only authority for admin status. localStorage never trusted for authorization.
5. **Apple Sign-In:** Added OAuthProvider('apple.com') to login.html (2025-07-25).
6. **CSP Headers:** Content-Security-Policy + security headers in firebase.json (script-src 'self' + CDN origins, no unsafe-inline for scripts).

**Recent Achievements:**
- ✅ P0 Firestore rules overhaul (ownership scoping, field validation)
- ✅ P1 CSP headers + security headers added to firebase.json
- ✅ Phase 1–4 code consolidation (habitrewards.html deleted, index.html redirected to home.html)
- ✅ Bug bash: Auth, onboarding, data flow reviewed and stabilized
- ✅ EmailJS migration: Client-side keys removed, Cloud Function handles all email delivery (2026-05-01)
- ✅ Apple Sign-In implementation (2025-07-25)

**Known Blockers:**
- get-started.html must write profile docs to Firestore during onboarding (currently localStorage-only). Until fixed, Firestore ownership checks on `payoutRequests`, `userNotifications`, `userState`, `taskProposals` remain auth-only (TODO comments in firestore.rules).

**Ongoing Concerns:**
- Firebase API key not restricted (expected for client SDK)
- No explicit rate limiting on Cloud Function or EmailJS sends
- Ensure debug console.log statements fully removed (checked in Wave 2 security fixes)

---

## Recent Work (2026 Sprint)

### 2026-05-01T22:40 — EmailJS Migration & Cross-Agent Learnings

**Session:** 2026-05-01T22-40-27Z — backlog-sprint  

**Migration Summary:**
- **Before:** EmailJS public key and service ID exposed in admin.html (client-side)
- **After:** Created `sendInviteEmail` Cloud Function, admin.html now uses `firebase.functions().httpsCallable()`
- **Security Impact:** Email credentials now server-side only; client never handles sensitive keys

**Changes Made:**
- functions/index.js: Added `sendInviteEmail` (v2 onCall) with input validation
- admin.html: Removed EmailJS SDK script, public key, service ID, template ID references
- firebase.json: Added `"functions"` config block
- CSP updated: `*.cloudfunctions.net` replaces `api.emailjs.com` in connect-src

**Cross-Agent Context:**
- **From Riju:** CSP now enforces script-src 'self' + whitelist (no unsafe-inline). Cloud Function invokes via `firebase.app()` callable (same-origin, CSP-safe).
- **From Impa:** Cloud Function imports included in functions/index.js bundle. Service worker v5 includes all backend assets.
- **From Sidon:** Email delivery (invite links in admin, recovery links in auth) now handled by callable. UI already has styled toast notifications for success/error.

**Learnings:**
- Callable Cloud Functions authenticate via Firebase Auth tokens automatically (no CORS headers needed)
- EmailJS credentials in backend config allows future library swap without frontend code changes
- Error handling: catch both Network errors and function-specific errors (e.g., invalid email)
- Cold start latency ~1-2s acceptable for invite emails

---

### Historical Context (Archived)

**Previous Sessions Summary:**
- **2026-02-27:** Full team security review. P0 Firestore rules overhaul with ownership scoping and field validation.
- **2026-03-03:** CSP + security headers added to firebase.json. `isProfileOwner()` fixed with `exists()` guard.
- **2026-03-03:** Phase 1-4 code consolidation: habitrewards.html deleted, index.html redirected to home.html.
- **2026-04-14:** Comprehensive bug bash covering auth, onboarding, data flow. 10 bugs identified and prioritized.
- **2026-04-30:** Security audit completed by Riju. Apple Sign-In added. EmailJS migration prepared.

**Full historical details:** See `.squad/agents/daruk/history-archived.md` for pre-May 2026 context (P0 details, bug bash findings, phase consolidation work).

---
