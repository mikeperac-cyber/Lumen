## 2026-08-29T20:03:49Z

You are Worker M2 on the Lumen project for Milestone M2: Performance Sync & Virtual List.
Your Working Directory: C:\Users\micha\Desktop\Lumen\.agents\worker_m2
Project Root: C:\Users\micha\Desktop\Lumen
Original Request: C:\Users\micha\Desktop\Lumen\.agents\ORIGINAL_REQUEST.md
PROJECT document: C:\Users\micha\Desktop\Lumen\PROJECT.md

Exclusive Write Ownership:
- `src/lib/merge.js`
- `src/habits/store.js`
- `src/tasks/virtual.js`
- `src/tasks/controller.js`
- `app.js`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission for Milestone M2 (Performance Sync & Virtual List):
Read the detailed analysis and specifications from Explorer 2 in `C:\Users\micha\Desktop\Lumen\.agents\explorer_survey_2\analysis.md`.

Tasks:
1. **Sync Merge Signature (`src/lib/merge.js`)**:
   - Replace the expensive O(N log N) `key()` serialization in `applyMerge()` with a cheap O(N) signature (`length` + `max(updatedAt)` across collections).
   - Ensure all 14 scenarios in `tests/unit/merge.test.js` and `tests/sync.spec.js` pass.
2. **Habit Store Loop Capping (`src/habits/store.js`)**:
   - In `currentStreak` and `streakAsOf`, add a maximum iteration cap (`MAX_STREAK_DAYS = 3650`) and date validation to prevent infinite loops while preserving correct streak calculations.
   - Verify `tests/unit/habits.test.js` passes.
3. **Virtual List Flicker Elimination (`src/tasks/virtual.js` & `src/tasks/controller.js`)**:
   - In `src/tasks/virtual.js`: increase overscan (e.g. `OVERSCAN_TOP = 350`, `OVERSCAN_BOTTOM = 500`).
   - In `src/tasks/controller.js`: replace `setTimeout(24)` in `scheduleTaskVirtualRender` with `requestAnimationFrame`. Ensure spacer divs use integer heights and flex-shrink:0. Avoid destroying and recreating DOM nodes when visible item slice has not changed.
   - Verify `tests/unit/tasks-virtual.test.js` and `npx playwright test tests/perf.spec.js` pass.
4. **Save Deferral with `requestIdleCallback` (`app.js`)**:
   - Implement non-blocking idle persistence (`requestIdleCallback` with fallback to `setTimeout`) for routine debounced saves, while preserving immediate synchronous saves for critical user actions (modal submit, page unload).
5. **Run builds and tests**:
   - `npm run build`
   - `npm run test:unit`
   - `npx playwright test tests/smoke.spec.js`
   - `npx playwright test tests/perf.spec.js`
   - `npx playwright test tests/sync.spec.js`
6. Write a comprehensive `handoff.md` with verbatim test outputs and send a message back to orchestrator when completed.
