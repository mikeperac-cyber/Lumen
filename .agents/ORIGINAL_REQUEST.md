# Original User Request

## 2026-08-29T18:54:25Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: full team

Complete the remaining architectural, performance, and hardening tasks for the Lumen application based on an existing migration checklist. The project is an offline-first productivity tool.

Working directory: `C:\Users\micha\Desktop\Lumen`
Integrity mode: development

## Requirements

### R1. Architecture — Decompress app.js
- Extract remaining `tasks`, `vault`, and `finance` logic from `app.js` into their respective modules.
- Ensure the app boots correctly without `ReferenceError`s (currently failing on `getSearchTasksHay` and `vaultBlobGet`).

### R2. Performance — Load & Parse
- Implement code-splitting with dynamic `import()`.
- Achieve a 250KB Vite chunk budget.
- Defer non-critical saves with `requestIdleCallback`.
- Fix rendering flicker in `virtual.js`.

### R3. Performance — Sync Merge
- Replace `key()` serialization in `merge.js` with a cheap signature (`updatedAt` max + `length`).
- Cap recursive loops in `habits/store.js`.

### R4. Hardening Part 2
- Fix `/manifest.webmanifest` hashing.
- Rename `postbuild.js` to `.cjs`.
- Add `inert` polyfill/attribute to `#view-root` for modals.

### R5. Testing & Rollout
- Setup CI gates (80% coverage on `src/lib`, Vite chunk budget).
- Split Playwright into `chromium` and `webkit`.

## Acceptance Criteria

### Verification
- [ ] `npx playwright test tests/smoke.spec.js` passes with zero console errors.
- [ ] Vite build output confirms chunk sizes are under the 250KB budget.
- [ ] All remaining `task.md` checklist items are addressed and verified.
