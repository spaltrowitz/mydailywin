# Decision: CSP unsafe-inline Elimination

**Author:** Riju (Security)  
**Date:** 2025-01-20  
**Status:** Implemented  

## Context
The security audit flagged `unsafe-inline` in script-src as a High finding. All HTML pages contained inline `<style>` blocks, inline `<script>` blocks (2000+ lines in app.html alone), and 57+ inline `onclick` handlers.

## Decision
1. **Extract all inline code to external files** — CSS and JS separated per page
2. **Convert inline event handlers to delegated listeners** — using `data-action` attributes and a single `document.addEventListener('click', ...)` dispatcher per page
3. **Add CSP meta tags** — `script-src 'self'` + explicit CDN origins (no unsafe-inline)
4. **Keep `'unsafe-inline'` for `style-src` only** — inline style attributes on elements are not a code execution vector and removing them from 500+ elements is impractical without a build system

## CSP Policy (app.html example)
```
script-src 'self' https://www.gstatic.com https://apis.google.com https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com;
connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com;
```

## Trade-offs
- **Pro:** XSS via inline script injection fully mitigated
- **Pro:** No build system required — works with vanilla HTML/JS
- **Con:** `style-src 'unsafe-inline'` remains (acceptable risk)
- **Con:** Event delegation adds ~50 lines per JS file for the dispatcher

## Alternatives Considered
- **Nonce-based CSP** — requires server-side rendering to inject nonces; not viable with static Firebase Hosting
- **Hash-based CSP** — brittle; hashes break on any code change
- **Full style externalization** — impractical without a build step for 500+ inline style attributes

## Files Changed
- `app.html`, `offline.html` — inline code extracted, CSP added, onclick→data-action
- `css/app.css`, `css/offline.css` — new external stylesheets
- `js/home.js`, `js/login.js`, `js/offline.js` — new external scripts
- `admin.html` — CSP connect-src fix (api.emailjs.com)
- `sw.js` — cache manifest updated to v4
