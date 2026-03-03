# Decision: Phase 1 Consolidation — habitrewards.html Deleted

**Agent:** Daruk (Backend Dev)  
**Date:** 2026-03-03  
**Status:** ✅ Completed  
**Priority:** P1  

## What Changed
- Deleted `habitrewards.html` (2047 lines) from the repository
- Zero references in any production file (verified: firebase.json, manifest.json, sw.js, README.md, docs/, all HTML pages)

## Rationale
- Revali's analysis: zero unique features, zero unique functions vs index.html
- No sanitization, no Firebase sync — strict security downgrade from app.html
- Orphaned file: no page links to it, not cached, not routed

## Impact
- **Mipha:** Scope reduced from 3 user pages to 2 (app.html, index.html)
- **Revali:** Phase 1 of Option C complete; Phase 2 (merge index.html features into app.html) is next
- **Purah:** One fewer test surface

## Commit
`chore: delete orphaned habitrewards.html (Phase 1 consolidation)`
