# MyDailyWin — Data Flow Architecture

> Gamified habit tracker with points, streaks, multi-profile admin, and manual Zelle payouts.

## Platform Summary

| Layer | Service |
|-------|---------|
| **Hosting** | Firebase Hosting (`mydailywin.web.app`) |
| **Database** | Firebase Firestore (profiles, admins, notifications, payoutRequests) |
| **Auth** | Firebase Auth (Google, Apple, email/password, anonymous) |
| **Storage** | Firebase Cloud Storage (user-uploaded photos) |
| **Serverless** | Firebase Cloud Functions (Node.js 22, us-central1) |
| **Email** | EmailJS (admin invites, 200/mo free) + Gmail SMTP (daily reminders via Cloud Function) |
| **Client Storage** | localStorage (local-first state, synced to Firestore when authenticated) |
| **Payments** | Manual Zelle (admin-initiated, not automated) |
| **PWA** | Service Worker (`mydailywin-v11` cache, offline support) |

## Data Flow

```mermaid
flowchart TB
    subgraph Browser["🌐 Browser / PWA"]
        App["Vanilla JS SPA\n(app.html, home.html,\nadmin.html, login.html)"]
        SW["Service Worker\nmydailywin-v11 cache\nOffline support"]
        LS["localStorage (LOCAL-FIRST)\n• hr_state_{profileId}\n• hr_payout_requests\n• hr_admin_{profileId}\n• theme"]
    end

    subgraph Firebase["🔥 Firebase (us-central1)"]
        Hosting["Firebase Hosting\nmydailywin.web.app"]
        Firestore["Firestore\n• /profiles/{id}\n• /profiles/{id}/admins\n• /profiles/{id}/notifications\n• /profiles/{id}/payoutRequests"]
        FBAuth["Firebase Auth\n• Google Sign-In\n• Apple Sign-In\n• Email/Password\n• Anonymous"]
        FBStorage["Cloud Storage\nUser-uploaded photos"]
        Functions["Cloud Functions\n• sendInviteEmail (onCall)\n• sendDailyReminder\n  (8AM ET daily)"]
    end

    subgraph External["🔌 External Services"]
        EmailJS["EmailJS\napi.emailjs.com\nAdmin invitation emails\n(200/mo free tier)"]
        Gmail["Gmail SMTP\nsharipaltrowitz@gmail.com\nDaily reminder emails\n(App Password in Secrets)"]
        GoogleAuth["Google OAuth\naccounts.google.com"]
        AppleAuth["Apple Sign-In\nappleid.apple.com"]
        Zelle["💰 Zelle\nManual bank transfer\n(admin-initiated)"]
    end

    App <-->|"bidirectional sync\n(2s debounce)"| Firestore
    App <-->|"auth state"| FBAuth
    App -->|"local-first\ninstant writes"| LS
    LS <-->|"sync on auth"| Firestore
    App -->|"photo uploads"| FBStorage

    FBAuth <-->|"OAuth"| GoogleAuth
    FBAuth <-->|"OAuth"| AppleAuth

    Functions -->|"invite emails"| EmailJS
    Functions -->|"daily reminders\n(cron 8AM ET)"| Gmail

    Firestore -->|"payout_sent\nnotification"| App
    App -.->|"admin approves\npayout request"| Zelle

    Hosting -->|"serves"| App
    SW -->|"cache-first\noffline fallback"| App

    style Browser fill:#e8f4fd,stroke:#2196F3
    style Firebase fill:#fff8e1,stroke:#FFA000
    style External fill:#f3e5f5,stroke:#9C27B0
```

## Key Data Flows

1. **Task Completion**: User marks task → localStorage (instant) → points recalculated → Firestore sync (2s debounce)
2. **Payout Request**: User requests cashout → localStorage + Firestore → admin reviews → manual Zelle → Firestore notification → user sees confirmation
3. **Admin Invite**: Admin enters email → Cloud Function `sendInviteEmail` → EmailJS API → email sent → recipient signs in → Firestore admin subcollection checked
4. **Daily Reminder**: Cloud Scheduler → `sendDailyReminder` function (8AM ET) → Gmail SMTP → hardcoded recipients
5. **Cloud Sync**: Auth state change → `loadFromCloud()` → merge local + cloud state → bidirectional sync
