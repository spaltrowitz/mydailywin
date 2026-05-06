# Additional CSS for Redesigned Settings Modal

## Status: No new CSS required

The redesigned settings modal uses **only existing CSS classes and variables**:
- `.modal`, `.modal-box`, `.close-modal` (existing modal system)
- `.btn`, `.btn-success`, `.btn-ghost` (existing button variants)
- `var(--bg)`, `var(--card-bg)`, `var(--primary)`, `var(--text)`, `var(--text-light)` (existing CSS variables)
- Input/textarea styling already defined in app.css lines 219-226

## Inline Style Patterns

All inline styles match existing patterns in app.html:
- Border radius: 14px cards (consistent with rest of app)
- Padding: 20-24px for cards (standard app spacing)
- Margins: 16-28px between sections (existing vertical rhythm)
- Font sizes: 14-36px range (within existing type scale)

## Dark Mode Support

Dark mode variables automatically apply:
- `--bg` switches from #f7f7f7 → #131f24
- `--card-bg` switches from white → #202f36
- `--text` / `--text-light` adjust accordingly
- Input/textarea border colors handled by existing `body.dark-mode input` rules (app.css line 225)

## No Breaking Changes

- All `data-action` handlers preserved (submitProposal, shareProgress, contactDeveloper)
- All element IDs preserved (syncStatus, syncIcon, syncText, syncDetail, settingsBalance, settingsDollars, propName, propReason)
- Modal structure unchanged (works with existing openModal/closeModal JS)
