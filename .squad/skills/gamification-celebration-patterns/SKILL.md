# Gamification Celebration Patterns

## Overview
Reusable patterns for creating satisfying reward moments in gamified web apps. Based on Duolingo-level UX benchmarks.

## Celebration Tiers

### Tier 1 — Micro (task completion, daily login)
- Pop animation (scale 0.9 → 1.1 → 1, 0.3s)
- Toast notification with points earned
- 15-20 confetti particles
- Sound: short chime (200ms, 330Hz)
- Haptic: `navigator.vibrate(50)`

### Tier 2 — Medium (spin wheel win, streak milestone 7/14 days)
- Celebration modal (not just toast)
- 30-40 confetti particles with horizontal spread
- Coin rain effect (staggered spawn, 80ms intervals)
- Sound: ascending chime sequence
- Haptic: `navigator.vibrate([50, 30, 50])`

### Tier 3 — Major (level-up, achievement unlock, streak 30+ days)
- Full-screen celebration modal with animated badge
- 50+ confetti particles with rotation + varied trajectories
- Combined confetti + coin rain
- Sound: fanfare (1-2 seconds)
- Haptic: `navigator.vibrate([100, 50, 100, 50, 200])`

## Confetti Best Practices
```javascript
function triggerConfetti(count = 40) {
    const emojis = ['🎉', '⭐', '✨', '🎊'];
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
        const startX = 20 + Math.random() * 60; // 20vw-80vw spread
        const duration = 1000 + Math.random() * 500;
        const size = 16 + Math.random() * 16;
        el.style.cssText = `
            position: fixed; left: ${startX}vw; top: -50px;
            font-size: ${size}px; pointer-events: none; z-index: 10000;
            transform: rotate(${Math.random() * 360}deg);
            animation: confettiFall ${duration}ms ease-in forwards;
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), duration);
    }
}
```

## Sound Design Guidelines
- Task complete: 200ms uplifting chime
- Spin result: 100ms click per slot, rising pitch
- Level-up: 1.5s ascending fanfare
- Achievement: brass hit + sparkle (800ms)
- Always include mute toggle in settings
- Use Web Audio API for lightweight implementation (no library needed)

## Animation Easing
- **DO:** `cubic-bezier(0.4, 0, 0.2, 1)` — standard material ease-out
- **DO:** `cubic-bezier(0, 0, 0.2, 1)` — deceleration (spin wheel slowdown)
- **DON'T:** `cubic-bezier(0.34, 1.56, 0.64, 1)` — bouncy overshoot (unprofessional for modals)
- Bouncy easing OK only for playful micro-interactions (badge pop, checkbox)

## Accessibility
- Always respect `prefers-reduced-motion: reduce`
- Provide mute/disable toggle for sounds
- Ensure celebration modals are keyboard-dismissible
- Confetti should not block interaction (pointer-events: none)
