# Decision: Forgot Password Flow

**Author:** Daruk (Backend Dev)  
**Date:** 2025-07-17  
**Status:** Implemented  
**Triggered by:** Sidon UX audit finding P2

## Context
Users who sign in with email/password had no way to reset a forgotten password. This is a standard Firebase Auth capability that was simply missing from the UI.

## Decision
Added an inline "Forgot password?" link and reset form to `login.html`, using Firebase Auth's built-in `sendPasswordResetEmail()`. No modal — keeps it lightweight and consistent with the existing toggle pattern (email form show/hide).

## Key choices
1. **Inline form, not modal** — The login page already toggles the email form inline. Adding a reset form as a sibling div follows the same pattern. No new UI paradigms introduced.
2. **Pre-fill email** — If the user already typed their email in the login form, it carries over to the reset form. Small UX win, zero cost.
3. **Friendly error messages** — Firebase error codes mapped to human-readable strings. Generic fallback for unexpected errors (no leaking internal details).
4. **No backend changes** — `sendPasswordResetEmail` is client-side Firebase Auth. No Cloud Function, no Firestore rules changes needed.

## Files changed
- `login.html` — CSS, HTML (reset form + forgot link), JS (showResetForm, hideResetForm, sendResetEmail, showSuccess, hideSuccess)

## Risks / follow-ups
- Firebase's default password reset email template is generic. Could customize it in Firebase Console > Authentication > Templates if branding matters.
- Rate limiting is handled by Firebase itself (`auth/too-many-requests`), so no abuse concern.
