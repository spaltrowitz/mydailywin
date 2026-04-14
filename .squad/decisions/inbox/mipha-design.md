# Design Decisions — Mipha (2026-04-14)

## Decisions Made

### Inline SVG favicon in hero
Replaced emoji logo with inline SVG from `favicon.svg`. This avoids cross-browser emoji inconsistency and an extra HTTP request. The SVG gradient IDs (`gold`, `green`) are scoped to the hero; if another inline SVG uses those same IDs, they'll conflict — but currently no other inline SVGs exist in home.html.

### Nunito font added to home.html only
Added Google Fonts Nunito to home.html for consistency with app.html. **login.html and get-started.html still use system fonts** — those should be updated in a follow-up to complete typography unification.

### Purple accent strategy
Used `--secondary` (#ce82ff) in 3 places with very light tints. The pattern: structural backgrounds use `#faf5ff`/`#f3e8ff`, borders use `#e9d5ff`, and only the FAQ box uses the full `var(--secondary)` on the border. This keeps green dominant while adding warmth.

## TODO (Remaining)

### og-image.png generation
Neither `rsvg-convert` nor ImageMagick `convert` is available on this machine. The OG meta tags reference `og-image.png` but only `og-image.svg` exists. Social platforms (Facebook, Twitter, LinkedIn) cannot render SVG previews. Options:
1. Install `librsvg` (`brew install librsvg`) and run `rsvg-convert -w 1200 -h 630 og-image.svg -o og-image.png`
2. Use a CI step to auto-generate PNG from SVG on deploy
3. Manually export from a browser/design tool

### Typography unification for login.html and get-started.html
These pages still use system font stack. Should add Nunito import to match home.html and app.html.
