# Decision: Apple Sign-In Implementation

**Author:** Daruk  
**Date:** 2025-07-25  
**Status:** Implemented

## Context
Apple Sign-In added to login.html alongside existing Google Sign-In.

## Decision
- Uses Firebase Auth OAuthProvider('apple.com') with popup flow (same as Google)
- Scopes: email, name
- Auth state listener handles post-sign-in redirect (no separate redirect logic needed)
- Button uses inline SVG for Apple logo (no external image dependency)

## Impact
- No changes to auth state listener or redirect logic — Apple auth result flows through same `onAuthStateChanged` handler
- Apple may return a private relay email on first sign-in; display name may be null on subsequent sign-ins (Apple only sends name on first auth)
