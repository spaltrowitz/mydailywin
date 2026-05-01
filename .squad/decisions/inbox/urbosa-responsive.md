# Decision: Admin Dashboard Responsive Breakpoints

**Author:** Urbosa (Admin Dev)
**Date:** 2026-07-15
**Status:** Implemented
**Commit:** d7ea9b2

## Context

admin.html had no responsive design. The 7-tab horizontal bar overflowed on mobile screens, and cards/tables/forms were unusable on phones and tablets. Shari checks the admin dashboard from her phone.

## Decision

Added 3 responsive breakpoints to `css/admin.css` (additive overrides only):

| Breakpoint | Target | Key Changes |
|---|---|---|
| `max-width: 1024px` | Tablet | Reduced tab/card padding, full-width container |
| `max-width: 768px` | Mobile | Scrollable tab strip, stacked top bar, table scroll, smaller fonts, stacked payment rows, fullscreen modals |
| `max-width: 375px` | Small phone | Single-column stat grid, further size reductions |

### Tab Bar Approach: Scrollable Strip

Chose horizontal scrollable strip (`overflow-x: auto`, hidden scrollbar, `flex-wrap: nowrap`) over hamburger menu because:
- All 7 tabs remain visible and immediately accessible
- No JS changes required (no toggle state)
- Consistent with the existing tab interaction pattern
- Hamburger hides navigation — bad UX for a dashboard where the parent needs to jump between tabs quickly

### Table Approach: Horizontal Scroll

Tables use `display: block; overflow-x: auto` rather than stacking rows because:
- Preserves column relationships (task name ↔ points ↔ dollar value)
- Task/payment/level tables have 3-4 columns — stacking would be visually confusing

## Files Changed

- `css/admin.css` — 271 lines added (media queries appended at end)

## No Changes To

- `admin.html` — viewport meta tag already present, no structural HTML changes
- Desktop layout — all existing styles untouched
- JavaScript — no behavioral changes

## Cross-Agent Notes

- **Mipha:** If user-facing pages adopt similar tab patterns, same scrollable strip approach works
- **Sidon:** This addresses P2 Decision #1 from the UX audit (responsive breakpoints 375px/768px/1024px)
