# Personal Vault — Dashboard Section + Full Vault — Build Plan

**Date:** 2026-08-28  
**Base:** `app.js:12800+` 691KB, `styles.css:2890` 137KB, `sw.js:v103`, 43 Playwright green, `lumen.state.v1` + `lumen-audio` IDB, `STATE_DB='lumen-state'` dual-write `flushSave:696`
**Target:** Add Personal Vault as dashboard section **and** dedicated full view, with links + binary files (docs/sheets/pdfs) local-first, plain (no encryption) per interview, integrated into all tools via links/search/attachments.

---

## 0) Decisions Locked (Interview 2026-08-28)

* **Content:** Full file vault — URL + title + description + tags + type + file blob mandatory path. `FILE_TYPE_ICONS:1332` drives type. Reuse `blobPut/blobGet/blobDelete:idb:771` pattern with new `lumen-vault` IDB store. 10MB per file / 100MB vault soft cap (quota toast). Large >10MB stays link-only.
* **Encryption:** Plain only — no `deriveVaultKey:421` PBKDF2. Fastest, like `tasks/notes`. Future opt-in can wrap `encryptVaultBackup:424` without migration.
* **Placement:** Dashboard + full view — `dash-grid` widget (pinnable, like `dashboardPins` existing) + dedicated `vault` route (`TITLES:948`, `NAV:1286`, `MAIN_VIEWS:1290` → add `vault`). Same `state.vaultItems` both places. Global search `_searchIndex:685` includes vault.
* **Integration:** All of the above — deep FK links `linkedTaskIds/linkedGoalIds/linkedNoteIds/linkedStudentIds` (like `goals[].linkedStudentIds:600`) + shallow global search + task attachment picker (vault → `task.attachments` `blobId`). Backlinks via `linkGraphForTask:1881`/`renderBacklinks`.
* **Organization:** Full taxonomy day one — Tags (`tagColors:459`, `state.tagColors`) + Type chips (Link/Doc/Sheet/PDF/Image/Video) + debounced search `bindFilterInput:134` + Folders/Collections (`kanbanLists:808` pattern → `vaultCollections`). Filters combine (type × tag × collection × search).
* **Sync:** IDB blobs + peer sync — blobs stay IDB-only (never stringified into `state` snapshot → avoids `flushSave` quota), metadata `state.vaultItems` syncs via `syncMeta.tombstones` LWW `applyMerge:7728` + new `vaultItemsMeta` + `vaultCollectionsMeta`, blob sync deferred to `syncQueue` via `blobId` reference; v1 local-only queue, v2 blob replication.

**Constraints carried forward:** local-first LS+IDB, offline shell `offline.spec.js:37` green, no mandatory cloud, BYO Gemini untouched, `_stateRev:675` memo invalidation, `vercel.json` cleanUrls, `sw.js:21` usable, `_autoVaultIdx:515` persisted.

---

## 1) Scope & Boundaries

**In:** `state.vaultItems[]`, `state.vaultCollections[]`, `lumen-vault` IDB store, `views/dashboard` widget + `views/vault` full view, `openVaultModal` CRUD, `vaultLinkPicker` in `openTaskModal:5050`, `openGoalModal`, `openNote` insert, search palette, folder/tag CRUD, type filter, drag-drop upload + preview, peer sync merge.

**Out:** Encryption, AI auto-tag (v2), external cloud drive mount (Drive/Dropbox), versioned file history, OCR, shared vault ACLs. Keep `Web Worker` PBKDF2 out of scope (plain vault).

**Boundaries:** No new build deps. Keep god-file seam: new vault logic goes `src/vault/items.js` + `src/vault/blobs.js` after Vite split, but v1 implements inline in `app.js` with `window.LumenLib.vault.*` delegation like `LumenLib.crypto/parser/gemini/students/schedule` already (see `app.js:420`).

---

## 2) Data Design

**`VaultItem` (plain, IDB blob separate):**
```js
{ id, title, url, description, type: 'link'|'doc'|'sheet'|'pdf'|'image'|'video'|'other',
  tags: string[], collectionId: string|null,
  fileName, mime, size, blobId, // null if link-only
  linkedTaskIds: [], linkedGoalIds: [], linkedNoteIds: [], linkedStudentIds: [],
  createdAt, updatedAt, pinned: boolean }
```
**`VaultCollection`:** `{ id, title, color, createdAt }` (like `kanbanLists:808`, `COVER_COLORS:809`)

**State shape:**
```js
state = { ..., vaultItems: [], vaultCollections: [], _vaultItemsMeta: {}, _vaultCollectionsMeta: {} }
```
Add defaults in `normalizeState:545` (+ backfill `linked*Ids=[]` + `pinned=false` + `collectionId=null`). Keep `getVaultCollections()` like `getKanbanLists:810` + `getStudentsList:618` coercion.

**IDB `lumen-vault`:** `createObjectStore('blobs')` key=`blobId` (same API `blobPut/Get/Delete:771`). Metadata stays in `state.vaultItems`; blob never enters JSON snapshot → `flushSave` safe.

**Sync:** `syncMeta.tombstones.vaultItems = { [id]: ts }`, `syncMeta.tombstones.vaultCollections = {}` ; `state._vaultItemsMeta[id]=ts`, `_vaultCollectionsMeta[id]=ts`. `applyMerge` adds LWW case `vaultItems/vaultCollections` mirroring `tagColors:7728`. Blob replication enqueued as `syncQueue` entry `{ type:'vaultBlob', blobId, vaultId }`, resolved on peer connect via `idbGet→put`.

---

## 3) Data Flow

`Dashboard widget` ← `getVaultItemsFiltered()` → `state.vaultItems` + `lumen-vault` blobs (lazy `blobGet` for preview) → `renderDashboard` memo `_dashMemo` (rev-gated). `Vault view` → same filter + `createListVirt:1955` / `createGridVirt` for 2k items. `openVaultModal` → `captureUndo` → `blobPut` → `state.vaultItems.unshift` → `save()` (+ `_stateRev++` invalidates `_dashMemo/_searchIndex`). `openTaskModal` → `vaultLinkPicker` multi-select → writes `vaultItem.linkedTaskIds` + `task.vaultIds` (new optional `task.vaultIds:[]` back-compat) → `save()` → `linkGraphForTask` renders `→ Vault: Title` pill, `vaultCard` renders linked task chips. `globalSearch` → `_searchIndex` includes `vaultItems` hay `title+url+tags+description`.

---

## 4) UX — Dashboard Section + Full Vault

**Dashboard widget (`dash-grid` top, pinnable):**
- Header: `🔐 Personal Vault — 12 links · 4 PDFs · 3 Sheets · 9 pinned` + `Open Vault →` + `+ Add` + pin toggle (like dashboardPins)
- Body: 6 most recent/pinned `vault-card-mini` (icon `FILE_TYPE_ICONS` + `fileIcon`, title, `tagSpan`, collection dot, `timeAgo`, link chips count `↗3`)
- Click → `openVaultModal(item)` or `window.open(url)` / `blobGet` preview
- Empty: `No vault items — drop a PDF or paste a link` + `Add link` + `Upload file` drag zone

**Full Vault view (`#vault`, nav `vault: ['folder','Vault']`, behind `More` if nav crowding):**
- Toolbar: `Search` (`bindFilterInput`) + `Type` filter chips (All/Link/Doc/Sheet/PDF/Image) + `Collection` select + `Tag` select + `+ Add link` + `Upload` (drag-drop whole view)
- Collection bar: horizontal chips + `+ New collection` modal (like `addKanbanList:832`)
- Grid: `vault-grid` `repeat(auto-fill,minmax(260px,1fr))` cards: cover preview (image/pdf thumb or `COVER_COLORS` fallback), `fileIcon`, title, url host, description clamp 2, `tagSpan` + `collection` dot, meta `fmtShort(updatedAt)` + `fileSizeStr(size)` + `linkedTaskIds.length` badge, actions `Open / Copy link / Edit / Delete / Pin`
- List toggle: grid↔list (list = `vault-row` with inline `Open` + `tagSpan`)
- Drag-drop: `drop` on view → `openVaultModal` prefilled with file; paste `text/uri-list` → link; `navigator.clipboard` link capture.

**Modals:**
- `openVaultModal(item?)`: Title, URL (validated `https://`), Description, Type auto-detected from mime/extension + override select, Tags (comma), Collection select, File input (single, `accept: .pdf,.doc,.docx,.xls,.xlsx,.png,.jpg` ) + drag zone, Linked tasks/goals/notes/students multi-select (from `state.tasks/goals/notes/students`), Pinned checkbox. Save → `blobPut` if file → `blobId` else link-only. Delete → `blobDelete` + tombstone.
- `vaultLinkPicker` in task/goal/note modals: searchable multi-select + `Create new vault item` inline.

---

## 5) Integration Wiring (All-of-the-above)

1. **Task:** `openTaskModal:5050` add `Vault links` field (below Goal) `multi-select` from `getVaultItems()`; save writes `task.vaultIds` + reverse `vaultItem.linkedTaskIds`. `taskCardHTML` + `linkGraphForTask` shows `→ Vault: Title (3)` pills. Click pill → `openVaultModal`.
2. **Goal:** `openGoalModal` add `Linked resources` multi-select + `vaultResources` chips in `goalCardHTML:5450`.
3. **Note:** `openNoteModal` add `Insert vault link` button → inserts `[[Vault:Title]]` markdown + `renderBacklinks` parses `[[Vault:…]]` like `[[Title]]:6893`.
4. **Student dossier / Finance / Projects:** dossier `Resources` tab lists vault items where `linkedStudentIds.includes(s.id)`.
5. **Search:** `_searchIndex` builder includes `vaultItems.map(v=> getVaultHay(v))` where `getVaultHay = title+" "+url+" "+tags+" "+description+" "+collectionTitle`; palette `>vault` prefix filters vault only.
6. **Attachments bridge:** `f-attach-file` flow offers `Choose from Vault` → `blobGet(vault.blobId)` → `blobPut(newAttachId)` copy (dedupe by `blobId`).

---

## 6) Tasks (Ordered, Shippable Slice)

1. **Schema + IDB:** Add `STATE` defaults + `lumen-vault` store `vaultBlobs()` (`blobPut/Get/Delete` copy), `normalizeState` backfill, `getVaultItems/Collections()` helpers, `_vaultItemsMeta` init. `node --check app.js`.
2. **CRUD modal + full view scaffold:** `openVaultModal` (link-only first), `renderVault()` stub (toolbar + empty state), route `vault` in `TITLES/NAV/MAIN_VIEWS` + `RENDERERS`, `vercel.json` unchanged. Keep `app.js` shim.
3. **File blobs:** Wire `input[type=file]` + drag-drop → `blobPut` (10MB guard toast `File too large — link instead`) → `size/fileName/mime/blobId`; preview `URL.createObjectURL(blobGet)` revoke. Vault card shows `fileIcon` + `fileSizeStr`.
4. **Organization:** Tag `tagSpan` + Type chips + Collection CRUD (`addVaultCollection/renameVaultCollection/deleteVaultCollection` moves items to `null` like `deleteKanbanList:843`) + `bindFilterInput` search. Use `createGridVirt` for 100+ items.
5. **Dashboard widget:** `renderDashboard` add `vaultWidgetHTML()` top of `dash-grid`, pinnable via `state.settings.dashboardPins.vault` (like existing pins), memo `_dashMemo` includes `vaultItems.length+updatedAt` key, `updateNavBadges` shows `vault` count.
6. **Deep linking:** Add `task.vaultIds` (optional, default `[]`) migration, `openTaskModal` picker (2-way sync), `goal/note/student` pickers, `linkGraphForVault` + `renderVaultBacklinks`, `backfillVaultLinks` on load.
7. **Search & palette:** Extend `_searchIndex` + `getSearchTasksHay` → `getSearchHay` unified, add `>vault` palette prefix, `fuzzyScore:12268` boost vault title matches.
8. **Peer sync:** Extend `syncMeta.tombstones` + `applyMerge` LWW for `vaultItems/vaultCollections`, `tombstone('vaultItems',id)`, queue `vaultBlob` sync entries; add `maybeAutoSync` hook.
9. **Perf + offline:** `vault-grid` `content-visibility:auto` `contain-intrinsic-size`, `sw.js SHELL` unchanged (vault assets are IDB, not shell), add perf budget check `vault` view `<50ms` for 500 items via `perfLog`.
10. **Tests + bump:** Add `tests/vault.spec.js` (CRUD link, upload PDF <5MB, tag/type filter, collection move, dashboard widget pin, task vault link round-trip, search `>vault`), `node --check`, `npx playwright test --reporter=list` expect 44 (43+1) green, `offline.spec.js` still green. Bump `sw.js VERSION='lumen-cache-v104'` + `index.html ?v=104`.

---

## 7) Validation

* **Commands:** `node --check app.js` , `npx playwright test --reporter=list` (expect 44 green, offline 1 still 6s), `npx serve . -l 8092` manual vault drag-drop + reload.
* **Cases:** Link CRUD, PDF upload 9MB → success + preview, 11MB → toast + link-only, tag filter `work` → correct subset, type `PDF` → only pdfs, collection delete → items move to Unsorted, dashboard pin toggle persists, task vault link → vault card shows task chip and task pill shows vault, global search `>vault Design` → vault hit, reload persists (LS+IDB), `localStorage` clear + `stateDbGet` restore still shows vault (IDB blob retained).
* **Quota:** Fill 95MB vault → soft cap warning `Vault near quota — remove files or increase cap in Settings`, 105MB → block upload with `Vault quota exceeded`.

---

## 8) Risks → Mitigations

* **Quota blow-up (`flushSave:696` LS quota):** Blobs IDB-only, never `JSON.stringify(state)`; guard `blobPut` `QuotaExceededError` → toast + link-only fallback.
* **God file 691KB:** Add `src/vault/*` delegation (`window.LumenLib.vault`) same as `LumenLib.crypto:420`; keep `app.js` shim until Vite `dist/` cutover per `v103 Stabilize`.
* **Sync conflict (tombstones):** LWW per-id `vaultItemsMeta` like `tagColorsMeta:769`; delete writes tombstone + `saveSyncMeta()`, merge respects newer `updatedAt`.
* **Search index churn (`_searchIndex:685`):** Include vault only when `vaultItems` length/sum updatedAt changes; same `_stateRev` invalidation.
* **Offline shell:** No new `SHELL` entries; vault is IDB, offline reload still `200` via `caches.match` fallback.
* **File type spoof:** Validate `mime` + extension via `FILE_TYPE_ICONS` allowlist, fallback `other`, never execute blob as script (open via `URL.createObjectURL` with `noopener`).

---

## 9) Rollout / Migration

* Additive only: `normalizeState` creates `vaultItems/Collections` empty, existing vaults unaffected. `task.vaultIds` defaults `[]` (no data loss). `vault` route behind `More` first, promote to primary nav after dogfooding.
* Rollback: Feature-flag `settings.vaultEnabled` (default `true`), widget hidden if `false`; `tombstone` keeps deleted ids for one release so downgrade does not resurrect.
* Version: `lumen-cache-v104` + `?v=104` + tag `v104-vault`.

---

## 10) Open Question (Confirm at Build Start)

* **TypeScript scope for vault:** `allowJs:true` + JSDoc `/** @typedef {VaultItem} */` for `state.vaultItems` shape only, full `ts` later — keeps `v103` Vite churn low. If you want strict `ts` now, expand task 1 to add `tsconfig` + `vault.ts` and `tsc --noEmit` to CI.

## 11) Next Step for Builder

* Read `app.js:545` `normalizeState`, `app.js:771` `blobPut/Get`, `app.js:1286` `TITLES/NAV`, `styles.css:2858` vault styles seam, `playwright.config.js:8`, `vercel.json`, `sw.js:7` before edit.
* Execute tasks 1→10 in order, keep `app.js` shim until green, then open PR `v104-vault` with `tests/vault.spec.js`.
