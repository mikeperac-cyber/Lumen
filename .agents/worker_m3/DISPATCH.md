## 2026-08-29T20:18:12Z
Mission for Milestone M3 (Hardening & PWA Integrity):
1. **Rename postbuild script (R4.1)**:
   - Rename `scripts/postbuild.js` to `scripts/postbuild.cjs` (or create `scripts/postbuild.cjs` and clean up `postbuild.js`).
   - Update `package.json` build command: `"build": "vite build && node scripts/postbuild.cjs"`.
2. **Fix Manifest Hashing (R4.2)**:
   - Ensure `manifest.webmanifest` resolves at root `/manifest.webmanifest` without content hashing in `dist/`.
   - Ensure `scripts/postbuild.cjs` copies `manifest.webmanifest` directly to `dist/manifest.webmanifest` and updates the precache shell list if needed.
3. **Modal Inert & A11y (R4.3)**:
   - In `app.js`, update `openModal(html, opts)` and `closeModal()`, as well as `openSearch()` and `closeSearch()`:
     - Set the `inert` attribute on `document.getElementById('view-root')` (and `aria-hidden="true"`) when modal/search opens.
     - Remove `inert` and `aria-hidden` from `#view-root` when modal/search closes.
     - Save `document.activeElement` before opening, and restore focus to it on close.
     - Add `role="dialog"`, `aria-modal="true"` to modal overlay/container.
     - Trap Tab / Shift+Tab navigation within the active modal dialog.
   - Run `npx playwright test tests/a11y-modal.spec.js` and verify it passes 100%.
4. **Run builds and tests**:
   - `npm run build`
   - `npm run test:unit`
   - `npx playwright test tests/smoke.spec.js`
   - `npx playwright test tests/a11y-modal.spec.js`
5. Write a comprehensive `handoff.md` with verbatim test outputs and send a message to orchestrator when completed.

## 2026-08-29T20:30:12Z
**Context**: Milestone M3 (Hardening & PWA Integrity)
**Content**: Checking in on implementation status for `scripts/postbuild.cjs`, `manifest.webmanifest`, modal `inert` / focus trapping in `app.js`, and `tests/a11y-modal.spec.js`.
**Action**: Please report your progress and test results.
