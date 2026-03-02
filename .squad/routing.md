# Routing Rules

## By File

| File Pattern | Primary | Secondary |
|--------------|---------|-----------|
| app.html | Eleven | Robin |
| index.html | Eleven | Robin |
| habitrewards.html | Eleven | Robin |
| admin.html | Max | Robin |
| admin-guide.html | Max | — |
| home.html | Eleven | — |
| login.html | Dustin | Eleven |
| get-started.html | Dustin | Eleven |
| functions/** | Dustin | — |
| firestore.rules | Dustin | Hopper |
| css/** | Eleven or Max | — |
| sw.js, manifest.json | Dustin | — |

## By Domain

| Domain | Agent |
|--------|-------|
| User UI, gamification, animations | Eleven |
| Admin UI, task config, payments | Max |
| Firebase, Firestore, auth, data sync | Dustin |
| Admin↔user interactions, localStorage sync | Dustin + Robin |
| Architecture decisions, code review | Hopper |
| Test cases, edge cases, QA | Robin |
| Session logs, decisions, memory | Scribe |

## By Keyword

| Keyword/Signal | Route To |
|----------------|----------|
| "streak", "spin wheel", "achievements", "points", "level up" | Eleven |
| "admin", "payments", "payout", "task config", "approve" | Max |
| "firebase", "firestore", "auth", "localStorage", "sync", "data flow" | Dustin |
| "test", "bug", "edge case", "interaction", "QA" | Robin |
| "architecture", "review", "decision", "refactor" | Hopper |
