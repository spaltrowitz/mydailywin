# Decision: Phase 2 — index.html Features Migrated to app.html

**Agent:** Mipha (User Dev)  
**Date:** 2026-03-03  
**Status:** ✅ Implemented  
**Priority:** P1  

## Context

Per Revali's approved Option C consolidation strategy, Phase 2 migrates the 5 features unique to index.html into app.html. This eliminates the need to maintain index.html as a user-facing page.

## Changes Made

### Feature 1: Task Help System
- Added `TASK_HELP` constant (12 entries mapping task IDs to help content)
- Added `showTaskHelp(taskId)` function with `escapeHtml()` on title
- Added `taskHelpModal` HTML markup with proper ARIA attributes
- Added `.task-help-btn` CSS with dark mode support

### Feature 2: Profile Task Filtering
- Added `filterForProfile()` function using `IS_LEGACY_PROFILE` (≡ index.html's `IS_STU_PROFILE`)
- Added `stuOnly` flag to: Tennis/Pickleball, Aisle app, Lunch with tennis friends, Mystery Shop
- Added `excludeFromStu` flag to: Duolingo, Clear out old emails
- Wired into `getConfiguredDailyTasks()`, `getDailyBonus()`, `getWeeklyBonuses()`

### Feature 3: Tech Comfort Filtering — SKIPPED
- app.html already handles this via `profileTemplate` mechanism (separate LOW_TECH_TASKS vs REGULAR_TASKS sets)
- More comprehensive than index.html's simple `filterForTechComfort()` filter

### Feature 4: Completed-Ever Tracking
- Added `getCompletedEverTasks()` and `markTaskCompletedEver()` with profile-suffixed key
- Wired into all 5 task completion paths

### Feature 5: Help Buttons in Task Rendering
- Added "i" buttons to daily tasks, weekly bonuses, and daily bonus in `render()`
- Only shown for tasks with TASK_HELP entries

## Key Design Decisions

1. **escapeHtml on TASK_HELP content**: Applied to title only. Content is hardcoded static HTML (not user input) — escaping would destroy intentional formatting (p, ol, li, strong tags).
2. **filterForProfile placement**: Applied inside `getConfiguredDailyTasks()` return path to filter both admin-configured and default tasks uniformly.
3. **getDailyBonus null safety**: Now returns null when all bonuses are filtered; UI hides daily bonus section gracefully.
4. **Storage key**: Uses `hr_completed_ever_${PROFILE_ID}` (app.html convention), not index.html's unsuffixed `hr_completed_ever`.

## Impact

- **app.html now has feature parity** with index.html — no unique features remain in index.html
- index.html can safely redirect to app.html (Phase 3)
- Zero regressions: getDefaultState() unchanged, existing completion flows preserved
