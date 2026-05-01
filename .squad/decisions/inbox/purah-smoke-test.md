# Purah Smoke Test Report — Post-Parallel Agent Session

**Date:** 2026-05-01  
**Scope:** CSP validation, onclick migration, SW cache, file integrity, dark mode, Apple Sign-In  
**Context:** Four agents (Riju/Daruk/Impa/Sidon) committed in parallel with overlapping file changes

---

## 1. CSP Validation

### 🔴 CRITICAL: admin.html CSP missing `cloudfunctions.net` in connect-src
- **File:** admin.html:13
- **Issue:** `js/admin.js:1268` calls `firebase.functions().httpsCallable('sendInviteEmail')`. Firebase callable functions hit `https://us-central1-PROJECT_ID.cloudfunctions.net/...` which is NOT covered by `*.googleapis.com`. The CSP `connect-src` does not include `*.cloudfunctions.net`.
- **Impact:** Admin invite emails will be BLOCKED by browser CSP. Silent failure — no toast, no error visible to user.
- **Fix:** Add `https://*.cloudfunctions.net` to admin.html CSP `connect-src`.

### 🟡 RISKY: app.html and admin.html include `cdn.jsdelivr.net` in script-src but don't use it
- **File:** app.html:13, admin.html:13
- **Issue:** `cdn.jsdelivr.net` is whitelisted in `script-src` but no `<script>` tag loads from jsdelivr in either file.
- **Impact:** Unnecessary attack surface. If an XSS finds an open injection point, it can load arbitrary scripts from jsdelivr.
- **Fix:** Remove `https://cdn.jsdelivr.net` from both CSPs unless needed.

### 🟢 OK: Firebase SDK, Google Auth, Apple Auth, EmailJS
- Firebase compat SDK from `gstatic.com` ✅ (allowed in all pages that use it)
- `*.googleapis.com` in connect-src for Firestore/Auth ✅
- `accounts.google.com` in frame-src for login.html, app.html, admin.html ✅
- `appleid.apple.com` in frame-src for login.html and app.html ✅
- `api.emailjs.com` in admin.html connect-src ✅
- get-started.html and home.html have minimal CSP (no external connects needed) ✅

---

## 2. Onclick Migration

### 🟢 OK: Zero remaining `onclick=` attributes
- Grep across all HTML files returned zero matches.
- All JS files implement `data-action` event delegation with `e.target.closest('[data-action]')` pattern.
- Files verified: js/app.js:2477, js/login.js:342, js/admin.js:1395, js/home.js:105, js/get-started.js:387

---

## 3. SW Cache List

### 🟢 OK: All external JS and CSS files cached
SW `STATIC_ASSETS` includes:
- `/js/app.js` ✅, `/js/admin.js` ✅, `/js/login.js` ✅, `/js/home.js` ✅, `/js/get-started.js` ✅
- `/js/dark-mode.js` ✅, `/js/firebase-config.js` ✅, `/js/utils.js` ✅, `/js/sw-init.js` ✅, `/js/offline.js` ✅
- `/css/app.css` ✅, `/css/admin.css` ✅, `/css/login.css` ✅, `/css/home.css` ✅, `/css/shared.css` ✅
- `/css/get-started.css` ✅, `/css/offline.css` ✅

No missing files detected.

---

## 4. File Integrity

### 🔴 CRITICAL: admin.html missing `</body>` and `</html>` closing tags
- **File:** admin.html (ends at line 515)
- **Issue:** File ends with `<script src="js/admin.js"></script>` — no `</body>` or `</html>` closing tags.
- **Impact:** Technically browsers auto-close, but this is invalid HTML. May cause issues with parsers, SEO tools, or accessibility scanners. Also indicates possible file truncation during parallel commits.
- **Fix:** Add `</body>\n</html>` at end of admin.html.

### 🟢 OK: app.html, login.html properly closed
- Both have `</body>` and `</html>` ✅
- Line counts reasonable (app.html: 523, login.html: 107)

---

## 5. Dark Mode

### 🟡 RISKY: app.html does NOT load `js/dark-mode.js` — FOUC risk
- **File:** app.html (no `<script src="js/dark-mode.js">` in head)
- **Issue:** `js/dark-mode.js` is a head-loaded IIFE that applies dark mode immediately. app.html's dark mode is in `js/app.js` (body-end), which reads `localStorage.getItem('theme')` during state init. There will be a Flash Of Unstyled Content (light → dark flicker) on every page load for dark mode users.
- **Impact:** Visual jank for dark mode users on main app page.
- **Fix:** Add `<script src="js/dark-mode.js"></script>` to app.html `<head>`.

### 🟡 RISKY: admin.html has NO dark mode support at all
- **File:** admin.html
- **Issue:** No `js/dark-mode.js` loaded, no dark mode logic in `js/admin.js`. Body never gets `dark-mode` class.
- **Impact:** Admin page always renders in light mode regardless of user preference.
- **Fix:** Add `<script src="js/dark-mode.js"></script>` to admin.html head, and ensure `css/admin.css` has dark mode styles.

### 🟢 OK: localStorage key consistency
- `js/dark-mode.js` reads `localStorage.getItem('theme')` ✅
- `js/app.js` reads/writes `localStorage.getItem('theme')` / `localStorage.setItem('theme', ...)` ✅
- Same key used across all pages — state will sync correctly.

### 🟢 OK: dark-mode.js loaded by login.html, home.html, get-started.html
- All three load it in `<head>` before body renders ✅

---

## 6. Apple Sign-In

### 🟢 OK: Apple Sign-In properly configured
- **login.html:47**: Button with `data-action="signInWithApple"` ✅
- **js/login.js:178**: `signInWithApple()` function using `OAuthProvider('apple.com')` ✅
- **js/login.js:349**: Event delegation routes `signInWithApple` action correctly ✅
- **CSP login.html:13**: `frame-src` includes `https://appleid.apple.com` ✅
- **CSP app.html:13**: `frame-src` includes `https://appleid.apple.com` ✅

---

## Summary

| Check | Status | Issues |
|-------|--------|--------|
| CSP Validation | 🔴 | cloudfunctions.net missing in admin CSP; jsdelivr unnecessary |
| Onclick Migration | 🟢 | Clean — zero remaining onclick= |
| SW Cache | 🟢 | All files present |
| File Integrity | 🔴 | admin.html missing closing tags |
| Dark Mode | 🟡 | app.html FOUC, admin.html no dark mode |
| Apple Sign-In | 🟢 | Properly configured |

**Gate Status:** 🔴 NOT READY — 2 critical bugs must be fixed before user testing.

### Required Before Deploy:
1. Add `https://*.cloudfunctions.net` to admin.html CSP connect-src
2. Add `</body></html>` to end of admin.html
3. Add `<script src="js/dark-mode.js"></script>` to app.html head

### Recommended (non-blocking):
4. Remove `cdn.jsdelivr.net` from app.html and admin.html CSP script-src
5. Add dark-mode.js to admin.html head
