# Sidon — Fresh UX/Design Sweep (Post-Implementation)

**Date:** 2026-05-01
**Agent:** Sidon (UX/Design)
**Scope:** app.html, index.html, home.html, login.html, get-started.html

---

## NEW Findings (not in first audit)

### F1 — No PWA Install Prompt Handler
**Priority:** P1
**Location:** All pages — js/sw-init.js, manifest.json
**Issue:** `beforeinstallprompt` event is not intercepted anywhere. The browser's native install banner is easily dismissed and never returns. There is no custom "Add to Home Screen" UI. For a daily-use app targeting less tech-savvy users, this is a critical onboarding gap — if they don't install it as a PWA, they'll forget the URL.
**Recommendation:** Add a `beforeinstallprompt` handler in sw-init.js. Show a sticky bottom banner on app.html (first 3 visits) with "📲 Install MyDailyWin for easy access" + Install button. Dismiss after install or after 3 ignores. Store state in localStorage.

### F2 — Login Bonus Disappears Too Fast (3 seconds)
**Priority:** P1
**Location:** app.html ~1497-1501
**Issue:** The daily login bonus card ("+25 pts just for showing up!") auto-hides after 3 seconds via `setTimeout`. On slower devices or if the user isn't looking, they miss it entirely. There's no celebration modal, no confetti, no pause — the most important daily re-engagement hook vanishes silently. Duolingo's login streak celebration is a full-screen moment.
**Recommendation:** Replace the 3-second auto-hide with a tappable celebration card that stays until dismissed. Add confetti on login bonus. Make it feel like an event, not a flash.

### F3 — Spin Wheel Still Uses Linear 100ms Interval (No Easing)
**Priority:** P2
**Location:** app.html ~1567-1602
**Issue:** The spin wheel animation still swaps emojis at a flat 100ms interval with no deceleration. It stops abruptly after 20 iterations. This feels mechanical, not suspenseful. The "revealing" phase should build anticipation like a slot machine slowing down.
**Recommendation:** Replace the flat interval with exponential deceleration: start at 60ms, end at 400ms over ~15 steps. Add a brief scale pulse on final reveal. The existing `jackpot` keyframe is defined but never used — wire it up for big wins (100+ pts).

### F4 — Achievement System Still Only 4 Achievements, Toast-Only
**Priority:** P2
**Location:** app.html ~1793-1821
**Issue:** Now that celebration modals exist for levels and streaks, achievements are the odd one out — they still only trigger a toast notification. There are only 4 achievements (first_dollar, week_streak, month_streak, ten_dollars). Missing many natural milestones: first task ever, 5-day streak, 50-day streak, 100-day streak, $5 earned, $25 earned, $50 earned, all tasks in one day, first weekly bonus, first spin, etc.
**Recommendation:** Phase 1: Give achievements a celebration modal (reuse the celebration-modal pattern). Phase 2: Add 6-8 more achievements for natural milestones. Phase 3: Add an achievement gallery viewable from Settings.

### F5 — task-help-btn Still 36x36px (Below 44px Touch Target)
**Priority:** P2
**Location:** app.html ~294-310
**Issue:** Despite shared.css defining 44px touch targets, the `task-help-btn` is explicitly set to `width: 36px; height: 36px`. This was flagged in the first audit and persists. On mobile, these tiny "?" buttons are hard to tap, especially for the target demographic.
**Recommendation:** Change to `min-width: 44px; min-height: 44px;` while keeping the visual circle at 36px using padding. The touch target should be invisible but tappable.

### F6 — Onboarding Checkbox Touch Targets 20x20px
**Priority:** P2
**Location:** get-started.html ~204-218
**Issue:** The `.checkbox-item .cb` elements are 20x20px visual checkboxes. While the parent `.checkbox-item` div has adequate padding, the visual indicator itself is small and may confuse users who try to tap the checkbox specifically rather than the row.
**Recommendation:** Increase `.cb` to 28x28px visually. The parent row is already the full tap target so this is mainly a visual clarity fix.

### F7 — No "Empty State" When All Tasks Done
**Priority:** P2
**Location:** app.html — render() function ~2262-2284
**Issue:** After completing all daily tasks, the task list shows all items with strikethrough — but there's no celebratory empty state. Compare to Duolingo which shows "All done for today! 🎉" with a character animation. This is the moment to reinforce the daily loop.
**Recommendation:** When all tasks are completed, show a full-width card below the tasks: "🎉 All done today! You're a superstar! Come back tomorrow for new tasks." with the user's streak count and a "Share Progress" button.

### F8 — manifest.json background_color Mismatch
**Priority:** P3
**Location:** manifest.json line 8
**Issue:** `background_color` is `#f0f2f5` but shared.css defines `--bg: #f7f7f7` and app.html uses `var(--bg)`. This causes a flash of the wrong color during PWA splash screen loading.
**Recommendation:** Change manifest.json `background_color` to `#f7f7f7` to match the CSS variable.

### F9 — Screenshots Array Empty in manifest.json
**Priority:** P3
**Location:** manifest.json line 31
**Issue:** `screenshots: []` — modern Android/Chrome uses screenshots to present a richer install experience. Without them, the install prompt is generic.
**Recommendation:** Add 2-3 screenshots (narrow/phone viewport) of the app in action: hero view, task list, celebration moment. These can be PNGs generated from the app.

### F10 — No Escape Key Handler for Modals in app.html
**Priority:** P3
**Location:** app.html — openModal/closeModal functions ~3174-3237
**Issue:** home.html has `document.addEventListener('keydown', ...)` for Escape to close menus/modals, but app.html (which has 10+ modals) has NO keyboard escape handler. Desktop/tablet users with keyboards can't dismiss modals with Escape.
**Recommendation:** Add a global keydown listener: on Escape, close the topmost `.modal.active`. This also improves accessibility.

### F11 — Dark Mode Not Available on login.html, home.html, get-started.html
**Priority:** P3
**Location:** login.html, home.html, get-started.html
**Issue:** app.html has a dark mode toggle. If a user enables dark mode in the app, navigating to home.html or login.html shows a jarring light-mode page. No pages outside app.html respect the dark mode preference.
**Recommendation:** Read `localStorage.getItem('theme')` on all pages and apply a `dark-mode` class. Add dark-mode CSS variables to shared.css. Start with login.html (most commonly visited from app).

### F12 — Login Bonus Not Animated / No Confetti
**Priority:** P2
**Location:** app.html ~1487-1501
**Issue:** The daily login bonus awards 25 pts silently — `addPoints(25)` is called but no `triggerConfetti()` or visual celebration is fired. Compare to the spin wheel, task completion, and streak milestones which all trigger confetti. The login bonus — the most important re-engagement hook — is the weakest celebration in the app.
**Recommendation:** Add `triggerConfetti()` call after the login bonus. Show the bonus card with a `pop` animation.

### F13 — get-started.html Uses alert() Instead of showToast()
**Priority:** P3
**Location:** get-started.html ~719
**Issue:** `alert('Please enter a name to continue.')` — this is the only remaining `alert()` call across user-facing pages. Native alerts are jarring, unstyled, and block the UI thread.
**Recommendation:** Replace with a styled inline error message below the input field, or import a toast/notification pattern.

### F14 — Unused CSS Keyframes Still Present
**Priority:** P3
**Location:** app.html lines 32-42
**Issue:** `bounce`, `float`, `jackpot`, `goldShine`, `coinDrop`, `shake`, `rainbow` keyframes are defined in the `<style>` block but never referenced by any CSS class. This was flagged in audit #1 as dead code. Some (like `jackpot`) could be put to use for the spin wheel, but the rest are pure dead weight.
**Recommendation:** Either wire `jackpot` into the spin wheel reveal (F3) and delete the rest, or delete all unused keyframes as dead code.

### F15 — shared.css Caches Not Updated in SW
**Priority:** P3
**Location:** sw.js ~10-23
**Issue:** `STATIC_ASSETS` array caches HTML and admin.css but does NOT include `css/shared.css`, `js/firebase-config.js`, `js/utils.js`, or `js/sw-init.js`. If a user goes offline, shared.css won't be cached and the app may render unstyled.
**Recommendation:** Add `'/css/shared.css'`, `'/js/firebase-config.js'`, `'/js/utils.js'`, `'/js/sw-init.js'` to the STATIC_ASSETS array.

---

## Top 5 Highest-Impact NEW Improvements

| Rank | Finding | Impact | Effort |
|------|---------|--------|--------|
| **1** | **F1 — PWA Install Prompt** | Critical for daily retention. Without install, users forget the URL. This is the #1 growth lever for a daily-use app. | Medium |
| **2** | **F2 + F12 — Login Bonus Celebration** | The daily re-engagement moment is currently silent and invisible. Making it a real celebration is the single biggest gamification win remaining. | Low |
| **3** | **F7 — "All Done" Empty State** | The moment of maximum pride (all tasks done) has no reward. A celebratory card here drives sharing and next-day return. | Low |
| **4** | **F3 — Spin Wheel Easing** | The spin is the app's signature gamification moment. The flat animation undermines the excitement. Easing is a small code change with outsized feel improvement. | Low |
| **5** | **F15 — Cache shared.css/JS in SW** | Offline users will get broken styling. Now that shared.css is imported everywhere, it MUST be in the service worker cache. This is a regression from the recent refactor. | Very Low |
