---
updated_at: 2026-02-27T15:40:00.000Z
focus_area: P0 security & payment bugs from full team review
active_issues:
  - saveState() undefined in admin.html (blocks payout approval)
  - Firestore rules wide open (auth-only, not user-scoped)
  - admin↔app storage key mismatch for stu profile
  - unsuffixed keys in download/display functions
---

# What We're Focused On

**Full team review complete** — 5-agent parallel audit identified 4 critical bugs, 3 security vulnerabilities, and extensive code duplication.

## Immediate Priority (P0)
1. Fix saveState() undefined in admin.html — payout logic is broken
2. Lock down Firestore rules — any authenticated user can read/write any data
3. Align storage key derivation — admin and app use different keys for stu profile
4. Fix unsuffixed localStorage keys — admin download/display functions fail for non-stu profiles

## High Priority (P1)
- Unify 3 divergent user app pages (65+ duplicated functions)
- Add CSP headers to firebase.json
- Fix modal accessibility (keyboard navigation, focus trap)
- Service worker cache versioning

## Context
See .squad/decisions.md for complete findings. Orchestration logs in .squad/orchestration-log/. Session log in .squad/log/2026-02-27T15-40-full-team-review.md.
