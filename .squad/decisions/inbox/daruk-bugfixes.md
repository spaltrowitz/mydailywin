# Daruk Bugfix Decisions (2025-07-24)

## localStorage for onboarding state
**Decision**: Migrated onboarding handoff keys from sessionStorage to localStorage (`hr_onboarding_uid`, `hr_onboarding_email`). Old keys kept as fallback reads in get-started.html for transition safety. Both old and new keys are cleaned up after use.
**Rationale**: sessionStorage is lost on page refresh, breaking mid-onboarding users. localStorage survives refreshes.
**Impact**: Any agent reading onboarding state should check the new localStorage keys first.

## innerHTML → DOM methods for user content
**Decision**: User-supplied URLs (like photoURL) must never be interpolated into innerHTML. Use createElement + property assignment instead.
**Rationale**: XSS prevention. This should be the standard pattern going forward for all user-supplied content.
