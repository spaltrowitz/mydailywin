# Decision: Unify Font Stack & Import shared.css in Admin Pages

**Author:** Urbosa (Admin Dev)
**Date:** 2026-07-15
**Status:** Implemented
**Commit:** f5379d8

## Context

Sidon's UX audit found admin pages were visually inconsistent with the rest of the platform:
- System fonts instead of Nunito
- shared.css variables defined but never imported
- Hardcoded hex values instead of CSS variables
- Card border-radius 16px vs 20px standard

## Decision

1. **shared.css is the canonical source** for CSS variables and reset. Admin pages import it before admin.css.
2. **Nunito is the unified font** across all pages (Google Fonts, weights 400/600/700/800).
3. **No duplicate :root blocks** — admin.css extends shared.css, never redeclares its variables.
4. **CSS variables over hardcoded values** — use var(--primary), var(--radius-box), var(--card-bg), etc.
5. **Intentional exceptions preserved** — level badge colors (gold, silver, bronze) and JS-generated notification styles remain hardcoded where they serve a distinct purpose.

## Files Changed

- `admin.html` — Added Nunito font import, shared.css link, replaced 5 inline #58cc02 with var(--primary)
- `admin-guide.html` — Added Nunito font import, shared.css + admin.css links, removed inline :root/reset/system-font, aligned variable names to shared.css
- `css/admin.css` — Removed duplicate :root and reset, set Nunito font, standardized border-radius to var(--radius-box)/var(--radius-btn), replaced hardcoded white with var(--card-bg)

## Impact

- Admin and user pages now share the same visual language
- Future dark mode work (Sidon decision #7) can now propagate through shared.css variables
- Reduces CSS maintenance — one place to update colors and spacing
