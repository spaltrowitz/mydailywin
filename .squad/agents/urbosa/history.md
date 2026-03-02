## Cross-Agent Context from Full Team Review (2026-02-27)

### From Revali (Lead/Architect)
- Code duplication affects maintainability — extraction in shared.js will help admin.html too.
- Storage key mismatch is architecture-level issue (not just admin).
- Firestore rules need tightening — affects payment logic security.

### From Mipha (User Dev)
- Storage key divergence is also a user-facing problem (not just admin).
- Unifying storage keys helps admin data consistency.
- Modal accessibility work benefits admin (similar patterns).

### From Daruk (Backend Dev)
- Firestore rules vulnerability affects payout validation in admin.
- No rate limiting on payment operations — backend concern but admin impact.
- localStorage dual-write strategy needs formalization (affects admin writes).

### From Purah (Tester)
- saveState undefined is confirmed blocker for payout testing.
- Download functions multi-profile bugs affect testing non-stu profiles.
- IS_LEGACY_PROFILE reference in app.html impacts admin-stu edge cases.

---

## Learnings

### Project Context (Day 1)
- HabitRewards: gamified habit-tracking web app
- Stack: Vanilla HTML/CSS/JS, Firebase, PWA
- User: Shari Paltrowitz
- Admin page: admin.html (2026 lines) with tabs: Elevenboard, Tasks, Payments, Levels, Admins, FAQ, Settings
- Admin writes tasks to hr_admin_{profile}, balance reset dual-writes to STORAGE_KEY and hr_state_stu

### Comprehensive Review (Day 2)
- **CRITICAL BUG:** `saveState()` is called at admin.html:1085 and :1158 but never defined — payout approval crashes
- **CRITICAL BUG:** Storage key mismatch for stu profile — admin writes `hr_state`, app reads `hr_state_stu`. Dual-write only in `resetUserBalance()`, missing from `savePayment()` and `markPayoutSent()`
- **BUG:** `displayReports()` (line 1183) and CSV downloads (lines 1384, 1392) use unsuffixed localStorage keys — break for non-stu profiles
- Admin auth flow: Firestore → localStorage fallback → legacy stu hardcode (3-layer)
- Admin invite: EmailJS (service_lzv2w8n) + Firestore admins subcollection + localStorage fallback
- Dead code: `fallbackMailto()` (line 1925), `cancelInvite()` (line 1983) — never called
- `savePayment()` always zeroes balance regardless of partial payment amount
- Owner badge always shows current user, even if they're not the owner
- All success feedback uses mix of alert() and showToast() — inconsistent UX
- Earnings Overview ($2.65/day, $80-100/month) is hardcoded HTML, not calculated from task config
- css/admin.css is clean (419 lines), well-structured with CSS variables
- admin-guide.html is self-contained (inline styles, no shared CSS) — good for standalone sharing
