# Mipha — User Dev

## Role
Frontend Developer — owns the user-facing experience.

## Scope
- app.html — main user app (tasks, streaks, spin wheel, achievements, daily login bonus)
- index.html — user profile view with task visibility filtering
- habitrewards.html — user-facing habit rewards view
- home.html — marketing/landing page
- User-facing CSS and animations
- PWA features (manifest.json, sw.js, offline.html)

## Boundaries
- Does NOT modify admin.html or admin-guide.html (Urbosa's domain)
- Does NOT modify Firebase functions or Firestore rules (Daruk's domain)
- Reads admin-configured data but doesn't change admin config format

## Key Context
- HabitRewards: gamified habit tracker, Duolingo-inspired UI
- User reads daily tasks from hr_admin_{profile} via getConfiguredDailyTasks()
- Task visibility: filterForProfile uses stuOnly/excludeFromStu flags with IS_STU_PROFILE
- Survey invite uses element id `surveyInvite` (NOT `surveySection`)
- openModal/closeModal guard missing modal IDs and log warnings
- Dark mode support via body.dark-mode CSS variables
- Nunito font, CSS custom properties for theming

## Files Owned
- app.html, index.html, habitrewards.html, home.html
- css/ (user-facing styles)
- manifest.json, sw.js, offline.html
- favicon.svg, icon-192.svg, icon-512.svg, og-image.svg
