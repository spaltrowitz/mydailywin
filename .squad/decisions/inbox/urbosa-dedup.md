# Urbosa Decision: Admin Code Deduplication

**Date:** 2026-07-15
**Agent:** Urbosa (Admin Dev)
**Trigger:** Impa optimization audit (DL3, DL6, D2, D3, RO4)
**Commit:** f6b0fbc

## Decisions Made

### 1. Extracted `getProfileSuffix()` helper
- **What:** Single function returns `'_' + PROFILE_ID` or `''` based on legacy status
- **Why:** Pattern was copy-pasted 10 times — any change required 10 edits
- **Risk:** None — pure mechanical extraction, identical output

### 2. Extracted `formatDollar(amount)` helper
- **What:** Wraps `parseFloat(amount).toFixed(2)` in a named function
- **Why:** 7 call sites doing the same parseFloat+toFixed dance
- **Risk:** None — same computation, just named
- **Note:** Did NOT touch `(value/100).toFixed(2)` patterns in task tables — those do division first, different semantic

### 3. Deleted `approvePayoutRequest()` (dead code)
- **What:** 4-line deprecated wrapper that just called `markPayoutSent()`
- **Why:** Comment said "use markPayoutSent instead", zero references in HTML onclick handlers
- **Risk:** None — confirmed no callers

### 4. Deleted `shareApp()` (dead code)
- **What:** 9-line share/clipboard function
- **Why:** Defined but never referenced in any button, link, or onclick in admin.html
- **Risk:** None — confirmed no UI references

### 5. Converted `innerHTML +=` loops to array-join pattern
- **What:** 4 forEach loops in `displayTasks()` now push to array, join once
- **Why:** `innerHTML +=` forces DOM reparse on every iteration — O(n²) behavior
- **Risk:** None — identical HTML output, just built more efficiently

## Cross-Agent Notes
- **Revali:** `getProfileSuffix()` and `formatDollar()` are candidates for shared.js if app.html has the same patterns
- **Impa:** All 4 optimization findings executed. Ready for verification.
