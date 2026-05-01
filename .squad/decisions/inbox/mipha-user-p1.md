# Mipha — User P1/P2 Decisions

## Decision 1: PWA Install Prompt Strategy
**Choice:** Custom banner in app.html (card-style, dismissible), inline hero button in home.html.
**Why:** app.html users are existing — a card banner gives them context without being intrusive, and dismiss state persists in localStorage. home.html visitors are new — an inline button in the hero CTA area is natural and non-disruptive.
**Trade-off:** We don't show the banner again after dismiss. If the user changes their mind, they'd need to clear localStorage or use the browser menu. This prevents nagging.

## Decision 2: Login Bonus Confetti — Tier 1 (20 particles)
**Choice:** 20 confetti particles for login bonus, matching Tier 1 (micro-celebration) from the gamification skill.
**Why:** Login bonus is a small daily moment — too much confetti would devalue the bigger celebrations (level-up = 50, streak milestone = 45). Keeping the hierarchy clear preserves the emotional payoff of bigger achievements.

## Decision 3: All Done Celebration — Tier 2 (50 particles)
**Choice:** 50 confetti particles with a green gradient card and dismiss button. Uses sessionStorage to fire once per session per day.
**Why:** Completing ALL daily tasks is the peak engagement moment — it deserves a Tier 2 celebration. sessionStorage (not localStorage) means it fires once per browser session but will re-trigger if the user closes and re-opens, which feels correct for a "welcome back, you already did it!" moment. The card auto-hides if tasks are undone.

## Decision 4: No sound effects added
**Choice:** Visual-only celebrations per user directive.
**Why:** Shari explicitly stated sound effects are not a priority. The gamification skill includes sound guidelines but we deferred them.

## Decision 5: manifest.json background_color
**Choice:** Updated `#f0f2f5` → `#f7f7f7`. Left `theme_color` at `#58cc02`.
**Why:** `--bg` in shared.css is `#f7f7f7`. The mismatch caused a visible flash on PWA splash screen. `theme_color` already matches `--primary`.
