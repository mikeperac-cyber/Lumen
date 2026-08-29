# Lumen Optimization Plan — Purpose-Aligned, Zero-Build

> Scope answer: **Stay zero-build** — all recommendations keep vanilla HTML/CSS/ES2022, single-file static deploy, local-first with no mandatory cloud. No bundler, no backend.

**Date:** 2026-08-26  
**Codebase:** `app.js` ~11.6k LOC (603KB), `styles.css` ~131KB, single-file `index.html`, PWA `sw.js` v97, `peerjs.min.js` lazy-loaded.  
**Test suite:** 41 Playwright tests (smoke 18, behavioral 15, regression 8 inc. pins + quick-add, offline 1).  
**Deploy:** Vercel Hobby, `cleanUrls: true`, `sw.js` `max-age=0`.

---

## 1) What Lumen Is — Purpose Decoded

**Tagline from README:** *Personal Productivity Operating System & Command Center — Local-First · Zero-Build · Encrypted · Offline-Capable · AI-Augmented.*

**Core loop (the product thesis):**

```
Tasks (capture + Kanban/Eisenhower/timebox)
  ↔ Goals/OKRs (KR auto-progress as linked tasks complete)
  ↔ Habits (heatmaps/streaks/freeze → protect Goals)
  ↔ Notes/Voice (knowledge → extractable tasks)
  ↔ Focus/Pomodoro (time → task + habit protection)
  ↻ Morning Brief / Weekly Review (reflect → re-plan)
  + Students/Finance (domain extension: teaching professional)
```

Everything is **interconnected** — that is the moat. A task completed bumps a KR; a habit protects a goal deadline; a note's checklist becomes tasks; a focus session logs to analytics and streaks.

**Founding constraints (non-negotiable per your answer):**
- Vanilla JS, no bundler/framework, no `npm run build`.
- 100% static, Vercel-cleanUrls, PWA with Web App Manifest.
- Local-first: `localStorage` + `IndexedDB` (state + audio blobs), no mandatory cloud, optional P2P (PeerJS/WebRTC) and BYO Gemini key.
- Privacy: zero trackers, AES-GCM + PBKDF2 client-side encryption, data sovereignty.

**Who it serves:** solo knowledge worker + teaching professional (Students dossier / Finance / lesson plans are not generic — they are the wedge). Optimizations must not dilute this wedge.

---

## 2) How Best-in-Class Do It — Benchmarking

We benchmarked against products that win on the *same jobs* Lumen claims:

### 2.1 Task Execution
| Product | What they do best | What Lumen can steal (zero-build compatible) |
|---|---|---|
| **Todoist** | NL parsing is flawless, Karma (gamified completion), lightning filters, 15+ integrations | NL parser is already strong; missing **natural-language edit** (type to update existing tasks), **smart filters as saved views**, and **completion momentum** (Karma-like streaks already exist via habits — surface it on task complete) |
| **TickTick** | All-in-one: tasks + habits + pomodoro + Eisenhower in one app (closest to Lumen), smart lists, habit->task linkage | TickTick's **unified today list** (tasks + habits due today together). Lumen's Dashboard separates them — Brief already does this, but Tasks view doesn't. |
| **Linear** | Keyboard-driven, <50ms interactions, command palette is primary UI, optimistic updates | **Command palette as primary capture** — Lumen has `Ctrl+K` + `>task` quick-add but it was broken until last fix. Needs to become *the* fastest path (like Linear's `Cmd+K`). Performance budget: Linear proves vanilla-JS speed is achievable without framework. |
| **Sunsama / Akiflow** | Daily planning ritual, timeboxing calendar drag, realistic workload, shutdown ritual | **Daily planning flow** is weaker in Lumen: tasks have `startTime`/`schedDay`/`schedPeriod` but no **time-blocked calendar** with duration. Brief → Schedule hand-off is manual. |

### 2.2 Knowledge & Capture
| Product | Best | Lumen fit |
|---|---|---|
| **Obsidian / Capacities** | Local-first PKM, graph, backlinks, daily notes | Lumen notes lack **backlinks** (`[[Goal]]`/`[[Habit]]`) and **daily note templating**. Voice → note → task is unique; close the loop with `[[note]]` links to tasks/goals. |
| **Notion** | Databases, views, templates | Lumen's no-database simplicity is a feature. Don't copy. Steal **templates** (you already have `state.templates` — unused) as quick project/goal scaffolds. |

### 2.3 Habits & Motivation
| Product | Best | Lumen fit |
|---|---|---|
| **Habitica / Streaks** | Streak protection, freeze, analytics, day-of-week heatmaps | Lumen already has freeze + heatmap. Missing **habit analytics depth** (you have `analytics` view but it's thin) and **habit → goal contribution** visibility. |
| **Superhuman / Sunsama** | Morning brief as ritual | Lumen's **Brief** is under-utilized — best apps make it *unskippable* (Sunsama forces daily planning). Brief should drive the day. |

**Key takeaway:** Best-in-class win not by having *more* features but by **tightening the loop** and **removing friction per capture → execution → reflection cycle**. Lumen's loop exists but has seams: capture is fast, but planning (Brief → Schedule) is not ritualized; knowledge (Notes) is not linked; focus is not tied to habit protection; review is export-only.

---

## 3) Gap Analysis — Where Lumen Leaks Purpose

**Scored against purpose (1–5, 5 = fully delivers):**

| Purpose pillar | Current | Gap |
|---|---|---|
| **Capture anywhere, zero friction** | 4 | Quick-add is excellent, but palette `>task` was broken; voice capture pill is floating but discoverability low; `show on hover when unpinned` dashboard helps but mobile still heavy |
| **Tasks ↔ Goals ↔ Habits interconnection** | 3 | Link exists (task `goalId`/`krId` → KR auto-bumps 12→13), but **invisible**: no graph, no Brief "if you miss this habit, this goal slips" narrative |
| **Focus that protects consistency** | 3 | Pomodoro runs, but not linked to habit streaks or deep-work blocking; no "focus → habit streak freeze" or "focus minutes → goal health" story |
| **Local-first performance** | 3 | Cold boot double-render fixed, PeerJS lazy-loaded, but `app.js` 603KB parses on every load; no code-split; `content-visibility` just added; matrix still 83ms at 2k tasks without virtualization (cap at 60 fixes 80%) |
| **Offline reliability** | 4 | Shell now correct (redirected-response bug fixed, network-first versioned assets), but **conflict resolution** (`applyMerge`) is last-write-wins on `tagColors` etc., no per-field timestamps |
| **Review & reflection** | 2 | Weekly review exports markdown, but no **in-app review ritual** (Sunsama-style: what shipped / what slipped / what to protect). Activity log exists (500 entries) but not surfaced as insights |
| **Trust & sovereignty** | 4 | AES-GCM vault works, but **no auto-encrypted backup** and P2P sync queue visibility is thin ("23 queued" only in settings) |
| **Teaching wedge** | 3 | Students/Finance/teaching hub exist but feel bolted-on vs integrated loop (lesson plan → tasks → habit → finance not connected) |

---

## 4) Optimization Pillars — All Matched to Purpose

We propose **4 pillars**, each with optimizations that *strengthen the loop* while respecting zero-build:

### Pillar A — The Interconnected Loop (make links visible and actionable)
*Goal: every action visibly moves another part of the system. This is the OS feeling.*

### Pillar B — Local-First Performance (speed = trust)
*Goal: feel native, even with 2000 tasks, on a $300 Android, offline.*

### Pillar C — Ritual & Reflection (brief → day → review)
*Goal: turn Brief and Weekly Review from reports into rituals you cannot skip.*

### Pillar D — Sovereignty & Resilience (offline + encrypted, never surprising)
*Goal: data never lost, sync never confusing, encryption never scary.*

---

## 5) Proposed Optimizations — The Plan (8+2)

Each item lists **purpose fit**, **zero-build approach**, **effort**, **validation**. Ordered by *purpose leverage per effort*.

### Phase 1 — Close the Loop (Weeks 1–2, no new views)

#### 1) Daily Planning Ritual — Brief becomes the gate (Pillar C)
- **Problem:** Brief is passive. Sunsama's power is forcing a 2-minute plan before work. Lumen's loop leaks here.
- **Optimization:** Turn `#brief` into a **commit step**: each morning it shows 3 buckets — *Overdue*, *Today's candidates* (top 5 by priority/goal health), *Habits to protect* — with drag-to-order and a single **Commit Day** button that moves committed tasks to `today` and seeds pomodoro queue. No new view; reuses existing `brief` + `tasks`/`schedule` state.
- **Zero-build:** Pure HTML/CSS/JS, localStorage `brief.commitDate`. No calendar integration.
- **Validation:** Playwright: visit Brief, commit 3 tasks, assert they appear in `today` column and `schedule` timetable.

#### 2) Link Graph — Make task↔goal↔habit↔note visible (Pillar A)
- **Problem:** The KR bump on task complete is invisible magic.
- **Optimization:** On `openTaskModal`, `openGoalModal`, `openHabitModal`, and note preview, render a tiny **link graph footer**: e.g., task card shows `→ KR "Reach 20 students" (13/20)` and habit shows `protects → Goal "Grow tutoring"`. In Brief/Dashboard, each item gets a `· linked` chip. Backlinks: `[[goal:ID]]` syntax in notes auto-links (rendered as pill, no editor change).
- **Zero-build:** Derives from existing `goalId`/`krId`/`habitId` fields + `esc()` rendering. No graph DB.
- **Validation:** Create goal → link task → complete task → assert KR text updates + chip appears in Brief.

#### 3) Command Palette as Primary Capture (Pillar A+B)
- **Problem:** `>task ship it tomorrow !high` was broken (filtered out); Linear wins by making palette primary.
- **Optimization (already fixed, now harden):** Keep the fix (surface `quickAdd` via `cmdWord`), add **fuzzy ranking** (exact title > tag > due proximity) and **recent commands** (`localStorage` last 5). Add `>habit`, `>note`, `>focus` quick-add parity.
- **Zero-build:** In-memory ranking, no Fuse.js. Cap results 50 (done).
- **Validation:** Existing `regression.spec.js: search quick-add` already covers.

#### 4) Focus → Habit Protection (Pillar A+C)
- **Problem:** Pomodoro and habits are siloed.
- **Optimization:** When a focus session (`pomo.running`) completes while a habit is due today and not checked, offer **one-tap protect**: toast `Streak protected via focus — freeze evening read?` with undo. Log focus minutes to habit analytics (`analytics` view already aggregates, just feed it).
- **Zero-build:** Reuse `habitStreak`/`toggleHabitDate` freeze path.
- **Validation:** Start pomo (dashboard), complete, assert habit freeze prompt appears if due.

### Phase 2 — Speed You Feel (Weeks 2–3)

#### 5) Dashboard & Matrix Memoization + Virtualization (Pillar B) — *partially shipped, finish*
- **Already:** `_stateRev` + `_deadlinesMemo`, matrix `MATRIX_PAGE=60`, `content-visibility: auto`, IDB `structuredClone`, `preload`+`fetchpriority`.
- **To finish:**
  - Memoize `timeTrackDashboardHTML` and `teachingDashboardHTML` (currently recompute `catEntries`/`topTasks` over all tasks each dashboard visit). Cache per `_stateRev`.
  - Matrix: replace `Show N more` with **IntersectionObserver** virtualization (reuse existing `createListVirt` / `createGridVirt` helpers already in `app.js:2420` range). Keeps drag-and-drop.
  - `initDashWidgets` already uses detached `dw-body-in` — measure with `performance.now()` in `perf` view and assert <16ms dashboard render at 2k tasks.
- **Validation:** Seed 2000 tasks, assert dashboard `perfRecord` < 50ms, matrix `Show more` expands without full re-render.

#### 6) Offline Conflict Clarity (Pillar D)
- **Problem:** `applyMerge` for `tagColors` etc. is `if (!local || v) local=v` — last-write-wins, deletions never propagate.
- **Optimization:** Add **per-field `updatedAt` tombstones** for `tagColors`, `incomeTypes`, `expenseCategories` only (tiny, zero-build). Keep full-state LWW for tasks/goals/habits (they already have `updatedAt`). No new sync protocol.
- **Validation:** Offline test: change tag color on device A, delete on B, sync → deterministic winner by timestamp; add `tests/offline.spec.js` case.

#### 7) Encrypted Auto-Backup (Pillar D)
- **Problem:** Vault encryption exists but is manual (Settings → Export). Users lose data and blame local-first.
- **Optimization:** If `settings.vaultPasswordHash` or `geminiApiKey` exists and `settings.autoBackup` (opt-in toggle, default off), on `flushSave` also write an **encrypted snapshot to IDB** (`lumen-vault-auto`, 3 rotating slots). Restore flow already exists.
- **Zero-build:** Reuse `encryptVaultBackup` (PBKDF2+AES-GCM) already in `app.js:421`. No background worker.
- **Validation:** Enable auto-backup, mutate state, assert IDB has 1 encrypted blob; simulate `localStorage` clear → restore from auto-vault.

### Phase 3 — Depth Without Bloat (Week 4, still zero-build)

#### 8) Notes Backlinks + Daily Template (Pillar A)
- **Problem:** Notes are islands; `state.templates` is dead code.
- **Optimization:** Render `[[...]]` in note preview as pill links (already have `esc()` pipeline; add regex `\[\[([^\]]+)\]\]` → search for goal/habit/task title). Add **one** daily template: `New note` pre-fills `# {{date}} — Plan / Notes / Wins` if no note today. No new view.
- **Validation:** Create note with `[[Grow tutoring]]`, assert pill links to goal; new note at 00:01 pre-fills template.

#### 9) Student ↔ Finance ↔ Goal Weave (Pillar A — wedge)
- **Problem:** Teaching hub feels separate.
- **Optimization:** On `teachingDashboardHTML`, show **per-student goal linkage**: e.g., student "Ana — IELTS 7.5" links to goal "IELTS cohort Q3". Finance `income` already has `student` field — surface it in student dossier + goals. No new view; just 2 new chips/rows.
- **Validation:** Create student → link goal → log income for student → assert dossier shows goal progress + finance row.

#### 10) Habit Analytics Depth (Pillar C)
- **Problem:** `analytics` view exists but is thin vs Streaks.
- **Optimization:** In `analytics`, add **day-of-week win-rate** and **decay warning** (habits with 2 misses in 7 days). Data already in `habit.dates` + `freqType`; compute `groupBy` client-side. Reuse `transformations` mental model (filterByValue >0.01) — no new library.
- **Validation:** Seed habit with 30 days of data, assert Mon–Sun bars render and decay banner appears.

---

## 6) Out-of-Scope / Explicitly Not Doing

- **No new top-level views** (per `.memory/topics/lumen-roadmap.md: do not add views`). All optimizations reuse `brief/dashboard/tasks/habits/notes/...`.
- **No framework/bundler** (per your scope answer).
- **No mandatory cloud** — P2P stays PeerJS lazy-loaded (already 92KB saved per boot). No Supabase/Firebase.
- **No Electron/Capacitor** wrapper in this phase — PWA already installable; keep Vercel Hobby deploy.
- **No WASM crypto** — Web Crypto PBKDF2 100k iterations is sufficient; WASM would break zero-build.

---

## 7) Dependencies & Order

```
Phase 1 (loop) : 1 → 2 → 3 → 4  (3 is done, 2 unblocks 4)
Phase 2 (perf) : 5 (finish memo) → 6 (conflict) → 7 (auto-backup)  (7 depends on 6's IDB pattern)
Phase 3 (depth): 8 + 9 + 10 in parallel (all read from same state, no cross-deps)
```

If any Phase 2 item slips, Phase 3 can still ship — they are independent reads.

---

## 8) How We Validate Without Breaking Zero-Build

- **Existing guardrails:** 41 Playwright tests must stay green; `npm test` runs on `push` via `ci.yml` (ubuntu-latest, `npx serve`). All new optimizations add `regression.spec.js` cases (like pin widgets + quick-add already did), never modify existing assertions except where bug was the test (habit `.day.frozen` 1→2).
- **Perf budgets:** Dashboard `perf` view already records `performance.now()` per view. Assert <50ms dashboard at 2k tasks; matrix <16ms initial window.
- **Offline matrix:** `tests/offline.spec.js` pattern (spawn `serve` on 8094, kill, reload) will cover conflict + auto-backup restore.
- **Manual ritual check:** Brief commit → Today → Focus → Review must be completable in <3 minutes with keyboard only (Linear-like).

---

## 9) Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Memoization staleness (deadlines not updating at midnight) | Memo key includes `todayISO()`; add `setInterval` at 00:00 to invalidate `_deadlinesMemo` |
| Matrix virtualization breaks drag-and-drop | Keep drag handlers on `.matrix-task[draggable]`; virtualization via `Show more` not `content-visibility` alone, so dragged items are always in DOM when visible |
| Search index memory (haystacks for 2k tasks) | Haystacks built lazily per `_stateRev`, cap 50 results, store only `hay` string per task (~30KB for 2k) |
| Auto-backup IDB quota | 3 rotating slots, each ~2MB encrypted → 6MB, well under IDB 50MB; fallback to skip if `QuotaExceededError` |
| Pin engine vs new link chips layout | Chips use `gap:6px` flex, pin toggle `position:absolute` top-right with `padding-right:26px` on head — already proven not to overlap `dl-counts` |

---

## 10) What We Ship Next (if you approve)

**If you say "go":** I will implement **Phase 1 (items 1–4)** in `app.js`/`styles.css` only, bump `sw.js` `lumen-cache-v98`, add `regression.spec.js` coverage, and keep `npm test` green — all within zero-build. Phase 2 follows after your review.

> One question deferred to build time: should the Daily Planning Ritual (`Commit Day`) be **blocking** (Brief shows an overlay until you commit) or **soft-nudge** (banner + toast, dismissible)? Recommended: soft-nudge to respect zero-friction capture.

---

*This plan was generated from repository state at `app.js` 11,641 LOC / `styles.css` 131KB / `sw.js` v97 / `playwright.config.js` fresh context. Competitive analysis uses public feature sets of Todoist, TickTick, Linear, Sunsama/Akiflow, Notion, Obsidian, Habitica as of 2026.*
