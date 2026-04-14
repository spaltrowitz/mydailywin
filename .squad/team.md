# HabitBuilder — Squad

## Project Context

**Project:** HabitBuilder — gamified habit-tracking web app  
**Stack:** Vanilla HTML/CSS/JS, Firebase (Hosting + Auth + Firestore), EmailJS, PWA  
**User:** Shari Paltrowitz  
**Repo:** habitrewards  

**Description:** A Duolingo-inspired habit tracker where users complete daily tasks, earn points (100 pts = $1), build streaks, spin bonus wheels, and level up. An admin dashboard lets a parent/manager configure tasks, approve payouts, and monitor progress. Data syncs between admin and user via localStorage keys and Firestore.

## Members

| Name | Role | Scope | Emoji |
|------|------|-------|-------|
| Revali | Lead | Architecture, decisions, code review | 🏗️ |
| Mipha | User Dev | User dashboard (app.html, index.html, habitrewards.html) | ⚛️ |
| Urbosa | Admin Dev | Admin dashboard (admin.html, admin-guide.html) | ⚛️ |
| Daruk | Backend Dev | Firebase, Firestore, admin↔user data flow | 🔧 |
| Purah | Tester | Quality, edge cases, admin↔user interactions | 🧪 |
| Scribe | Session Logger | Memory, decisions, session logs | 📋 |
| Ralph | Work Monitor | Work queue, backlog, keep-alive | 🔄 |

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| app.html | 3024 | Main user app — tasks, streaks, spin wheel, achievements |
| index.html | 2380 | User profile view with task visibility filtering |
| habitrewards.html | 2047 | User-facing habit rewards view |
| admin.html | 2026 | Admin dashboard — tasks, payments, levels, settings |
| admin-guide.html | 255 | Admin guide/help page |
| home.html | 1319 | Marketing/landing page |
| login.html | 557 | Auth page (Firebase + Google Sign-In) |
| get-started.html | 995 | Onboarding flow |
| functions/ | — | Firebase Cloud Functions |
| firestore.rules | — | Firestore security rules |
| css/ | — | Stylesheets |

## Critical Interactions (Admin ↔ User)

- Admin configures daily tasks in `hr_admin_{profile}` → user reads via `getConfiguredDailyTasks()` in app.html
- Balance resets write to both `STORAGE_KEY` and `hr_state_stu` when keys differ
- Profile creation propagates `hr_pending_user_email` from login.html into profileData
- Task visibility controlled by `filterForProfile` using `stuOnly`/`excludeFromStu` flags with `IS_STU_PROFILE`
