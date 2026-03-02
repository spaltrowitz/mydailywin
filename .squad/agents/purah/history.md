## Cross-Agent Context from Full Team Review (2026-02-27)

### From Revali (Lead/Architect)
- Code duplication is root cause of inconsistency bugs (storage keys, undefined functions).
- Firestore rules vulnerability is security blocker.
- Email system redundancy (SendGrid + EmailJS) — need decision.

### From Mipha (User Dev)
- updateBalanceDisplay undefined is real runtime crash (not dead code).
- Three divergent codebases break parity testing.
- Modal accessibility issues pervasive.

### From Urbosa (Admin Dev)
- saveState undefined prevents payout testing entirely.
- Storage key mismatch causes cross-subsystem data splits.
- Download functions fail for non-stu profiles.

### From Daruk (Backend Dev)
- Firestore rules vulnerability enables cross-user data access (payment data exposed).
- localStorage dual-write strategy undefined — causes persistent state issues.
- Service worker versioning gap + no caching headers compound performance.

---

## Learnings

### Project Context (Day 1)
- HabitRewards: gamified habit-tracking web app with admin and user surfaces
- Stack: Vanilla HTML/CSS/JS, Firebase, PWA
- User: Shari Paltrowitz
- Critical test areas: admin↔user sync (localStorage keys), streak multipliers, spin wheel unlock logic, profile filtering
- Known patterns: surveyInvite id (not surveySection), openModal guards, balance reset dual-write

### Comprehensive Quality Review (Day 2)

#### Architecture
- **4 user-facing pages** sharing state: app.html (primary), index.html (variant), habitrewards.html (variant), admin.html
- **app.html** is the only page that reads admin config (`getConfiguredDailyTasks()` via ADMIN_KEY). index.html and habitrewards.html use hardcoded task lists only.
- **Profile system**: URL param `?profile=X` drives key suffixing. Legacy "stu" profile uses unsuffixed keys.
- **admin.html** defines `IS_LEGACY_PROFILE`; app.html does NOT define it but references it in the payout fallback path.

#### Key Storage Map
- Admin writes: `hr_admin_{profile}` (via `saveAdminData()`) containing `customTasks.daily`, `customTasks.dailyBonus`, etc.
- User reads: `hr_state_{profile}` (state), `hr_date_{profile}` (last date), `hr_week_{profile}` (week num), `hr_reports_{profile}`
- Legacy "stu": admin uses `hr_admin` / `hr_state`; app.html uses `hr_admin` / `hr_state_stu`

#### Critical Bugs Found
1. **`saveState` undefined in admin.html** — called at lines 1085, 1158 but never defined. Breaks markPayoutSent and approvePayoutRequestLocal.
2. **`IS_LEGACY_PROFILE` undefined in app.html** — referenced at line 2764 but never declared. ReferenceError in payout fallback.
3. **STORAGE_KEY mismatch for legacy "stu" profile**: admin uses `hr_state`, app uses `hr_state_stu`. Dual-write in `resetUserBalance` attempts to fix this, but `savePayment` does NOT dual-write.
4. **index.html and habitrewards.html ignore admin config** — always use hardcoded task lists and unsuffixed `hr_state`. Never profile-aware.
5. **Download functions in admin use unsuffixed keys** (hr_completed_log, hr_feedback, hr_reports) — won't find data for non-legacy profiles.
6. **DAILY_MAX_POINTS declared but never enforced** in any page.
7. **No negative balance guard** on task undo — balance can go negative.
8. **No `openModal`/`closeModal` null guards** in admin.html — missing element IDs will throw.

#### Patterns Confirmed
- surveyInvite (not surveySection) — CORRECT across all three user pages
- Streak logic: 7+ days = 1.5x, 14+ days = 2x — verified at app.html:1261-1264
- Spin wheel: unlocks when ALL daily tasks complete, limited to once per day — verified at app.html:2071-2079
- Streak increments on every task completion (not once-per-day completion), but checkStreak guards by date
