# HabitRewards Payment Options

## Current Model: Manual Processing via HabitRewards Account

### Overview
- Admin funds are transferred to a central HabitRewards bank account
- Payouts are sent from "HabitRewards" via Zelle
- User sees branded payment, not family member's name
- **Fees: $0**

### Setup Requirements
1. Open a business checking account (DBA "HabitRewards")
2. Enable Zelle on the account
3. Configure account to display as "HabitRewards"

### Payment Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  USER                     ADMIN                    HABITREWARDS    │
├─────────────────────────────────────────────────────────────────────┤
│  1. Requests $5.00        │                        │               │
│         ↓                 │                        │               │
│         ├─────────────────→ 2. Gets email:         │               │
│         │                 │    "Stu requested $5"  │               │
│         │                 │         ↓              │               │
│         │                 │ 3. Transfers $5 to     │               │
│         │                 │    HabitRewards acct   │               │
│         │                 │         ↓              │               │
│         │                 │         ├──────────────→ 4. Receives $5│
│         │                 │         │              │      ↓        │
│         │                 │         │              │ 5. Sends $5   │
│         │                 │         │              │    via Zelle  │
│         │                 │         │              │      ↓        │
│  6. Receives $5.00 ←──────┼─────────┼──────────────┼──────┘        │
│     FROM: HabitRewards    │         │              │               │
│         ↓                 │         │              │               │
│  7. Gets notification:    │         │              │               │
│     "Your $5 is on        │         │              │               │
│      its way!"            │         │              │               │
└─────────────────────────────────────────────────────────────────────┘
```

### Timeline Expectations
- **Same day** if requested before 3 PM ET on business days
- **Next business day** if requested after 3 PM ET or on weekends
- Zelle transfers typically arrive within minutes once sent

---

## Future Model: Automated Gift Cards via API

### Overview
- Use Tremendous.com or Tango Card API
- Fully automated - no manual processing
- User chooses: Visa/Mastercard OR brand gift cards
- **Fees: $0** (ACH funding)

### Gift Card Options

| Type | Pros | Cons |
|------|------|------|
| **Visa/Mastercard** | Works everywhere | Some have expiry (90 days - 1 year) |
| **Amazon** | No expiry, easy to use | Only works on Amazon |
| **Target/Walmart** | No expiry, practical | Limited to one store |
| **Starbucks/Dunkin** | Fun reward, no expiry | Niche use |

### Recommended Approach
- Offer **choice** during onboarding or first payout
- Default to **Visa virtual card** (most flexible)
- Show expiry clearly if applicable
- Consider minimum payout ($5-10) for gift cards

### User Preference Collection
During onboarding or payout, ask:
> "How would you like to receive your rewards?"
> - 💳 Cash to my bank account (via Zelle)
> - 🎁 Gift cards for brands I love

---

## Admin Responsibilities

### When a Payout Request Comes In:

1. **Check email** for notification
2. **Transfer funds** to HabitRewards account (if not pre-funded)
   - Use Zelle (free) or ACH transfer (free)
3. **Wait for confirmation** that HabitRewards sent the payout
4. **Mark as paid** in Admin dashboard (auto-updates for Firestore payouts)

### Setting Up Funding

**Option A: Per-request funding**
- Transfer exact amount when request comes in
- Best for infrequent payouts

**Option B: Pre-funding (recommended)**
- Keep a balance in HabitRewards account
- Example: Fund $50, payouts deducted automatically
- Get alerted when balance is low

---

## Implementation Checklist

### Phase 1: Manual Processing (Current)
- [x] User can request payout
- [x] Admin sees pending requests in dashboard
- [x] Request syncs via Firestore
- [ ] Email notification to admin when request made
- [ ] Email notification to user when payment sent
- [ ] Show expected timeline to user
- [ ] "Mark as Sent" button for processor

### Phase 2: Gift Card Integration (Future)
- [ ] Tremendous.com or Tango Card account
- [ ] API integration for automated payouts
- [ ] User preference collection (cash vs gift card)
- [ ] Brand selection for gift cards
- [ ] Expiry tracking and reminders

---

## Cost Analysis

| Volume | Manual Cost | Time Investment |
|--------|-------------|-----------------|
| 5 payouts/week | $0 | ~10 min/week |
| 20 payouts/week | $0 | ~40 min/week |
| 50 payouts/week | Consider API | ~2 hrs/week |

**Break-even for API:** When time cost > subscription cost (~$50-100/month for Tremendous)
