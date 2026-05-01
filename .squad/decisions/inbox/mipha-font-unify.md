# Decision: Unify Font Stack and CSS Variable Source

**Author:** Mipha (User Dev)
**Date:** 2025-07-15
**Triggered by:** Sidon UX Audit — font inconsistency, unused shared.css, hardcoded colors

## Decision

1. **Nunito is the single font** for all user-facing pages. Quicksand is removed.
2. **shared.css is imported first** in every page, before any `<style>` block.
3. **No duplicate `:root` blocks** — pages inherit CSS variables from shared.css. Only dark mode overrides or page-specific additions go in page-level `<style>`.
4. **var(--bg) is #f7f7f7** everywhere. The old app.html value of #f0f2f5 is retired.

## Rationale

- Three font stacks caused visual inconsistency across the funnel (marketing → login → app).
- Duplicate `:root` declarations meant color changes required editing 4+ files.
- shared.css already had accessibility utilities, reset styles, and touch targets that were going unused.

## Scope

- app.html, index.html, home.html, login.html, get-started.html
- admin.html is Urbosa's domain — not touched
- JS color references (gamification levels) left as hardcoded hex — CSS vars don't work in JS data

## Impact

- Net -42 lines of duplicate CSS removed
- All pages now inherit from one source of truth
- Future color/font changes only need shared.css edits
