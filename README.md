# HabitRewards

A gamified habit-tracking app designed to encourage daily positive behaviors through monetary rewards. Built with a fun, Duolingo-inspired interface.

---

## Manager's Guide

This guide explains how HabitRewards works so you can effectively manage and motivate your user.

### How the App Works

HabitRewards is a simple reward-based system where your user earns money by completing daily habits and bonus challenges. The app resets daily, giving fresh opportunities to earn each day.

### Daily Tasks

Your user has a set of pre-configured daily habits to complete:

| Task | Reward |
|------|--------|
| Clean up kitchen table | $1.00 |
| Go for a walk | $1.50 |
| Play tennis / pickleball | $2.50 |
| Do Duolingo | $0.75 |
| Do crossword puzzle | $1.00 |
| Charge devices overnight | $0.50 |

**Maximum daily earnings from tasks: $7.25**

Each task can only be completed once per day. When the user taps a task, they can optionally:
- Upload a photo as proof
- Add a comment/note

### Weekly Bonus Challenges

After completing ALL daily tasks, bonus challenges unlock:

**Permanent Weekly Bonuses:**
- Play tennis/pickleball 3x this week → $5.00 (progress tracked)
- Get rid of 3 items from office → $3.00

**Rotating Weekly Bonus:**
One additional bonus rotates each week from a pool including:
- Take your wife out to lunch/dinner ($5.00)
- Try a new restaurant ($3.00)
- Tell one of your kids you're thinking of them ($2.00)
- Do something nice for your wife ($3.00)
- Find a new show on Netflix/Amazon/Apple TV ($2.00)
- Use the microwave ($1.00)
- And more...

Weekly bonuses reset at the start of each week.

### Daily Survey

After completing at least one task, a quick mood survey appears. Completing it earns an extra **$0.10**.

### Streaks

The app tracks consecutive days with activity. The streak counter displays prominently to encourage consistency.

### Cash Out Options

When your user wants to collect their earnings, they have two options:

1. **🐷 Save in Jar** - Moves balance to a virtual savings jar (for larger goals)
2. **💸 Pay Me Now** - Request immediate payment

### Rewards Shop

Users can also spend their balance directly on preset rewards:
- 🍦 Ice Cream - $5.00
- 🎬 Movie Night - $10.00
- ✨ Custom Reward - User can propose something specific

### Task Proposals

Users can propose new tasks using the "Propose New Task" button. They submit:
- Task name
- Suggested dollar value

**As the manager, you'll receive these proposals and can approve/modify them.**

### Tips for Managers

1. **Be consistent with payouts** - Honor the earnings to maintain trust and motivation
2. **Celebrate streaks** - Acknowledge milestone streak days (7, 14, 30 days)
3. **Review proposals promptly** - Quick responses keep engagement high
4. **Adjust task values** - If a task is too easy or hard, discuss modifying the reward
5. **Add variety** - Consider adding seasonal or special event tasks to keep things fresh
6. **Watch for patterns** - Note which tasks are consistently completed vs. skipped

### Data Storage

All data is stored locally in the browser's localStorage. This means:
- Data persists between sessions on the same device/browser
- Clearing browser data will reset progress
- No cloud sync between devices

### Technical Notes

- The app works offline once loaded
- Supports dark mode (toggle in header)
- Mobile-friendly responsive design
- No account/login required