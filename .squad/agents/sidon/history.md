# Sidon — History

## Project Context
**Project:** MyDailyWin — gamified habit-tracking web app
**Stack:** Vanilla HTML/CSS/JS, Firebase (Hosting + Auth + Firestore), EmailJS, PWA
**User:** Shari Paltrowitz
**Repo:** mydailywin (spaltrowitz/mydailywin)

The app is Duolingo-inspired: daily tasks earn points (100 pts = $1), streaks build over time, spin wheels give bonuses, and users level up. An admin dashboard lets a parent/manager configure tasks and approve payouts. Key gamification surfaces: app.html (spin wheel, achievements, streaks), index.html (profile), habitrewards.html (rewards view).

## Learnings

### Full UX/Design Audit (completed)
- **Gamification gaps vs Duolingo:** Zero sound effects, weak confetti (10 particles vs 50+), no level-up/streak milestone celebration modals, no haptic feedback. These are the biggest reward psychology gaps.
- **Spin wheel (app.html ~1452-1512):** Emoji swap at 100ms intervals, linear rotation, no easing. Feels chaotic, not suspenseful. Needs deceleration curve and celebration modal for big wins.
- **Confetti (app.html ~3233-3244):** Only 10 particles, no horizontal spread, no rotation. Coin rain (~1514-1527) has 8 particles with 80ms stagger (slightly better).
- **Achievement system (app.html ~1703-1731):** Only 4 achievements, only toast notification (no modal), never showcased in profile. Missing milestones for 50/100/250/500/750 pts.
- **Level-up (app.html ~2092-2155):** 10-level progression is well-designed but level transitions are silent — no modal, no animation, just text swap.
- **Task completion (app.html ~2374-2436):** Gets pop animation + toast + weak confetti. Missing sound, haptic, and stronger visual celebration.
- **Unused CSS keyframes:** bounce, float, jackpot, goldShine, coinDrop, shake, rainbow are all defined but never used — dead code.
- **Visual consistency score: ~5/10.** Three different font stacks (Nunito in app, Quicksand in marketing, system fonts in admin). Background color mismatch (#f0f2f5 in app vs #f7f7f7 everywhere else). ~45 hardcoded hex values not using CSS variables. Card border-radius varies (16px admin, 20px app, 24px login). Button border-radius varies (12px-50px across pages).
- **Dark mode only in app.html.** Other pages have no dark mode support.
- **Responsive gaps:** app.html has zero layout media queries. admin.html has none. login.html has none. Only home.html and get-started.html have partial responsive breakpoints.
- **Accessibility partial:** prefers-reduced-motion respected in app.html. Touch targets mostly 44px+ but task-help-btn is 36px and checkboxes are 20-24px. Some contrast issues on light backgrounds.
- **PWA solid foundation:** manifest.json complete, service worker with cache-first strategy, offline.html branded and functional. Missing: install prompt handler (beforeinstallprompt), manifest screenshots, OG image format mismatch (SVG vs PNG).
- **Navigation pain points:** app.html is all-modals, no tab navigation or bottom nav. Admin tabs overflow on mobile. No in-app link between user and admin views. 8-step onboarding may cause drop-off.
- **shared.css exists but is NOT imported** by any user-facing page — accessibility utilities unused.
- **Key file paths:** css/admin.css (admin styles), css/shared.css (unused shared styles), manifest.json (PWA), sw.js (service worker), offline.html (offline fallback)
