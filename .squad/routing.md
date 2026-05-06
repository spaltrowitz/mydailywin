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

## Issue Routing

| Label | Action | Who |
|-------|--------|-----|
| `squad` | Triage: analyze issue, assign `squad:{member}` label | Revali |
| `squad:{name}` | Pick up issue and complete the work | Named member |
| `squad:copilot` | Well-defined issue routed to @copilot | @copilot |

### How Issue Assignment Works

1. When a GitHub issue gets the `squad` label, **Revali** triages it — analyzing content, assigning the right `squad:{member}` label, and commenting with triage notes.
2. When a `squad:{member}` label is applied, that member picks up the issue in their next session.
3. Members can reassign by removing their label and adding another member's label.
4. The `squad` label is the "inbox" — untriaged issues waiting for Revali's review.

## Multi-Domain Routing

| Signal | Action |
|--------|--------|
| "Team, ..." or broad feature request | Fan-out: Revali + relevant domain agents in parallel |
| New feature implementation | Revali (arch) + Mipha/Urbosa (impl) + Purah (tests) |
| UI/UX feature | Sidon (design) + Mipha or Urbosa (impl) |
| Performance issue | Impa (analysis) + relevant tech agent (fix) |
| Security concern | Riju (audit) + Daruk (impl) |

## Review Gates

| Change Type | Required Reviewer |
|-------------|-------------------|
| Architecture decisions | Revali must approve before implementation |
| Admin↔user data contracts | Revali must approve before integration |
| New pages or major UI changes | Purah must review for test coverage |
| Firestore rules or schema changes | Revali + Daruk must both approve |
| Optimization PRs | Revali reviews + Purah verifies no regressions |
| Security-related changes | Revali + Riju must both approve |

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for "what port does the server run on?"
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If a feature is being built, spawn Purah to write test cases from requirements simultaneously.
7. **Issue-labeled work** — when a `squad:{member}` label is applied to an issue, route to that member.
8. **@copilot routing** — well-defined issues with clear specs may be routed to @copilot. Revali triages and assigns the `squad:copilot` label.

## Optional Agents

| Agent | Role | When to Route |
|-------|------|---------------|
| Impa | Optimizer | Code bloat, redundancy, token cost, performance optimization |
| Riju | Security | Firestore rules, auth hardening, data isolation, trust boundaries |

> Optimizer and Security are optional roles. If unavailable, route optimization questions to Revali for triage.
