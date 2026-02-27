# Routing Rules

## By File

| File Pattern | Primary | Secondary |
|--------------|---------|-----------|
| app.html | Dash | Helen |
| index.html | Dash | Helen |
| habitrewards.html | Dash | Helen |
| admin.html | Violet | Helen |
| admin-guide.html | Violet | — |
| home.html | Dash | — |
| login.html | Frozone | Dash |
| get-started.html | Frozone | Dash |
| functions/** | Frozone | — |
| firestore.rules | Frozone | Edna |
| css/** | Dash or Violet | — |
| sw.js, manifest.json | Frozone | — |

## By Domain

| Domain | Agent |
|--------|-------|
| User UI, gamification, animations | Dash |
| Admin UI, task config, payments | Violet |
| Firebase, Firestore, auth, data sync | Frozone |
| Admin↔user interactions, localStorage sync | Frozone + Helen |
| Architecture decisions, code review | Edna |
| Test cases, edge cases, QA | Helen |
| Session logs, decisions, memory | Scribe |

## By Keyword

| Keyword/Signal | Route To |
|----------------|----------|
| "streak", "spin wheel", "achievements", "points", "level up" | Dash |
| "admin", "payments", "payout", "task config", "approve" | Violet |
| "firebase", "firestore", "auth", "localStorage", "sync", "data flow" | Frozone |
| "test", "bug", "edge case", "interaction", "QA" | Helen |
| "architecture", "review", "decision", "refactor" | Edna |
