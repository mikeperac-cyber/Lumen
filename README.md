# Lumen — Your Personal Command Center

Lumen is a local-first personal productivity app that brings tasks, goals, habits, notes, and voice memos into one loop. Built with vanilla HTML/CSS/JS — no build step, no backend, no account. Everything lives in your browser's storage, and optional cross-device sync is peer-to-peer.

## Features

- **Morning Brief** — an auto-generated daily summary on open: today's tasks, habits to protect, goals at risk, and your pinned note
- **Tasks** — a kanban board with drag-and-drop; completing a linked task automatically advances that goal's key results
- **Goals** — objectives with measurable key results, target dates, deadline health, and one-tap deadline bumps
- **Habits** — daily check-ins, streaks, and a GitHub-style heatmap
- **Weekly review** — what you completed, habit streaks, goal progress, deadline trends, and achievements unlocked
- **Achievements** — 21 badges earned from real progress, including weekly consistency streaks, with confetti on unlock and shareable cards
- **Notes** — light markdown, tags, pinning
- **Voice memos** — one-tap capture from anywhere, auto-tagging, and "turn this memo into a task"
- **Desktop notifications** — when a deadline goes overdue while the app is open
- **PWA** — installable, fully offline-capable (service worker + manifest)
- **Peer-to-peer sync** — connect two browsers with a device ID, no server

## Run it

```bash
python3 -m http.server 4173
```

Then open http://127.0.0.1:4173 in a browser.

## Keyboard

- `Ctrl`/`Cmd` + `K` — global search
- `V` — start/stop voice capture from any view

## Data

All data is stored locally (localStorage + IndexedDB for audio). Export a backup from **Settings → Backup** any time. No data ever touches a server.
