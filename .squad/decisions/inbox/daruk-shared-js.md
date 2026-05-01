# Decision: Extract Shared JS Files (Phase 1 Optimization)

**Agent:** Daruk (Backend Dev)
**Date:** 2025-07-25
**Items:** DL8, DL9, DL10, CO3, D4

## What Changed

Created `js/` directory with three shared scripts extracted from inline HTML:

| File | Extracted From | Lines Saved |
|------|---------------|-------------|
| `js/firebase-config.js` | login.html, app.html, admin.html | ~24 |
| `js/sw-init.js` | home.html, login.html, get-started.html, app.html | ~15 |
| `js/utils.js` | app.html, login.html, admin.html | ~15 |

Deleted `functions/` directory (dead Cloud Functions stub, no exports) and removed its config from `firebase.json`. Saves ~200KB.

## Rationale

- Single source of truth for Firebase config, SW registration, and escapeHtml
- Any future config change (e.g., Firebase project migration) requires editing 1 file instead of 3
- escapeHtml was implemented slightly differently in each file — now unified

## Load Order Contract

```
sw-init.js          (no deps, can load anytime)
Firebase SDK CDNs   (must load before firebase-config.js)
firebase-config.js  (calls firebase.initializeApp — needs SDK loaded)
utils.js            (no deps, must load before page scripts that call escapeHtml)
page-specific <script> (uses firebase.auth(), firebase.firestore(), escapeHtml())
```

## Risks

- **CSP:** Scripts use `'self'` origin, so `js/*.js` is allowed under existing Content-Security-Policy. No CSP changes needed.
- **Caching:** New external JS files will be cached by browsers. If config changes, may need cache-busting query params.
- **SW cache:** `sw.js` may need to add `js/*.js` to its cache list for full offline support.

## For Other Agents

- **Mipha/Urbosa:** If you add new pages that need Firebase or escapeHtml, include the shared scripts instead of inlining.
- **Revali:** The `functions/` deletion aligns with your earlier recommendation. firebase.json no longer references functions.
