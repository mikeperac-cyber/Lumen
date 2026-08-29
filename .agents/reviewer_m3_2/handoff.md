# Milestone M3 Reviewer 2 & Adversarial Audit Report: Hardening & PWA Integrity

## 1. Observation

Direct code inspections and execution results from `C:\Users\micha\Desktop\Lumen`:

1. **Postbuild CommonJS Integration (R4.1)**:
   - `package.json:9` contains `"build": "vite build && node scripts/postbuild.cjs"`.
   - `scripts/postbuild.cjs` exists and `scripts/postbuild.js` was removed.
   - Running `npm run build` completed successfully in 139ms, copying 5 static assets and rebuilding `SHELL` with 13 entries.

2. **PWA Manifest Root Resolution & Service Worker Precache (R4.2)**:
   - `scripts/postbuild.cjs` copies `manifest.webmanifest` directly to `dist/manifest.webmanifest`, cleans up any hashed Vite chunk `dist/assets/manifest-*.webmanifest`, and normalizes `<link rel="manifest" href="manifest.webmanifest">` in `dist/index.html`.
   - `sw.js` and `dist/sw.js` precache list (`SHELL`) correctly contains `./manifest.webmanifest`, `./index.html`, and all required icons and bundles without self-referencing `sw.js`.

3. **Modal & Palette Accessibility, Focus Management, and Inert Isolation (R4.3)**:
   - In `app.js:1337-1424` (`openModal`):
     - Sets `inert` and `aria-hidden="true"` on `#view-root`.
     - Assigns `role="dialog"`, `aria-modal="true"`, and `tabindex="-1"` to `.modal`.
     - Automatically discovers heading (`.modal-head h3`, etc.), assigns a unique id, and links `aria-labelledby`.
     - Ensures all close buttons (`[data-close-modal]`, etc.) have `aria-label="Close"`.
     - Traps keyboard focus within the dialog on `Tab` / `Shift+Tab` and wraps correctly.
     - Saves opener in `_modalReturnFocus` (only on initial open to preserve opener across chained modals).
     - Closes on `Escape` and backdrop clicks (mousedown + click confirmation).
   - In `app.js:1426-1444` (`closeModal`):
     - Cleans up keydown listener and removes `#modal-root` content.
     - Removes `inert` and `aria-hidden` from `#view-root` if search overlay is not active.
     - Restores focus to `_modalReturnFocus` with `isConnected` sanity check.
   - In `app.js:10365-10697` (`openSearch` & `closeSearch`):
     - Sets `role="dialog"`, `aria-modal="true"`, `aria-label="Search and commands"`, and traps focus.
     - Coordinated inert toggling: `#view-root` remains inert while either modal or search palette is open.
   - In `app.js:1486-1493` (`renderView`):
     - Resets open modals/search on route change and clears `inert` / `aria-hidden` from `#view-root`.

4. **Integrity & Anti-Cheating Verification**:
   - Inspected `app.js`, `src/lib/`, `scripts/postbuild.cjs`, `tests/a11y-modal.spec.js`, and `tests/dist-artifact.spec.js`.
   - No hardcoded test assertions, facade implementations, or bypass short-circuits were detected.

5. **Test Suite Verifications**:
   - `npm run build`: Exit Code 0 (139ms)
   - `npm run test:unit`: 28 test files passed, 374 tests passed (1.14s)
   - `npx playwright test tests/a11y-modal.spec.js`: 8 passed (8.3s)
   - `npx playwright test tests/dist-artifact.spec.js`: 3 passed (385ms)
   - `npx playwright test tests/smoke.spec.js`: 19 passed (14.2s)
   - `npx playwright test tests/a11y-app.spec.js tests/a11y-forms.spec.js`: 12 passed (9.6s)

---

## 2. Logic Chain

1. **Premise 1: Postbuild Execution**:
   - Node environments parsing CommonJS files must explicitly match extension or package settings. Naming the script `.cjs` guarantees deterministic execution across Node configurations.
   - *Verified*: `package.json` correctly runs `node scripts/postbuild.cjs` and produces a valid `dist/` artifact.

2. **Premise 2: PWA Root Scoping**:
   - PWA specifications resolve scope and icons relative to the manifest's URL. Hashed manifests inside subdirectories break scoping and offline caching.
   - *Verified*: `dist/manifest.webmanifest` lives unhashed at the distribution root, and `tests/dist-artifact.spec.js` validates that all icon paths and `start_url` resolve cleanly against root.

3. **Premise 3: WAI-ARIA Dialog & Inert Contract**:
   - Modals and command palettes must isolate underlying content via `inert` / `aria-hidden="true"`, manage focus trapping, provide accessible names linked to headers, and restore focus to the calling control.
   - *Verified*: Centralizing dialog lifecycle in `openModal()` and `openSearch()` uniformly covers all 90+ modal invocations, confirmed by 100% pass rate in `tests/a11y-modal.spec.js`, `tests/a11y-app.spec.js`, and `tests/a11y-forms.spec.js`.

---

## 3. Caveats

- **Cross-Browser WebKit CI Validation**: Playwright tests were validated in the standard local Chromium execution engine; full multi-browser split (`chromium` & `webkit`) is scheduled for Milestone M4/M5.
- No other caveats.

---

## 4. Conclusion

**Verdict: APPROVE**

The implementation of Milestone M3 (Hardening & PWA Integrity) meets all functional, architectural, accessibility, and integrity criteria. All contracts specified in `PROJECT.md` and `ORIGINAL_REQUEST.md` (§R4) are satisfied.

---

## 5. Verification Method

To independently verify all findings and test suites from the project root (`C:\Users\micha\Desktop\Lumen`), run:

```powershell
# 1. Build validation
npm run build

# 2. Vitest unit tests
npm run test:unit

# 3. Modal accessibility & focus management tests
npx playwright test tests/a11y-modal.spec.js

# 4. Distribution artifact & PWA manifest verification
npx playwright test tests/dist-artifact.spec.js

# 5. Smoke & form accessibility regression checks
npx playwright test tests/smoke.spec.js tests/a11y-app.spec.js tests/a11y-forms.spec.js
```

---

## Adversarial & Quality Review Summary

### Review Summary
**Verdict**: APPROVE

### Verified Claims
- `scripts/postbuild.cjs` replaces `scripts/postbuild.js` and builds clean artifact → Verified via `npm run build` → PASS
- Manifest resolves unhashed at root with all icons and start_url valid → Verified via `tests/dist-artifact.spec.js` → PASS
- `#view-root` correctly toggles `inert` and `aria-hidden` on modal/palette open/close → Verified via `tests/a11y-modal.spec.js` & code trace → PASS
- Focus trapping and restoration work across all modal types and command palette → Verified via `tests/a11y-modal.spec.js` → PASS
- No regressions across existing views and form labels → Verified via `smoke.spec.js` (19/19) and `a11y-forms.spec.js` (8/8) → PASS

### Adversarial Stress Tests
- **Detached Opener Defense**: Checked `app.js:1441` (`back.isConnected && typeof back.focus === 'function'`) preventing crashes when opener element is deleted while modal is open → PASS
- **Chained Modal Focus Retention**: Checked `app.js:1338` (`if (!$('#modal-root').innerHTML) _modalReturnFocus = document.activeElement;`) preventing intermediate dialogs from overwriting the initial page focus target → PASS
- **Empty Modal Focus Trap**: Checked `app.js:1387-1390` (`if (!f.length) { e.preventDefault(); dialog.focus(); return; }`) gracefully trapping focus on the dialog container if no focusable controls exist → PASS
- **Route Navigation Cleanup**: Checked `app.js:1487-1493` (`renderView()`) resetting open modals/search and clearing inert attributes on hash routing → PASS
- **Integrity / Cheating Check**: Confirmed absence of hardcoded test outputs or dummy facades → PASS
