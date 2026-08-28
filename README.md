<div align="center">

# ✦ Lumen

**Personal Productivity Operating System & Command Center**

*Local-First · Zero-Build · Encrypted · Offline-Capable · AI-Augmented*

[![CI](https://github.com/miketeacher-ai/to-do-list-1/actions/workflows/ci.yml/badge.svg)](https://github.com/miketeacher-ai/to-do-list-1/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmiketeacher-ai%2Fto-do-list-1)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-success.svg)](manifest.webmanifest)
[![No Build Step](https://img.shields.io/badge/Build-Zero_Step-orange.svg)](index.html)

</div>

---

## 📖 Overview

**Lumen** is an ultra-fast, local-first personal command center that unites tasks, goals, habits, notes, focus sessions, and voice memos into a seamless, interconnected loop.

Built with pure vanilla web standards (HTML5, CSS3, ES2022 JavaScript) — **no bundlers, no frameworks, no external dependencies, and no mandatory cloud accounts**. Everything runs locally in your browser with optional peer-to-peer device sync and military-grade client-side encryption.

---

## ✨ Key Features

### 📋 Smart Tasks & Kanban Command
- **Natural Language Quick-Add**: Type `Buy milk tomorrow !high #groceries @Health at 3pm` to auto-parse deadlines, priorities, tags, and goal links.
- **Visual Subtask Progress**: Enter-key subtask creation with live completion progress bars (`✓ 3/5`).
- **Batch Operations Floating Bar**: Multi-select cards (`Shift+Click` or `Ctrl+A`) to batch move statuses, assign priorities, update due dates, or complete in bulk.
- **Bulk CSV / Markdown Importer**: 1-click import from `.csv`, `.md`, or checklist files.
- **Eisenhower Matrix & Timeboxing**: Instant Urgency/Importance categorization and weekly schedule grid.

### 🍅 Focus & Pomodoro
- **Global Floating Focus Widget**: Persistent picture-in-picture timer that stays with you across all views.
- **Audio Chimes**: Native Web Audio synthesizer chimes for focus completion and task finish.
- **Session History & Analytics**: Log and track total focus minutes with CSV export.

### 🎯 Goals & OKRs
- **Key Result Tracking**: Automatic progress updates as linked tasks are completed.
- **Health Indicators & Target Dates**: One-tap deadline bumping and status monitoring.
- **Student Links**: Goals link directly to students; finance rolls up Paid / Expected / Outstanding per student and currency.

### 🔥 Habits & Consistency
- **GitHub-Style Heatmaps**: 365-day check-in visualizations with custom color themes.
- **Weekly Frequency Targets**: Track habits with flexible schedules (e.g., `🎯 3/wk`).
- **❄️ Streak Freezes**: Protect your streaks across travel or sick days.

### 📝 Notes & Knowledge Base
- **Interactive Checklists in Preview**: Toggle `- [ ]` and `- [x]` markdown checklists directly in preview mode without editing.
- **📋 1-Click Task Extractor**: Extract note checklist items straight into your Kanban board.
- **✨ AI Polish & Summarizer**: Leverage your Google Gemini API key for grammar correction, structure, and executive bullet summaries.

### 🌅 Morning Brief & 📅 Weekly Review
- **Daily Briefing**: High-priority tasks, habits to protect, and active goals at a glance each morning.
- **Weekly Review Markdown Exporter**: Download itemized `.md` reports of your weekly accomplishments and habit consistency.

### 🔐 Security & Peer Sync
- **AES-GCM Encrypted Vaults**: Client-side password encryption using PBKDF2 (SHA-256) + 256-bit AES-GCM for portable JSON backups.
- **Peer-to-Peer Sync**: Direct browser-to-browser data sync via WebRTC (PeerJS) without a middleman database.
- **100% Data Sovereignty**: All data lives strictly in your browser's `localStorage` and `IndexedDB`.

---

## ⚡ 1-Click Deployment to Vercel

Lumen is 100% static and requires zero build steps, making it ideal for hosting on a **Vercel Hobby (Free) account**.

### Deploy via Vercel Button
Click the button below to fork and deploy directly to your Vercel account:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmiketeacher-ai%2Fto-do-list-1)

### Deploy via Vercel CLI
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy from the project root
vercel
```

The included `vercel.json` automatically configures:
- Clean URLs
- Immutable static caching
- Service Worker bypass headers (`sw.js` cache-control: `max-age=0`)
- PWA Webmanifest MIME headers
- Strict security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`)

---

## 💻 Local Development

Run Lumen locally using any static file server:

### Option A: Using Node & NPM
```bash
# Install test runner & serve utility
npm install

# Start local dev server
npm start
```
Open **`http://localhost:8092`** in your browser.

### Option B: Using Python
```bash
python3 -m http.server 8092
```

---

## 🧪 Testing & Quality Assurance

Lumen includes comprehensive end-to-end tests powered by Playwright covering smoke navigation, task CRUD, undo/redo, AES-GCM crypto encryption, natural language parsing, and batch operations, plus a fast unit layer (Node's built-in test runner) for the pure logic in `src/lib/` — vault crypto, the natural-language parser, schedule generation, P2P merge, and the Gemini client.

```bash
# Unit tests (Node's built-in runner — no deps, milliseconds)
npm run test:unit
npm run test:unit:watch

# End-to-end tests (Playwright)
npm test
npm run test:ui        # interactive UI
npm run test:report    # latest HTML report

# Everything
npm run test:all
```

---

## 🏗️ Tech Stack & Architecture

- **Frontend Core**: HTML5, CSS3 (CSS Variables, Flexbox/Grid), ES2022 Vanilla JavaScript.
- **Data Persistence**: `localStorage` (state snapshots & tombstones) + `IndexedDB` (voice audio recordings).
- **Cryptography**: Native Web Crypto API (`SubtleCrypto` PBKDF2 + AES-GCM).
- **Audio Engine**: Native Web Audio API (`AudioContext` synthesizer).
- **P2P Sync**: WebRTC via PeerJS.
- **PWA**: Service Worker caching (`sw.js`) + Web App Manifest.
- **E2E Testing**: Playwright Test Suite.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd> | Open Global Search & Command Palette |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo Last Action |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> | Redo |
| <kbd>N</kbd> | New Task Modal (on Tasks view) |
| <kbd>Ctrl</kbd> + <kbd>A</kbd> | Select All Tasks in Batch Mode |
| <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Batch Delete Selected Tasks |
| <kbd>V</kbd> | Toggle Voice Memo Recording |
| <kbd>F</kbd> | Toggle Focus Mode / Fullscreen |
| <kbd>?</kbd> | Open Keyboard Shortcuts Overlay |
| <kbd>Esc</kbd> | Close Active Modal / Search Overlay |

---

## 🛡️ Privacy & Security Guarantee

- **Zero Trackers / Zero Telemetry**: Lumen does not collect analytics or send data to any remote server.
- **Zero Third-Party Database**: Your data never leaves your browser unless you explicitly initiate an encrypted backup or peer-to-peer sync.
- **Bring-Your-Own-Key AI**: If using Google Gemini features, your API key is stored strictly in your browser's local storage and communicated solely with Google's official API endpoint.

---

## 📄 License

Distributed under the [MIT License](LICENSE).
