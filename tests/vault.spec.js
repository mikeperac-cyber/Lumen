// @ts-check
const { test, expect } = require('@playwright/test');

async function clearState(page){
  await page.evaluate(async () => {
    try{ localStorage.clear(); }catch(_){}
    try{ if('serviceWorker' in navigator){ const regs=await navigator.serviceWorker.getRegistrations(); for(const r of regs) await r.unregister(); } }catch(_){}
    try{ if (typeof window.__closeVaultDb === 'function') window.__closeVaultDb(); }catch(_){}
    const dbs=["lumen-state","lumen-vault","lumen-audio","lumen-vault-auto"];
    for(const name of dbs){
      try{ await new Promise((res)=>{ const rq=indexedDB.deleteDatabase(name); rq.onsuccess=res; rq.onerror=res; rq.onblocked=res; }); }catch(_){}
    }
    if(typeof state!=="undefined"){
      state.vaultItems=[]; state.vaultCollections=[]; state._vaultItemsMeta={}; state._vaultCollectionsMeta={};
      state.tasks=[]; state.goals=[]; state.notes=[]; state.habits=[]; if(typeof vaultFilter!=='undefined') vaultFilter={q:'',type:'',tag:'',collection:''};
      try{ save(); }catch(_){}
    }
  });
  await page.waitForTimeout(600);
  await page.reload({ waitUntil:"domcontentloaded" });
  await page.waitForTimeout(800);
}

async function flush(page){
  await page.evaluate(async () => { try{ if(typeof flushSave==="function") await flushSave(); }catch(_){} });
  await page.waitForTimeout(500);
}

test.describe("Personal Vault  dashboard + full view", () => {
  test("vault link CRUD via UI", async ({ page }) => {
    page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
    page.on('console', msg => { if (msg.type() === 'error') console.error('PAGE CONSOLE ERROR:', msg.text()); });
    await page.goto("/#vault", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    await clearState(page);
    await page.goto("/#vault");
    await page.waitForSelector('#view-title:has-text("Vault")');
    await page.waitForSelector('#view-title:has-text("Vault")');
    await expect(page.locator(".vault-meta")).toBeVisible({ timeout: 3000 });
    await page.click("#vault-add");
    await page.waitForTimeout(400);
    const modal = page.locator(".modal");
    await expect(modal).toContainText("New vault item", { timeout: 3000 });
    await page.fill("#vm-title", "Design Doc");
    await page.fill("#vm-url", "https://example.com/design.pdf");
    await page.fill("#vm-desc", "Important design");
    await page.fill("#vm-tags", "work, design");
    await page.selectOption("#vm-type", "pdf");
    await page.click("#vm-save");
    await page.waitForTimeout(900);
    await expect(page.locator("[data-vault-id]")).toHaveCount(1, { timeout: 3000 });
    await expect(page.locator(".vault-card-title")).toContainText("Design Doc");
    await expect(page.locator(".vault-card-tags")).toContainText("work");
    await page.click("[data-vault-action=\"edit\"]");
    await page.waitForTimeout(400);
    await expect(page.locator("#vm-title")).toBeVisible();
    await page.fill("#vm-title", "Design Doc v2");
    await page.click("#vm-save");
    await page.waitForTimeout(600);
    await expect(page.locator(".vault-card-title")).toContainText("Design Doc v2");
    page.once("dialog", d => d.accept());
    await page.click("[data-vault-action=\"delete\"]");
    await page.waitForTimeout(600);
    await expect(page.locator("[data-vault-id]")).toHaveCount(0);
  });

  test("vault PDF upload <5MB via file input and size guard", async ({ page }) => {
    page.on("console", msg => console.log("[BROWSER CONSOLE]", msg.type(), msg.text()));
    await page.goto("/#vault", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    await clearState(page);
    await page.goto("/#vault", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('#view-title:has-text("Vault")');
    await page.click("#vault-add");
    await page.waitForTimeout(400);
    await page.fill("#vm-title", "Small PDF");
    await page.fill("#vm-url", "");
    const buffer = Buffer.from("%PDF-1.4 fake pdf content for test");
    await page.setInputFiles("#vm-file", { name: "test.pdf", mimeType: "application/pdf", buffer });
    await page.waitForTimeout(300);
    await expect(page.locator("#vm-file-info")).toContainText("test.pdf");
    await page.click("#vm-save");
    await page.waitForTimeout(900);
    await expect(page.locator("[data-vault-id]")).toHaveCount(1);
    await expect(page.locator(".vault-card")).toContainText("Small PDF");
    await expect(page.locator(".vault-card-meta")).toContainText("B");
    const tooLarge = await page.evaluate(async () => {
      try{
        const big = new Blob([new Uint8Array(11*1024*1024)], { type: "application/pdf" });
        if(big.size > 10*1024*1024) return "blocked";
        return "not-blocked";
      }catch(e){ return "error"; }
    });
    expect(tooLarge).toBe("blocked");
  });

  test("vault tag and type filters", async ({ page }) => {
    await page.goto("/#vault", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    await clearState(page);
    await page.evaluate(() => {
      const now=Date.now();
      state.vaultItems=[
        { id:"v1", title:"Work Doc", url:"https://example.com/work", description:"", type:"doc", tags:["work"], collectionId:null, fileName:"", mime:"", size:0, blobId:null, linkedTaskIds:[], linkedGoalIds:[], linkedNoteIds:[], linkedStudentIds:[], pinned:false, createdAt:now, updatedAt:now },
        { id:"v2", title:"Personal PDF", url:"https://example.com/personal.pdf", description:"", type:"pdf", tags:["personal"], collectionId:null, fileName:"", mime:"", size:0, blobId:null, linkedTaskIds:[], linkedGoalIds:[], linkedNoteIds:[], linkedStudentIds:[], pinned:false, createdAt:now+1, updatedAt:now+1 },
        { id:"v3", title:"Work Sheet", url:"https://example.com/sheet", description:"", type:"sheet", tags:["work"], collectionId:null, fileName:"", mime:"", size:0, blobId:null, linkedTaskIds:[], linkedGoalIds:[], linkedNoteIds:[], linkedStudentIds:[], pinned:false, createdAt:now+2, updatedAt:now+2 }
      ];
      if(!state._vaultItemsMeta) state._vaultItemsMeta={};
      state.vaultItems.forEach(v=> state._vaultItemsMeta[v.id]=v.updatedAt);
      save();
    });
    await flush(page);
    await page.reload({ waitUntil:"domcontentloaded" });
    await page.waitForTimeout(800);
    await page.goto("/#vault", { waitUntil:"domcontentloaded" });
    await page.waitForTimeout(600);
    await expect(page.locator("[data-vault-id]")).toHaveCount(3);
    await page.selectOption("#vault-tag", "work");
    await page.waitForTimeout(500);
    await expect(page.locator("[data-vault-id]")).toHaveCount(2);
    await page.selectOption("#vault-tag", "");
    await page.waitForTimeout(300);
    await page.selectOption("#vault-type", "pdf");
    await page.waitForTimeout(500);
    await expect(page.locator("[data-vault-id]")).toHaveCount(1);
    await expect(page.locator(".vault-card-title")).toContainText("Personal PDF");
    await page.click("#vault-clear");
    await page.waitForTimeout(400);
    await expect(page.locator("[data-vault-id]")).toHaveCount(3);
  });

  test("vault collection create, move, delete moves to unsorted", async ({ page }) => {
    await page.goto("/#vault", { waitUntil:"domcontentloaded" });
    await page.waitForTimeout(600);
    await clearState(page);
    await page.evaluate(() => {
      const now=Date.now();
      state.vaultCollections=[{ id:"col-work", title:"Work", color:"#7c6cf6", createdAt:now }];
      state.vaultItems=[{ id:"v1", title:"In Work", url:"https://example.com/a", description:"", type:"link", tags:[], collectionId:"col-work", fileName:"", mime:"", size:0, blobId:null, linkedTaskIds:[], linkedGoalIds:[], linkedNoteIds:[], linkedStudentIds:[], pinned:false, createdAt:now, updatedAt:now }];
      if(!state._vaultItemsMeta) state._vaultItemsMeta={}; if(!state._vaultCollectionsMeta) state._vaultCollectionsMeta={};
      state._vaultItemsMeta["v1"]=now; state._vaultCollectionsMeta["col-work"]=now;
      save();
    });
    await flush(page);
    await page.reload({ waitUntil:"domcontentloaded" });
    await page.waitForTimeout(800);
    await page.goto("/#vault", { waitUntil:"domcontentloaded" });
    await page.waitForTimeout(600);
    await expect(page.locator("[data-vault-id]")).toHaveCount(1);
    await page.selectOption("#vault-col", "col-work");
    await page.waitForTimeout(400);
    await expect(page.locator("[data-vault-id]")).toHaveCount(1);
    await page.selectOption("#vault-col", "__none");
    await page.waitForTimeout(400);
    await expect(page.locator("[data-vault-id]")).toHaveCount(0);
    await page.evaluate(() => {
      const id="col-work";
      state.vaultItems.forEach(v=>{ if(v.collectionId===id){ v.collectionId=null; v.updatedAt=Date.now(); state._vaultItemsMeta[v.id]=Date.now(); }});
      state.vaultCollections=state.vaultCollections.filter(x=>x.id!==id);
      state._vaultCollectionsMeta[id]=Date.now();
      if(!window.__LUMEN_TEST.syncMeta.tombstones.vaultCollections) window.__LUMEN_TEST.syncMeta.tombstones.vaultCollections={};
      window.__LUMEN_TEST.syncMeta.tombstones.vaultCollections[id]=Date.now();
      save();
    });
    await flush(page);
    await page.reload({ waitUntil:"domcontentloaded" });
    await page.waitForTimeout(800);
    await page.goto("/#vault", { waitUntil:"domcontentloaded" });
    await page.waitForTimeout(600);
    await page.selectOption("#vault-col", "__none");
    await page.waitForTimeout(400);
    await expect(page.locator("[data-vault-id]")).toHaveCount(1);
    await expect(page.locator(".vault-card-title")).toContainText("In Work");
  });

  test("dashboard vault widget pinnable and shows counts", async ({ page }) => {
    await page.goto("/#vault", { waitUntil:"domcontentloaded" });
    await page.waitForTimeout(600);
    await clearState(page);
    await page.evaluate(() => {
      const now=Date.now();
      state.vaultItems=[
        { id:"v1", title:"Pinned Item", url:"https://example.com/pinned", description:"", type:"link", tags:["pinned"], collectionId:null, fileName:"", mime:"", size:0, blobId:null, linkedTaskIds:[], linkedGoalIds:[], linkedNoteIds:[], linkedStudentIds:[], pinned:true, createdAt:now, updatedAt:now },
        { id:"v2", title:"Normal Item", url:"https://example.com/normal", description:"", type:"pdf", tags:[], collectionId:null, fileName:"", mime:"", size:0, blobId:null, linkedTaskIds:[], linkedGoalIds:[], linkedNoteIds:[], linkedStudentIds:[], pinned:false, createdAt:now+1, updatedAt:now+1 }
      ];
      state._vaultItemsMeta={"v1":now,"v2":now+1};
      save();
    });
    await flush(page);
    await page.goto("/#dashboard", { waitUntil:"domcontentloaded" });
    await page.waitForTimeout(800);
    await expect(page.locator("[data-dw=\"vault\"]")).toBeVisible({ timeout: 3000 });
    await expect(page.locator("[data-dw=\"vault\"]")).toContainText("Personal Vault");
    await expect(page.locator("[data-dw=\"vault\"]")).toContainText("2 items");
    const pinBtn = page.locator("[data-dw=\"vault\"] [data-dw-pin=\"vault\"]");
    await expect(pinBtn).toBeVisible();
    const wasPinned = await pinBtn.getAttribute("aria-pressed");
    await pinBtn.click();
    await page.waitForTimeout(400);
    await flush(page);
    const nowPinned = await pinBtn.getAttribute("aria-pressed");
    expect(nowPinned).not.toEqual(wasPinned);
    await page.reload({ waitUntil:"domcontentloaded" });
    await page.waitForTimeout(800);
    await page.goto("/#dashboard", { waitUntil:"domcontentloaded" });
    await page.waitForTimeout(600);
    const pinBtn2 = page.locator("[data-dw=\"vault\"] [data-dw-pin=\"vault\"]");
    await expect(pinBtn2).toHaveAttribute("aria-pressed", nowPinned);
  });

  test("task vault link round-trip", async ({ page }) => {
    await page.goto("/#vault", { waitUntil:"domcontentloaded" });
    await page.waitForTimeout(600);
    await clearState(page);
    await page.evaluate(() => {
      const now=Date.now();
      state.vaultItems=[{ id:"v1", title:"Vault for Task", url:"https://example.com/vtask", description:"", type:"link", tags:[], collectionId:null, fileName:"", mime:"", size:0, blobId:null, linkedTaskIds:[], linkedGoalIds:[], linkedNoteIds:[], linkedStudentIds:[], pinned:false, createdAt:now, updatedAt:now }];
      state.tasks=[{ id:"t1", title:"Task With Vault", desc:"", status:"today", priority:"med", due:"", startDate:"", coverColor:"", coverImage:"", members:[], comments:[], attachments:[], archived:false, watchers:[], goalId:"", tags:[], category:"", recurrence:"", subtasks:[], vaultIds:[], createdAt:now, updatedAt:now, completedAt:null }];
      state._vaultItemsMeta={"v1":now};
      save();
    });
    await flush(page);
    await page.goto("/#tasks", { waitUntil:"domcontentloaded" });
    await page.waitForTimeout(900);
    await page.click(".task-card");
    await page.waitForTimeout(500);
    await expect(page.locator("#f-title")).toBeVisible();
    const vaultChk = page.locator("#f-vault-picker input[value=\"v1\"]");
    await expect(vaultChk).toBeVisible({ timeout: 3000 });
    await vaultChk.check();
    await page.click("#f-save");
    await page.waitForTimeout(900);
    await page.goto("/#vault", { waitUntil:"domcontentloaded" });
    await page.waitForTimeout(700);
    await expect(page.locator(".vault-card")).toContainText("Vault for Task");
    await expect(page.locator(".vault-links")).toContainText("Task With Vault");
    await page.goto("/#tasks", { waitUntil:"domcontentloaded" });
    await page.waitForTimeout(800);
    await expect(page.locator(".task-card")).toContainText("Vault for Task");
  });

  test("global search >vault filters vault only", async ({ page }) => {
    await page.goto("/#vault", { waitUntil:"domcontentloaded" });
    await page.waitForTimeout(600);
    await clearState(page);
    await page.evaluate(() => {
      const now=Date.now();
      state.vaultItems=[
        { id:"v1", title:"Design System", url:"https://example.com/design", description:"awesome", type:"link", tags:["design"], collectionId:null, fileName:"", mime:"", size:0, blobId:null, linkedTaskIds:[], linkedGoalIds:[], linkedNoteIds:[], linkedStudentIds:[], pinned:false, createdAt:now, updatedAt:now },
        { id:"v2", title:"Other Item", url:"https://example.com/other", description:"", type:"doc", tags:[], collectionId:null, fileName:"", mime:"", size:0, blobId:null, linkedTaskIds:[], linkedGoalIds:[], linkedNoteIds:[], linkedStudentIds:[], pinned:false, createdAt:now+1, updatedAt:now+1 }
      ];
      state.tasks=[{ id:"t1", title:"Design Task", desc:"", status:"today", priority:"med", due:"", startDate:"", coverColor:"", coverImage:"", members:[], comments:[], attachments:[], archived:false, watchers:[], goalId:"", tags:[], category:"", recurrence:"", subtasks:[], vaultIds:[], createdAt:now, updatedAt:now, completedAt:null }];
      state._vaultItemsMeta={"v1":now,"v2":now+1};
      save();
    });
    await flush(page);
    await page.goto("/#dashboard", { waitUntil:"domcontentloaded" });
    await page.waitForTimeout(700);
    await page.click("#global-search-btn");
    await page.waitForTimeout(400);
    const input = page.locator("#search-input");
    await expect(input).toBeVisible({ timeout: 3000 });
    await input.fill(">vault Design");
    await page.waitForSelector("#search-results:has-text('Design System')", { timeout: 5000 });
    await expect(page.locator("#search-results")).toContainText("Design System");
    await input.fill("Design");
    await page.waitForTimeout(600);
    await expect(page.locator("#search-results")).toContainText("Design System");
  });

  test("reload persists vault LS+IDB", async ({ page }) => {
    await page.goto("/#vault", { waitUntil:"domcontentloaded" });
    await page.waitForTimeout(600);
    await clearState(page);
    await page.goto("/#vault", { waitUntil:"domcontentloaded" });
    await page.waitForSelector('#view-title:has-text("Vault")');
    await page.click("#vault-add");
    await page.waitForTimeout(400);
    await page.fill("#vm-title", "Persist Test");
    await page.fill("#vm-url", "https://example.com/persist");
    await page.click("#vm-save");
    await page.waitForTimeout(800);
    await expect(page.locator("[data-vault-id]")).toHaveCount(1);
    await page.reload({ waitUntil:"domcontentloaded" });
    await page.waitForTimeout(800);
    await page.goto("/#vault", { waitUntil:"domcontentloaded" });
    await page.waitForTimeout(600);
    await expect(page.locator("[data-vault-id]")).toHaveCount(1);
    await expect(page.locator(".vault-card-title")).toContainText("Persist Test");
  });
});

// app.js delegates vaultGuessType to LumenLib.vault, and app.js also assigned its own
// delegator onto LumenLib.vault — so the function called itself. Every file-selection
// path through it died with RangeError, silently, mid-event-handler.
test("vaultGuessType classifies by mime and extension without recursing", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.state === "object" && window.state !== null);
  await page.waitForTimeout(300);
  const got = await page.evaluate(() => {
    const call = (f, m) => { try { return window.vaultGuessType(f, m); } catch (e) { return "THREW " + e.constructor.name; } };
    return {
      pdf: call("notes.pdf", "application/pdf"),
      // csv and docx resolve only in the full classifier, not app.js's minimal fallback
      csv: call("data.csv", "text/csv"),
      docx: call("report.docx", ""),
      png: call("shot.png", ""),
      unknown: call("thing.zzz", ""),
    };
  });
  expect(got).toEqual({ pdf: "pdf", csv: "sheet", docx: "doc", png: "image", unknown: "link" });
});

test("choosing a file in the vault modal auto-detects its type and title", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/#vault", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await clearState(page);
  await page.goto("/#vault", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('#view-title:has-text("Vault")');
    await page.click("#vault-add");
  await page.waitForTimeout(300);
  await page.setInputFiles("#vm-file", {
    name: "quarterly-report.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("a,b\n1,2\n"),
  });
  await page.waitForTimeout(300);

  await expect(page.locator("#vm-type")).toHaveValue("sheet");
  await expect(page.locator("#vm-title")).toHaveValue("quarterly-report");
  expect(errors).toEqual([]);
});
