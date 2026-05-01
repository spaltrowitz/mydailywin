# Decision: app.html Dead Code Removal + Helper Extraction

**Agent:** Mipha (User Dev)
**Date:** 2025-07-24
**Source:** Impa optimization findings (D1, DL1, DL2)
**Commit:** refactor(app.html): extract helpers, delete dead code

## Decisions Made

### D1: Deleted rate(), submitSurvey(), currentRating
- **Rationale:** Zero references in codebase. The feedback system was fully refactored to use `submitFeedback()` with `feedbackModal`. These were legacy remnants.
- **Risk:** None — confirmed no HTML onclick, no JS call, no string reference.

### DL1: Extracted calculatePointsWithBonuses(basePoints)
- **Rationale:** Streak × lucky day × random bonus calculation was copy-pasted in `completeTaskDirectly()` and `confirmTask()`. Drift risk if bonus logic changes.
- **Returns:** `{ pts, bonusMsg, randomMult }` — covers all caller needs.
- **Risk:** Low — pure calculation, no side effects. `randomMult` exposed for `confirmTask()`'s coin rain decision.

### DL2: Extracted addPoints(amount)
- **Rationale:** `state.balance += X; state.totalEarned += X;` appeared 11 times (after DL1 consolidation). Single update point prevents balance/totalEarned from drifting apart.
- **Risk:** None — mechanical 1:1 replacement. Per-call-site logic (saveState, checkStreak, render) left untouched.

## Impact
- **Lines saved:** 46 net (42 added, 88 removed)
- **Duplication reduced:** 3 fewer copy-paste points
- **Behavioral change:** None — pure mechanical refactor
