# Project: Lumen Offline-First Productivity Suite

## Architecture
Lumen is an offline-first browser productivity suite consisting of:
- **Core State & Persistence**: `src/lib/globals.js`, `src/lib/idb.js`, `src/lib/sync.js`, `src/lib/merge.js`, `src/lib/helpers.js`, `app.js`.
- **Domain Subsystems**:
  - Tasks & Kanban: `src/tasks/` (`controller.js`, `store.js`, `virtual.js`, `views.js`).
  - Vault & File Storage: `src/vault/` (`store.js`, `views.js`, `crypto.js`).
  - Finance: `src/finance/` (`store.js`, `views.js`).
  - Habits & Analytics: `src/habits/` (`store.js`, `analytics.js`).
  - Students, Goals, Notes, Timers, Ambient: `src/` respective submodules.
- **Routing & Views**: Dynamic routing via hash routes (`#dashboard`, `#tasks`, `#vault`, `#finance`, etc.) with code-splitting in `renderView()`.
- **Accessibility & Modals**: Dialog management with focus trapping, focus restoration, and `#view-root` `inert` toggling.
- **PWA & Build System**: Vite bundler, PWA manifest (`manifest.webmanifest`), Service Worker (`sw.js`), postbuild processing (`scripts/postbuild.cjs`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1.1 Boot & Syntax Fix | Fix `app.js:1` unescaped `\n` and import syntax | M1 | ORIGINAL_REQUEST §R1 |
| 2 | R1.2 Task Controller Cleanup | Fix `src/tasks/controller.js` string interpolations (`app.$app.$`, `app.${...}`, CSS spacer height) | M1 | ORIGINAL_REQUEST §R1 |
| 3 | R1.3 Reference Error Fixes | Provide `getSearchTasksHay`, `getSearchVaultHay`, `vaultBlobGet`, and `VaultStore` declarations | M1 | ORIGINAL_REQUEST §R1 |
| 4 | R1.4 Module Extraction | Complete extraction of tasks, vault, finance logic cleanly from `app.js` | M1 | ORIGINAL_REQUEST §R1 |
| 5 | R2.1 Virtual List Flicker | Fix `virtual.js` and `controller.js` flicker (overscan, rAF, spacer style) | M2 | ORIGINAL_REQUEST §R2 |
| 6 | R2.2 Save Deferral | Defer non-critical saves with `requestIdleCallback` / `scheduleIdle` | M2 | ORIGINAL_REQUEST §R2 |
| 7 | R3.1 Sync Merge Signature | Replace O(N log N) `key()` serialization in `merge.js` with cheap signature | M2 | ORIGINAL_REQUEST §R3 |
| 8 | R3.2 Habit Loop Bounds | Cap `while` loops in `src/habits/store.js` with `MAX_STREAK_DAYS` and date validation | M2 | ORIGINAL_REQUEST §R3 |
| 9 | R4.1 Postbuild CommonJS | Rename `scripts/postbuild.js` to `scripts/postbuild.cjs` and update build scripts | M3 | ORIGINAL_REQUEST §R4 |
| 10 | R4.2 Manifest Hashing | Ensure `/manifest.webmanifest` resolves unhashed at root for PWA installation | M3 | ORIGINAL_REQUEST §R4 |
| 11 | R4.3 Modal Inert & A11y | Add `inert` attribute to `#view-root` during modals, with focus trapping & ARIA | M3 | ORIGINAL_REQUEST §R4 |
| 12 | R2.3 Code-Splitting Budget | Implement dynamic `import()` route splitting to achieve <250KB Vite chunk budget | M4 | ORIGINAL_REQUEST §R2 |
| 13 | R5.1 CI Coverage Gate | Install `@vitest/coverage-v8`, set 80% threshold on `src/lib`, add unit test assertions | M4 | ORIGINAL_REQUEST §R5 |
| 14 | R5.2 Chunk Budget Gate | Create `scripts/check-chunk-budget.cjs` to enforce <=250KB in CI | M4 | ORIGINAL_REQUEST §R5 |
| 15 | R5.3 Multi-Browser Playwright | Split Playwright into `chromium` and `webkit` projects and update CI workflow | M4 | ORIGINAL_REQUEST §R5 |
| 16 | R5.4 Full Suite Verification | 100% passing E2E smoke tests, unit tests, coverage, chunk budget, and adversarial tests | M5 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Architecture & Boot Fix | R1.1, R1.2, R1.3, R1.4 (app.js syntax, task controller corruption, missing search/vault symbols, module extraction) | none | DONE |
| M2 | Performance Sync & Virtual List | R2.1, R2.2, R3.1, R3.2 (virtual scroll flicker, idle save deferral, merge.js cheap signature, habit loop bounds) | M1 | DONE |
| M3 | Hardening & PWA Integrity | R4.1, R4.2, R4.3 (postbuild.cjs, manifest hashing, modal inert / focus trap) | M1 | DONE |
| M4 | CI Gates & Code-Splitting Budget | R2.3, R5.1, R5.2, R5.3 (dynamic import route splitting, 80% coverage gate on src/lib, chunk budget script, multi-browser Playwright) | M2, M3 | DONE |
| M5 | Final E2E Pass & Adversarial Hardening | R5.4 (100% E2E test pass across chromium & webkit, Tier 5 adversarial stress testing, victory audit) | M4 | DONE |

## Interface Contracts

### Tasks Module ↔ Core App (`src/tasks/` ↔ `app.js`)
- `setupTasksController(options)`: initializes event listeners, virtual scrolling, and column rendering for Kanban/tasks.
- `getSearchTasksHay()`: returns an array of searchable strings/objects representing all tasks in state.
- Virtual scrolling spacer height: inline style format must be exact integer `style="height:${topPad}px;flex-shrink:0"`.

### Vault Module ↔ Core App (`src/vault/` ↔ `app.js`)
- `VaultStore`: object or module namespace providing `vaultHost`, `vaultSort`, `vaultTypeLabel`, `vaultTagSet`, `vaultCardHTML`, `vaultRowHTML`, `vaultWidgetHTML`, `vaultViewHTML`, `vaultModalHTML`, `vaultLinkPickerHTML`.
- `vaultBlobGet(id)`: async function retrieving binary blob by ID from IndexedDB.
- `getSearchVaultHay()`: returns array of searchable strings/objects for vault items.

### Sync & Merge (`src/lib/merge.js`)
- `applyMerge(localState, remoteState)`: merges remote changes into localState using LWW (Last-Write-Wins) and returns `{ changed: boolean, state: Object }`.
- State change signature: single-pass O(N) evaluation `${arr.length}:${maxUpdated}` replacing O(N log N) `JSON.stringify(sort())`.

### Modal & Dialog System (`app.js`)
- `openModal(html, options)`: saves previous `document.activeElement`, sets `inert` attribute on `#view-root`, sets `aria-hidden="true"`, focuses first focusable element inside modal, traps Tab navigation.
- `closeModal()`: removes modal, removes `inert` and `aria-hidden` from `#view-root`, restores focus to saved active element.

## Code Layout
- `app.js`: Application entry point, view routing (`renderView`), modal management, search palette.
- `src/lib/`: Core utilities (`globals.js`, `helpers.js`, `idb.js`, `merge.js`, `sync.js`).
- `src/tasks/`: Tasks subsystem (`controller.js`, `store.js`, `virtual.js`, `views.js`).
- `src/vault/`: Vault storage subsystem (`store.js`, `views.js`, `crypto.js`).
- `src/habits/`: Habits subsystem (`store.js`, `analytics.js`).
- `src/finance/`: Finance subsystem (`store.js`, `views.js`).
- `scripts/`: Build and verification tooling (`postbuild.cjs`, `check-chunk-budget.cjs`).
- `tests/`: E2E tests (`smoke.spec.js`, `a11y-modal.spec.js`, `perf.spec.js`, `sync.spec.js`, etc.).
- `tests/unit/`: Vitest unit tests (`merge.test.js`, `habits.test.js`, `tasks-virtual.test.js`, `helpers.test.js`).
