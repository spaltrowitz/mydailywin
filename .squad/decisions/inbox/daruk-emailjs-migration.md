# Decision: EmailJS Migration to Cloud Function

**Date:** 2025-01-20
**Author:** Daruk (Backend Dev)
**Status:** Implemented

## Context

The admin dashboard (`admin.html`) was using EmailJS client-side with exposed service/template IDs and public key. This was a Medium security finding — any user could inspect the page source and use those credentials to send emails via our EmailJS account.

## Decision

Migrate email sending to a Firebase Cloud Function (`sendInviteEmail`) that:
1. Validates the caller is authenticated via Firebase Auth
2. Calls the EmailJS REST API server-side (credentials never exposed to client)
3. Validates input (email format, required fields)

## Implementation

- **Cloud Function:** `functions/index.js` — exports `sendInviteEmail` (v2 onCall)
- **Client change:** admin.html now uses `firebase.functions().httpsCallable()` instead of EmailJS SDK
- **Removed from client:** EmailJS CDN script, public key, service ID, template ID
- **CSP updated:** `*.cloudfunctions.net` replaces `api.emailjs.com` in connect-src
- **firebase.json:** Added `"functions"` config block

## Trade-offs

- Cold start latency on first invocation (~1-2s) — acceptable for invite emails
- Still using EmailJS (same 200/month free tier limit) — just calling from server side now
- Could migrate to Nodemailer + Gmail app password later for more control

## Deploy Steps

```bash
cd functions && npm install
firebase deploy --only functions
firebase deploy --only hosting
```
