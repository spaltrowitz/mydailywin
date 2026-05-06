# Riju — History

## Project Context
**Project:** MyDailyWin — gamified habit-tracking web app
**Stack:** Vanilla HTML/CSS/JS, Firebase (Hosting + Auth + Firestore), EmailJS, PWA
**User:** Shari Paltrowitz
**Repo:** mydailywin (spaltrowitz/mydailywin)

Two-role trust model: Admin (parent/manager) configures tasks, approves payouts, manages settings. User (kid/employee) completes tasks, earns points, spins wheel. Data syncs via localStorage keys and Firestore. Admin writes to `hr_admin_{profile}`, user reads via `getConfiguredDailyTasks()`.

Key security surfaces: firestore.rules, login.html (auth), admin.html (privilege), app.html (user), functions/ (Cloud Functions).

## Core Context — Prior Audits

Riju completed prior security work including:
- CSP refactor: eliminated unsafe-inline from app.html and offline.html (57+ inline onclick handlers converted to data-action delegation)
- Service worker: v5 cache includes all external assets, precache fully populated
- Auth flow: identified open redirect vulnerability in login.html (`?redirect=` param), proper Firestore-first authorization without localStorage fallback
- Firestore rules: all collections scoped by `hasProfileAccess()`, admin email as doc ID (privacy concern but access-controlled)
- Cloud Functions: auth checks and input validation present, EmailJS credentials server-side only

Key learnings:
- Event delegation pattern (`data-action` attributes + central `addEventListener`) scales without build tools
- CSP meta tag placement order matters (must be in `<head>`)
- Coordinate service worker cache versioning when adding external assets

## Recent Learnings

### 2026-05-06 — Full Security & Privacy Audit Complete

#### Audit Scope
- Firestore rules, all HTML files, all JavaScript, Cloud Functions, Firebase configuration
- Read-only analysis (no code changes)
- Deliverable: SECURITY-AUDIT-SUMMARY.md with 12 findings

#### Findings Summary

**Critical (2):**
- **F1: Email as Firestore doc ID** — PII exposure. Email used as doc ID in `profiles/{profileId}/admins/{email}`. Doc IDs logged, indexed, visible in URLs. GDPR/CCPA concern.
- **F2: localStorage as source of truth for points** — Client can modify. User can use DevTools to inflate balance. Firestore used for sync but NOT authoritative.

**High (3):**
- **F3: User content not escaped in innerHTML** — Audit found likely safe usage of `escapeHtml()` but some paths need review
- **F4: Profile ID enumeration** — Sequential numeric IDs. Attacker can guess by incrementing.
- **F5: CSP unsafe-inline in login.html** — app.html and admin.html already migrated. login.html still has inline scripts.

**Medium (4):**
- F6: Rate limiting on payout requests (missing in Firestore rules)
- F7: GDPR/CCPA data export endpoint (missing)
- F8-F9: Logging/validation hardening

**Low (3):**
- Session timeout patterns, email validation, input sanitization examples

#### Positive Findings
- Cloud Functions: auth checks present, input validation present, EmailJS server-side only
- Firebase Auth: properly configured (Google + email/password)
- Admin authorization: multi-layered and secure
- Firestore rules: strong access control patterns via `hasProfileAccess()`
- Input sanitization: `escapeHtml()` used consistently

#### Key Decisions Needed (Owner Input)

**Decision 1: Email doc IDs (F1)**
- **Status:** ⚠️ RISK ACCEPTED (medium-term fix)
- **Mitigation:** Hash emails (SHA-256) for doc IDs, plaintext in data only
- **Team decision:** Prioritize vs. implementation cost?

**Decision 2: localStorage Trust Model (F2)**
- **Status:** ⚠️ KNOWN LIMITATION (by design for offline-first)
- **Options:** (1) Accept risk (family trust model), (2) Firestore authoritative + server-side validation, (3) Tamper detection (hash + salt)
- **Team decision:** Which path?

**Decision 3: CSP Migration (F5)**
- **Status:** ⚠️ PARTIALLY FIXED (login.html remaining)
- **Mitigation:** Extract login.html inline scripts → js/login.js. Remove `'unsafe-inline'` from CSP.
- **Owner:** Daruk (backend) or Mipha (frontend)

#### Implementation Roadmap

| Priority | Item | Owner | Effort |
|----------|------|-------|--------|
| **P0** | F1: Hash email in doc IDs | Daruk | High (migration) |
| **P0** | F2: Trust model decision → implementation | Revali + Daruk | Medium |
| **P1** | F3: Code review innerHTML escaping | Mipha + Daruk | Low |
| **P1** | F4: UUID v4 for profile IDs | Daruk | Low |
| **P1** | F5: CSP migration (login.html) | Daruk | Low |
| **P2** | F6: Rate limit payout requests | Daruk | Low |
| **P2** | F7: GDPR/CCPA export endpoint | Daruk | Medium |

#### Files Audited
- `firestore.rules` — strong access control, admin email as doc ID
- `firebase.json` — CSP policy (unsafe-inline present)
- `js/admin.js`, `js/app.js`, `js/login.js` — auth flow, input validation, innerHTML usage
- `js/get-started.js` — profile creation, profile ID generation (timestamp+random, enumerable)
- `functions/index.js` — auth validation, input sanitization
- All HTML files — CSP meta tags, script loading, innerHTML usage

#### Session Impact
- Full security posture documented in SECURITY-AUDIT-SUMMARY.md
- 12 findings with CVSS-style severity
- Implementation roadmap with owner assignments
- No immediate blockers — foundation solid
- Two critical team decisions needed before P0/P1 execution

#### Cross-Team Context
- **Revali:** Security decision needed on localStorage trust model
- **Daruk:** P0/P1 items are backend responsibility. Email hashing (F1) highest effort.
- **Mipha:** P1 items (XSS review, CSP) if decision finalized
- **Shari:** localStorage trust model + email hashing priority decisions

