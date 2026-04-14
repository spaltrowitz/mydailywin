## Cross-Agent Context from Full Team Review (2026-02-27)

### From Hopper (Lead/Architect)
- Code duplication enabler for drift bugs — must unify or extract shared code.
- localStorage key mismatch is part of larger architecture issue (admin/app alignment).
- CSP headers required — coordinate with Dustin on firebase.json.
- Firestore rules are security-critical.

### From Max (Admin Dev)
- saveState undefined breaks payout flow.
- Storage key mismatch breaks user balance reads.
- Admin needs to stay in sync with app.html's profile system.

### From Dustin (Backend Dev)
- Firestore rules vulnerability affects app security.
- Service worker caching strategy not versioning properly.
- No real-time localStorage sync between tabs.

### From Robin (Tester)
- Three divergent codebases make testing harder — unification will reduce test burden.
- Dark mode gaps in home.html and offline.html (Eleven's scope).

---

## Learnings

### Project Context (Day 1)
- MyDailyWin: gamified habit-tracking web app, Duolingo-inspired UI
- Stack: Vanilla HTML/CSS/JS, Firebase, PWA
- User: Shari Paltrowitz
- User-facing pages: app.html (3024 lines), index.html (2380 lines), habitrewards.html (2047 lines)
- Key patterns: surveyInvite (not surveySection), openModal guards, filterForProfile with stuOnly/excludeFromStu

### Comprehensive Review (Day 2)
- **Three divergent codebases**: app.html is the "evolved" version with Firebase sync, profile support, admin config, input sanitization, custom confirm modal, daily quotes, weighted bonus selection. index.html is the "feature-rich" version with task help/onboarding, profile filtering (stuOnly, excludeFromStu, LOW_TECH_MODE). habitrewards.html is the "original" with no profile support at all.
- **CSS duplication**: ~300 identical lines of CSS inline in each of the 3 pages. shared.css exists but is NOT imported by any page.
- **JS duplication**: getLevel, getPrevLevelPts, spinWheel, triggerCoinRain, triggerConfetti, checkAchievements, getWeekNumber, getDayNumber — all duplicated 3x with minor variations.
- **Storage divergence**: app.html uses profiled keys (hr_state_{profile}), index.html/habitrewards.html use unprofiled key (hr_state). This means the same user's data can split across pages.
- **Dead code across all 3 pages**: rate(), submitSurvey(), isWednesday(), addBonus(), getNearMissMessage(), downloadFeedbackLog(), downloadTaskResponses() — defined but never called or never wired to UI.
- **reportTask() references missing DOM**: index.html and habitrewards.html define reportTask() referencing #reportTaskName, #reportReason, #reportComment but no reportModal HTML exists.
- **Multiplier stacking**: streak(2x) × luckyDay(1.5x) × randomBonus(2x) = up to 6x. Intentional but notable.
- **Random bonus exploit**: Undo+redo a task rerolls Math.random(), so users can fish for the 10% 2x bonus.
- **No localStorage error handling**: saveState() can silently fail if quota is exceeded. loadState() JSON.parse can crash if data is corrupted (no try/catch).
- **Modal accessibility gaps**: close-modal uses <span> not <button>, no focus trapping, surveyInvite div has no role="button"/tabindex.
- **Dark mode gaps**: home.html and offline.html have no dark mode. Progress bar background (#e5e7eb) has no dark override.
- **home.html uses system fonts** instead of Nunito, breaking visual consistency with app pages.
- **CSS typo**: `bg: rgba(88, 204, 2, 0.1);` in .task-reward (app.html:186, habitrewards.html:184) — invalid property, harmless because `background:` follows.
