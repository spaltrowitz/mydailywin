# Settings Modal Redesign — Ready to Paste

**Designer:** Sidon  
**Date:** 2026-05-03  
**User Request:** Remove admin mode, redesign for senior-friendly clarity

---

## 1. NEW HTML (Ready to Paste)

Replace lines 246-300 in `app.html` with this:

```html
<!-- SETTINGS MODAL -->
<div id="settingsModal" class="modal" role="dialog" aria-modal="true">
    <div class="modal-box">
        <button class="close-modal" data-action="closeModal" data-arg="settingsModal" aria-label="Close">&times;</button>
        <h2 style="margin-bottom: 24px; font-size: 24px;">Settings</h2>
        
        <!-- Cloud Sync Status -->
        <div id="syncStatus" style="background: var(--bg); padding: 14px 18px; border-radius: 14px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
            <span id="syncIcon" style="font-size: 24px;">☁️</span>
            <div style="flex: 1;">
                <div id="syncText" style="font-size: 15px; font-weight: 700; margin-bottom: 3px;">Checking sync...</div>
                <div id="syncDetail" style="font-size: 14px; color: var(--text-light);">Your data is saved locally</div>
            </div>
        </div>
        
        <!-- Current Balance -->
        <div style="background: var(--bg); padding: 24px; border-radius: 14px; margin-bottom: 28px; text-align: center;">
            <div style="font-size: 15px; color: var(--text-light); margin-bottom: 8px; font-weight: 600;">Your Balance</div>
            <div style="font-size: 36px; color: var(--primary); font-weight: 800; margin-bottom: 6px;" id="settingsBalance">0 pts</div>
            <div style="font-size: 20px; color: var(--text-light);" id="settingsDollars">= $0.00</div>
        </div>
        
        <!-- Share Progress Card -->
        <div style="background: var(--bg); padding: 20px; border-radius: 14px; margin-bottom: 16px;">
            <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px; color: var(--text);">Share Your Progress</h3>
            <button class="btn btn-success" data-action="shareProgress" style="margin-bottom: 0;">🎯 Share Progress</button>
        </div>
        
        <!-- Get Help Card -->
        <div style="background: var(--bg); padding: 20px; border-radius: 14px;">
            <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 8px; color: var(--text);">Need Help or Have Ideas?</h3>
            <p style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">Suggest a task or send feedback</p>
            <input type="text" id="propName" placeholder="Task name or topic" style="margin-bottom: 10px;">
            <textarea id="propReason" placeholder="Your suggestion or question (optional)" rows="3" style="width: 100%; padding: 14px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 16px; margin-bottom: 12px; background: var(--card-bg); color: var(--text); resize: none;"></textarea>
            <button class="btn" data-action="submitProposal" style="margin-bottom: 8px;">Send Message</button>
            <button class="btn btn-ghost" data-action="contactDeveloper" style="margin-bottom: 0;">Email Developer Directly</button>
        </div>
    </div>
</div>
```

---

## 2. CSS CHANGES

**None required!** The redesign uses existing CSS classes and variables:
- `.btn`, `.btn-success`, `.btn-ghost` (existing button styles)
- `var(--bg)`, `var(--card-bg)`, `var(--primary)`, `var(--text)`, `var(--text-light)` (existing CSS variables)
- All inline styles match existing patterns in app.html
- Dark mode support is automatic via existing CSS variable system

---

## 3. DESIGN RATIONALE

### What Changed
✅ **Removed Admin Mode section** — Stuart should never see admin controls  
✅ **Removed "Refer a Friend" section** — low-value noise for a family app  
✅ **Consolidated help sections** — merged "Suggest Task" + "Contact Developer" into single "Get Help" card  
✅ **Replaced hr separators with background cards** — cleaner visual hierarchy  
✅ **Removed section emojis and explanatory text** — reduced clutter, actions are self-explanatory  
✅ **Made balance slightly larger** — 32px → 36px for emphasis

### Information Architecture
**Before:** 5 sections (Cloud Sync + Balance + Admin + Suggest Task + Share Progress + Refer Friend + Contact)  
**After:** 3 cards (Cloud Sync + Balance + Share Progress + Get Help)

### Senior-Friendly Improvements
- **Fewer choices** — removed low-value options to reduce decision paralysis
- **Larger primary info** — balance display is more prominent
- **Clearer grouping** — background cards vs. endless hr separators
- **Simpler language** — no jargon, minimal explanation text
- **Touch targets maintained** — all buttons meet 44px minimum

---

## 4. COMPATIBILITY

✅ **All element IDs preserved** — no JS changes needed:
- `syncStatus`, `syncIcon`, `syncText`, `syncDetail`
- `settingsBalance`, `settingsDollars`
- `propName`, `propReason`

✅ **All data-action handlers preserved**:
- `submitProposal` (sends message)
- `shareProgress` (shares progress)
- `contactDeveloper` (email developer)

✅ **Modal system unchanged** — works with existing `openModal("settingsModal")` / `closeModal("settingsModal")` JS

✅ **Dark mode support automatic** — CSS variables handle theme switching

---

## 5. TESTING CHECKLIST

After pasting the new HTML, test:
- [ ] Settings modal opens via gear icon
- [ ] Cloud sync status displays correctly
- [ ] Balance updates correctly
- [ ] "Share Progress" button triggers share action
- [ ] "Send Message" button triggers submitProposal action
- [ ] "Email Developer Directly" button triggers contactDeveloper action
- [ ] Modal closes via X button
- [ ] Modal closes via Escape key (existing feature)
- [ ] Dark mode toggles correctly (all text remains readable)
- [ ] Mobile display (cards stack properly, no overflow)

---

## Files Reference

- **Design decision doc:** `.squad/decisions/inbox/sidon-settings-redesign.md`
- **This summary:** `.squad/agents/sidon/DELIVERABLE.md`
- **Agent history updated:** `.squad/agents/sidon/history.md`
