# Routing Rules

## By File

| File Pattern | Primary | Secondary |
|--------------|---------|-----------|
| app.html | Mipha | Purah |
| index.html | Mipha | Purah |
| habitrewards.html | Mipha | Purah |
| admin.html | Urbosa | Purah |
| admin-guide.html | Urbosa | — |
| home.html | Mipha | — |
| login.html | Daruk | Mipha |
| get-started.html | Daruk | Mipha |
| functions/** | Daruk | Riju |
| firestore.rules | Daruk | Riju |
| css/** | Mipha or Urbosa | Sidon |
| sw.js, manifest.json | Daruk | — |

## By Domain

| Domain | Agent |
|--------|-------|
| User UI, gamification, animations | Mipha |
| Admin UI, task config, payments | Urbosa |
| Firebase, Firestore, auth, data sync | Daruk |
| Admin↔user interactions, localStorage sync | Daruk + Purah |
| Architecture decisions, code review | Revali |
| Test cases, edge cases, QA | Purah |
| Code optimization, bloat removal, performance | Impa |
| Gamification UX, animations, visual design | Sidon |
| Security, auth hardening, data isolation | Riju |
| Session logs, decisions, memory | Scribe |

## By Keyword

| Keyword/Signal | Route To |
|----------------|----------|
| "streak", "spin wheel", "achievements", "points", "level up" | Mipha |
| "admin", "payments", "payout", "task config", "approve" | Urbosa |
| "firebase", "firestore", "auth", "localStorage", "sync", "data flow" | Daruk |
| "test", "bug", "edge case", "interaction", "QA" | Purah |
| "architecture", "review", "decision", "refactor" | Revali |
| "optimize", "bloat", "dead code", "performance", "tokens", "cleanup" | Impa |
| "animation", "UX", "design", "gamification", "visual", "polish", "reward" | Sidon |
| "security", "firestore rules", "auth", "trust", "isolation", "vulnerability" | Riju |
