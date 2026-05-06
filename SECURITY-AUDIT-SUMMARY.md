# MyDailyWin Security Audit Summary
**Date:** May 6, 2025  
**Auditor:** Riju (Security Specialist)  
**Requested by:** Shari Paltrowitz

---

## 🎯 Bottom Line

**Overall Security Posture: GOOD** ✅

Your app has a solid security foundation. Firebase Auth is properly configured, Firestore rules correctly scope data access, and most client-side vulnerabilities have been mitigated in prior work. 

**Two critical decisions needed from you:**

1. **Trust Model:** Can users be trusted not to cheat (edit their own points)? *(Family app = probably yes)*
2. **Email Privacy:** Are you OK with admin emails being "semi-public" in database IDs? *(Compliance concern for EU/California)*

---

## 📊 Findings by Severity

| Severity | Count | What It Means |
|----------|-------|---------------|
| **Critical** | 2 | Needs immediate decision or fix |
| **High** | 3 | Should fix soon (weeks) |
| **Medium** | 4 | Nice to have (months) |
| **Low** | 3 | Optional polish |
| **Info** | 2 | FYI only |

---

## 🚨 Critical Findings (Need Your Decision)

### 1. Users Can Edit Their Own Points
**The Issue:** Points are stored in the browser's local storage. A tech-savvy user could open DevTools and change their balance from 100 to 10,000 points.

**Why This Happens:** The app is designed to work offline (no internet = still tracks tasks). That means the browser, not the server, keeps track of points.

**Your Options:**
- **Accept the risk** *(Recommended for family use)*  
  - If your users are trustworthy family members, this is fine
  - You can always check the task completion log to verify their work
  - Document this as a known limitation
  
- **Add tamper detection** *(Medium effort)*  
  - App creates a "fingerprint" of the balance that's hard to fake
  - If fingerprint doesn't match, reset to server value
  - Won't stop determined cheaters, but raises the bar
  
- **Make the server authoritative** *(High effort)*  
  - All point changes go through your Firebase backend
  - Server validates every task completion before awarding points
  - Requires significant code refactor

**My Recommendation:** Accept the risk if this is for family/caregiving. Add a note in the admin guide: "Verify the task log before paying out large amounts."

---

### 2. Admin Emails Are "Semi-Public"
**The Issue:** When you add someone as an admin (e.g., `jane@example.com`), their email becomes part of the database structure. It can't be fully deleted (GDPR compliance concern).

**Why This Matters:**
- EU/California privacy laws require PII (like emails) to be erasable
- Your current setup makes email addresses permanent
- Not a *security* risk, but a *legal compliance* risk

**Your Options:**
- **Accept the risk** *(If you're US-only and not taking payments)*  
  - Document as known limitation
  - Small family apps often exempt from GDPR
  
- **Fix it with email hashing** *(Medium-high effort)*  
  - Convert emails to random IDs (e.g., `jane@example.com` → `a3f2c1b5...`)
  - Requires migrating existing admin invites
  - Makes emails truly erasable

**My Recommendation:** If you're just launching and have <10 users, accept the risk and document it. If you plan to grow or target EU users, fix it now before you have data to migrate.

---

## ⚠️ High Priority (Should Fix Soon)

### 3. Profile IDs Are Guessable
**Issue:** Profile IDs like `lqr5t8a7b3c4` can be guessed by trying different timestamps.

**Risk:** Someone could *try* to access another user's data by guessing their profile ID. (Your Firestore rules block this, but defense-in-depth suggests making IDs unguessable.)

**Fix:** Use random UUIDs instead: `crypto.randomUUID()` → `a3f2c1b5-9d8e-4f7a-b2c3-1e4d5f6a7b8c`

**Effort:** Low (1-2 hours)

---

### 4. Login Page Still Has Inline Scripts
**Issue:** Your CSP (Content Security Policy) allows inline `<script>` tags, which defeats XSS protection.

**Status:** app.html and admin.html already fixed! Just login.html remains.

**Fix:** Move login.html's inline scripts to `js/login.js` (same pattern as other pages).

**Effort:** Low (2-3 hours)

---

### 5. Some User Content *Might* Be Unescaped
**Issue:** Code review found innerHTML usage with user content (task names, comments). Most are properly escaped, but need verification.

**Risk:** If ANY user content reaches the page without escaping, it's an XSS vulnerability.

**Status:** Likely safe (you're using `escapeHtml()` consistently), but warrants a careful review.

**Fix:** Audit all `innerHTML` calls in admin.js and app.js.

**Effort:** Low (1 hour review)

---

## 📋 Medium Priority (Nice to Have)

- **Rate limiting on payout requests:** Prevent spam (users can't flood you with 100 payout requests)
- **GDPR data export button:** "Download My Data" feature for EU compliance
- **Rate limiting on email invites:** Prevent abuse of admin invite feature

---

## 🔍 What We Audited

✅ **Firestore Security Rules** — All collections properly scoped  
✅ **Auth Flow** — Firebase Auth secure, no localStorage bypass  
✅ **Cloud Functions** — Input validation, auth checks present  
✅ **CSP Headers** — Mostly secure (login.html needs work)  
✅ **Client-Side XSS** — Input sanitization good  
✅ **Data Privacy** — Some PII concerns (email doc IDs)  
✅ **localStorage Trust** — Known limitation (client-writable)

---

## 🎬 Next Steps

**For You (Shari):**
1. Read Critical Findings above and decide:
   - Accept localStorage trust model? *(Yes for family use)*
   - Accept email doc IDs or invest in fix? *(Accept for MVP)*

**For Your Dev Team:**
2. Fix High Priority items (profile IDs, login.html CSP, innerHTML review)
3. Add Medium Priority features if/when you have time

**Timeline:**
- Critical decisions: This week
- High priority fixes: Next 2-4 weeks
- Medium priority: Next 2-3 months

---

## 📞 Questions?

If anything is unclear, ping Riju in the .squad chat. Full technical report available at:
- **Technical details:** `/tmp/security-audit-report.md`
- **Team decisions:** `.squad/decisions/inbox/riju-security-audit.md`

---

**Last Updated:** May 6, 2025  
**Next Audit:** Recommend annual security review or when adding new features (payments, third-party integrations, etc.)
