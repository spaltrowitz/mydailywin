# Decision: Logo & Font Redesign (home.html)

**Author:** Mipha (User Dev)
**Date:** 2026-07-18
**Requested by:** Shari Paltrowitz

## What Changed

1. **Logo**: Reverted from inline SVG trophy back to 🏆 emoji (72px, clean sizing)
2. **Font**: Swapped Nunito → Quicksand across home.html (Google Fonts)
3. **Title**: Removed gold "Win" color split — hero h1 is now plain "MyDailyWin"

## Why

Shari felt the SVG trophy looked worse than the emoji and the Nunito + gold-accent combo felt gimmicky rather than professional. Quicksand is rounder and more playful while staying clean — a better fit for a gamified habit app.

## Impact

- **home.html only** — app.html and other pages unaffected
- Purple accents (`--secondary`) preserved; they complement Quicksand well
- No behavioral changes — purely visual/typographic

## Team Notes

- If app.html or other pages use Nunito, we may want to align fonts globally in a future pass
- The emoji approach is cross-browser safe and avoids extra SVG complexity
- Quicksand weights available: 400, 500, 600, 700
