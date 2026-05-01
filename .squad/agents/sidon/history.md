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

### Post-Implementation UX Sweep (completed)
**Context:** Team shipped celebration modals, enhanced confetti, responsive breakpoints, unified fonts/CSS, shared JS, XP hardening. This sweep found NEW gaps.

**Key findings (15 total, see .squad/decisions/inbox/sidon-user-sweep.md):**
- **PWA install prompt missing (P1):** No `beforeinstallprompt` handler anywhere. Critical for daily-use app retention.
- **Login bonus celebration weak (P1):** +25 pts awarded silently, card vanishes after 3 seconds with no confetti. This is the #1 daily re-engagement hook and it's the weakest celebration in the app.
- **Spin wheel still flat animation (P2):** 100ms linear interval, abrupt stop. No easing/deceleration. `jackpot` keyframe defined but unused.
- **Achievements still toast-only (P2):** Only 4 achievements, no modal. Now that level-up and streak milestones have modals, achievements are inconsistent.
- **task-help-btn still 36x36px (P2):** Below 44px touch target. Persists from audit #1.
- **No "all done" empty state (P2):** After completing all tasks, no celebratory card. Missed pride moment.
- **manifest.json background_color mismatch (P3):** #f0f2f5 vs --bg: #f7f7f7. Flash of wrong color on PWA splash.
- **shared.css/JS not in SW cache (P3):** Regression from recent refactor. Offline users get broken styling.
- **Dark mode not on login/home/get-started (P3):** User enables dark mode in app, other pages are jarring light mode.
- **No Escape key handler for app.html modals (P3):** home.html has one, app.html (10+ modals) does not.
- **Unused keyframes still present (P3):** bounce, float, jackpot, goldShine, coinDrop, shake, rainbow — dead CSS.
- **get-started.html uses alert() (P3):** Only remaining native alert in user-facing code.

**Top 5 impact recommendations:**
1. PWA install prompt (growth/retention lever)
2. Login bonus celebration (daily loop psychology)
3. "All done" empty state (pride + sharing driver)
4. Spin wheel easing (signature moment polish)
5. Cache shared.css/JS in service worker (offline regression fix)

---

## 2026-05-01T20:37 — Final Wave: Fresh UX Sweep (15 Findings)

**Session:** 2026-05-01T20-37-00Z  
**Task:** Fresh user-side sweep — found 15 new items including PWA install prompt, login bonus celebration, all-done card, SW cache regression

**Findings (15 Items):**
1. F1 — No PWA Install Prompt Handler (P1, Critical)
2. F2 — Login Bonus Disappears Too Fast (P1, Critical)
3. F3 — Spin Wheel No Easing (P2)
4. F4 — Achievements Toast-Only (P2)
5. F5 — task-help-btn Below 44px Touch Target (P2)
6. F6 — Onboarding Checkbox 20x20px (P2)
7. F7 — No Empty State When All Tasks Done (P2)
8. F8 — manifest background_color Mismatch (P3)
9. F9 — Screenshots Array Empty (P3)
10. F10 — No Escape Key Handler (P3)
11. F11 — Dark Mode Not Available on Other Pages (P3)
12. F12 — Login Bonus No Confetti (P2)
13. F13 — get-started.html Uses alert() (P3)
14. F14 — Unused CSS Keyframes (P3)
15. F15 — SW Cache Missing shared.css/JS (P3, ✅ Daruk fixed)

**Top 5 Impact Ranking:**
1. F1 — PWA Install Prompt (Critical for retention)
2. F2 + F12 — Login Celebration (#1 gamification win)
3. F7 — All Done Card (Max pride moment)
4. F3 — Spin Wheel Easing (Signature moment)
5. F15 — SW Cache (Offline regression)

**Inbox:** .squad/decisions/inbox/sidon-user-sweep.md → merged to decisions.md

**Notes:** 15 findings provide comprehensive roadmap for next phase. Top 5 should be prioritized for next sprint.


### 2025-07-24 — Remaining UX Sweep Implementation (4 items)

**Session:** Implemented F3, F10, F11, F13 from sweep findings

**Changes:**
1. **Spin wheel easing (F3, P2):** Replaced 100ms `setInterval` with recursive `setTimeout` using exponential deceleration curve (`60ms * e^(1.8 * progress)`). Wheel now starts fast (~60ms), slows dramatically (~360ms at end), creating genuine suspense before reveal. Pre-determines winner so final emoji is correct.

2. **Escape key handler (F10, P3):** Added global `keydown` listener in app.js that finds the topmost `.modal.active` and calls `closeModal()` on it. Handles all 10+ modals without modification to each one.

3. **Dark mode for login/home/get-started (F11, P3):** Created `js/dark-mode.js` — a tiny init script that reads `localStorage.getItem('theme')` falling back to `prefers-color-scheme: dark`. Added dark mode CSS overrides to `css/login.css`, `css/home.css`, `css/get-started.css`. Colors use the same palette as app.html dark mode (#131f24 bg, #202f36 cards, #37464f borders, #e5e5e5 text).

4. **get-started.html alert() replacement (F13, P3):** Added `showToast()` function to `js/get-started.js` and replaced both native `alert()` calls with styled toast notifications. Added `.toast` dark mode styles and `@keyframes slideUp` animation.

**Supporting changes:**
- SW cache bumped to v5, added `js/dark-mode.js` to precache list
- All JS passes `node -c` syntax validation

**Remaining from sweep:** F4 (achievements modal), F5 (touch target), F6 (checkbox size), F14 (dead keyframes)
