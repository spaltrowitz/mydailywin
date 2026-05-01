# Mipha UX Improvements — Decisions Record

**Date:** 2026-07-18
**Agent:** Mipha (User Dev)
**Scope:** app.html

## Decisions Made

### 1. Level-Up Celebration Modal
**Decision:** Added full-screen modal triggered by level change detection in `render()`.
**Approach:** Track `state._lastLevelName` as transient (not persisted) property. Compare on each render. 300ms delay before showing.
**Trade-off:** Transient tracking means no celebration on page reload even if level changed while offline — acceptable since the user will see the new badge immediately.

### 2. Streak Milestone Celebrations
**Decision:** Celebrate at exactly 7, 14, and 30-day streaks with themed modals.
**Approach:** Detection in `checkStreak()` comparing previous streak value before increment. 600ms delay to avoid toast collision.
**Milestones:** 7 ("One Week Streak!"), 14 ("Two Week Streak!"), 30 ("Monthly Champion!").

### 3. Enhanced Confetti System
**Decision:** Replaced 10-particle transition-based confetti with 40-50 particle CSS animation system.
**Specs:** `@keyframes confettiFall`, 20-80vw spread, rotation, 16-34px sizes, staggered 40ms spawn.
**Backward compat:** `triggerConfetti()` with no args defaults to 40 particles. All existing callers work unchanged.

### 4. Responsive Breakpoints
**Decision:** Three breakpoints: 375px (small phones), 768px (tablets), 1024px (desktop).
**Coverage:** Header, balance hero, cards, modals, task rows, buttons, badges, star ratings, celebration modals.
**Approach:** Mobile-reduction only (reduce sizes/padding at smaller screens). No layout reflow — the existing single-column layout works naturally.

### 5. No Sound Effects
**Decision:** Per user directive, no audio/sound effects added. Visual-only celebrations.

## Cross-Agent Notes
- **Urbosa:** admin.html may want similar responsive breakpoints — same approach applies.
- **Sidon:** Decisions 1, 2, 3 from UX audit now implemented. Sound effects (Decision 1 from audit) explicitly excluded per user directive.
