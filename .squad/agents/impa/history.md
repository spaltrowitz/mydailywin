# Impa — History

## Project Context
**Project:** MyDailyWin — gamified habit-tracking web app
**Stack:** Vanilla HTML/CSS/JS, Firebase (Hosting + Auth + Firestore), EmailJS, PWA
**User:** Shari Paltrowitz
**Repo:** mydailywin (spaltrowitz/mydailywin)

Key files (updated 2025-07-18): app.html (3405 lines), admin.html (2021 lines), home.html (1327 lines), get-started.html (1009 lines), login.html (613 lines). index.html is now a redirect stub (11 lines). habitrewards.html no longer exists — functionality merged into app.html. CSS: admin.css (679 lines), shared.css (243 lines). functions/index.js is a stub (10 lines, exports nothing).

Admin↔user data flows via localStorage keys and Firestore. Profile-based task filtering uses stuOnly/excludeFromStu flags.

## Learnings

### 2025-07-18 — Full Codebase Optimization Audit
- **Codebase has significant inline CSS bloat**: app.html alone has 425 lines of inline `<style>`. home.html uses 104 inline `style=""` attributes. Total inline CSS across all pages: ~700+ lines extractable.
- **Cross-file duplication is the #1 token cost driver**: Firebase config (3 copies), SW registration (4 copies), escapeHtml (2 copies), `.btn` CSS (3 copies). Each page served to AI includes all of this redundantly.
- **functions/index.js is a dead stub**: Imports Firebase Functions but exports nothing. Can be deleted entirely — saves build overhead and ~200KB node_modules.
- **app.html has dead feedback code**: `rate()`, `submitSurvey()`, `currentRating` (lines 3227-3242) are remnants of old feedback system, replaced by `submitFeedback()`.
- **admin.html suffix pattern repeated 10 times**: `const suffix = (PROFILE_ID && !IS_LEGACY_PROFILE) ? '_' + PROFILE_ID : '';` should be a single `getSuffix()` helper.
- **Points calculation duplicated 3× in app.html**: Streak × lucky × random bonus logic is copy-pasted across `completeTaskDirectly()`, `confirmTask()`, and other flows.
- **admin.html has deprecated function still present**: `approvePayoutRequest()` (line 1050-1053) is marked deprecated but not removed.
- **Total estimated savings from audit: ~1,150-1,350 lines (11-13% reduction), 30-40% AI token cost reduction** when working across multiple files.
- **Decision written to**: `.squad/decisions/inbox/impa-optimization-audit.md`

### 2025-07-18 — Phase 2 Optimization Execution
- **Phase 1 was already completed by prior commits**: Inline `<style>` blocks extracted to external CSS files, app.html keyframes already removed, inline `style=""` attributes on home.html already moved to home.css, sw.js cache list already complete.
- **Phase 2 completed**: Consolidated .btn CSS base styles (shared.css provides universal properties, page CSS files trimmed to overrides only — 30 lines removed). Removed dead `.btn-completed` from app.css, dead `.btn-outline` from home.css. Bumped SW cache version.
- **Key finding**: When CSS has been extracted to per-page files, the consolidation gain is smaller (30 lines vs. 100+) because each page's button design is intentionally distinct. The real value is token reduction when AI reads multiple CSS files.
- **Remaining items with no action needed**: home.html inline styles were already at 2 (both `display:none` JS-toggled, cannot be moved to CSS). app.html keyframes were already removed. sw.js was already current.

## 2026-05-01T22:40 — Phase 2 Optimization Sprint Complete

**Session:** 2026-05-01T22-40-27Z — backlog-sprint  
**Cross-Agent Updates:**

### Team Coordination Context
- **From Riju:** Extracted CSS files (new external deps from CSP refactor) now included in service worker cache. Cache version bump to v5 includes all new assets.
- **From Daruk:** Cloud Function imports don't affect frontend bundle size. functions/index.js kept minimal.
- **From Sidon:** New files (js/dark-mode.js, updated toast in js/get-started.js) included in SW v5 precache. Dark mode CSS added to all 5 page CSS files.

### Learnings
- When CSS is per-page (intentional design variation), consolidation baseline is smaller but multi-file token savings remain significant.
- Service worker cache versioning is critical for multi-agent parallel work — each agent bumps independently, latest wins.
- Shared CSS patterns (like .btn base styles) should live in shared.css + be imported by every page CSS file for consistency and DRY.

