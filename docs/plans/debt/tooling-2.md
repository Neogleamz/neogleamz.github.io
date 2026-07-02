# Implementation Plan — Delete Orphaned `addManualSale()` Dead Code

**Branch slug:** `debt/tooling-2` (ledger source item: `debt/dead-code`, [tools/SK8Lytz_Bucket_List.md:41](../../../tools/SK8Lytz_Bucket_List.md))
**Task type:** `chore` (pure dead-code removal, no new behavior, no UI change)
**Scope:** `assets/js/sales-module.js` and `index.html` ONLY. No other files touched. Boy Scout rule does not apply — this is a deletion task, not a `feat/*`/`refactor/*` branch, and the task itself already defines the full extent of debt being addressed (both ledger sub-items reference the same touch points).

## 1. Summary

`addManualSale()` in `assets/js/sales-module.js` is a fully orphaned feature remnant. Confirmed via repo-wide grep (see §5):
- **Zero callers**: no `data-click` token, no direct call, no `window.addManualSale` reference anywhere in the repo.
- **Zero live DOM anchors**: all 13 `manualSale*` element IDs it reads (`manualSaleId`, `manualSaleDate`, `manualSaleRecipe`, `manualSaleQty`, `manualSalePrice`, `manualSaleSubtot`, `manualSaleShip`, `manualSaleTax`, `manualSaleDiscCode`, `manualSaleDisc`, `manualSaleTotal`, `manualSaleSource`, `manualSaleBalance`) do not exist anywhere in the live DOM.
- **Zero test coverage**: `tests/unified-parity.test.js` requires `sales-module.js` three times but only to exercise `scanOrphanStorefrontSKUs`, `resolveOrphanSKUMapping`, and one other unrelated method — never `addManualSale`.

The companion line at `index.html:6349` populates the (nonexistent) `#manualSaleRecipe` dropdown inside the live `populateDropdowns()` function. It silently no-ops today via its own `if(manualDrop)` guard and has no effect on any real UI.

**Decision already made** (per task instructions): the ledger item offered two options — delete, or rebuild/re-wire a Manual Sale entry form in REVENUEZ. **The decision is DELETE.** REVENUEZ's live sales-entry flow is handled elsewhere (CSV sync via `processSalesCSV()`/`processParsedSales()` and the Shopify webhook → `sales_ledger` ingest path). This plan does **not** rebuild or re-wire any Manual Sale form — that is explicitly out of scope.

## 2. Exact Diff — `assets/js/sales-module.js`

Confirmed by direct `Read` of the live file (lines 1–130).

**Structural context (verified):**
- Line 50: `// --- 9. SALES SYNC ENGINE ---` — this is the **only** numbered section header in the file (confirmed via `grep -n "^// --- \d+\."` — single match at line 50). It is the section header for the entire rest of the live Sales Sync Engine, not just for `addManualSale()`: `syncTrace()` (line 118), `processSalesCSV()` (line 131), and `processParsedSales()` (referenced downstream) all live under this same header. **This header comment must be KEPT** — it documents live code, not dead code.
- Lines 51–116: the complete `async function addManualSale() { ... }` block (66 lines, opening `async function addManualSale() {` through its matching closing `}`). This is the entire deletion target.
- Line 117: a blank separator line, already present between `addManualSale()`'s closing brace and `syncTrace()`.
- Line 118: `function syncTrace(msg, isErr=false) {` — live code, untouched.

**Deletion boundary: delete lines 51–116 inclusive. Do not touch line 50 (header, keep) or line 117 (blank separator, keep).**

Post-deletion result (verified this produces no orphaned blank lines or broken comment structure):
```js
// --- 9. SALES SYNC ENGINE ---

function syncTrace(msg, isErr=false) {
    ...
```
This is exactly one header line, one blank line, then the next live function — consistent with spacing conventions used elsewhere in this file (e.g. the blank line at line 41 before the `// --- MASTER FORENSIC ACCOUNTING ENGINE ---` header at line 42).

**Do NOT delete or alter:**
- Line 50 header comment (still describes live code below it)
- Lines 118+ (`syncTrace`, `processSalesCSV`, `processParsedSales`, and everything after — all live, all untouched)
- Lines 1–49 (JSDoc typedef, `hashPII()`, forensic-engine comment block — all live, all untouched)

## 3. Exact Diff — `index.html`

Confirmed by direct `Read` of the live file (lines 6290–6394). The target line sits inside the live `populateDropdowns()` function (opens line 6298, closes line 6354), which is called from multiple places including `bom-module.js` — that function as a whole is NOT touched beyond the removal described below.

**Structural context (verified):**
```
6344:  (blank)
6345:  // Aliases can link to anything — grouped like RECIPEZ
6346:  const aliasDrop = document.getElementById('aliasRecipeSelect'); if(aliasDrop) aliasDrop.innerHTML = window.safeHTML(...);
6347:  (blank)
6348:  // Manual sale — no sub-assemblies; retail first, then 3D prints
6349:  const manualDrop = document.getElementById('manualSaleRecipe'); if(manualDrop) manualDrop.innerHTML = window.safeHTML('<option value="">-- Select Product Sold --</option>' + ...);
6350:  (blank)
6351:  // Packerz Blueprint Admin Population
6352:  if(typeof initPackerzAdmin === 'function') initPackerzAdmin();
6353:  } catch(e) {}
6354:  }
```

Line 6349 is a fully self-contained statement pair (`const manualDrop = ...; if(manualDrop) manualDrop.innerHTML = ...;`). It does not return a value consumed elsewhere, has no trailing comma, no chained `.then()`/method continuation onto the next line, and nothing above or below it depends on it syntactically. Safe to remove without breaking the surrounding `try { ... } catch(e) {}` block.

**Decision on exact deletion boundary:** the codebase's established pattern in this function is `comment → code → blank` repeated per dropdown target (see lines 6345–6347, 6351–6353 pattern). Comment 6348 exists *solely* to label line 6349 — it has no other referent. Deleting only line 6349 and leaving line 6348 in place would leave a dangling, misleading comment (a comment describing code that no longer exists directly beneath it), which violates the same "no orphaned artifacts" standard applied to the sales-module.js side. Deleting lines 6348–6349 but leaving blank line 6350 would introduce a double-blank-line artifact (line 6347 blank + line 6350 blank landing adjacent to each other).

**Deletion boundary: delete lines 6348–6350 inclusive** (the label comment, the dead code line, and its trailing blank separator — 3 lines total).

Post-deletion result:
```
6344:  (blank)
6345:  // Aliases can link to anything — grouped like RECIPEZ
6346:  const aliasDrop = document.getElementById('aliasRecipeSelect'); if(aliasDrop) aliasDrop.innerHTML = window.safeHTML(...);
6347:  (blank)
6348(was 6351):  // Packerz Blueprint Admin Population
6349(was 6352):  if(typeof initPackerzAdmin === 'function') initPackerzAdmin();
6350(was 6353):  } catch(e) {}
6351(was 6354):  }
```
Exactly one blank line separates the `aliasDrop` block from the `Packerz` block — matching the file's existing spacing convention, no double-blanks, no dangling comments.

> **Note if a stricter literal reading is preferred:** the task description states "remove ONLY the manualDrop line at 6349." If the reviewer wants the minimal literal diff instead of the clean-up described above, the fallback is: delete line 6349 only, leave lines 6348 and 6350 in place. This still satisfies "syntactically valid" but leaves an orphaned comment. **Recommendation: use the 3-line (6348–6350) deletion above** — it is still a single, tightly-scoped touch point (the label + its subject + its spacer), not scope creep into unrelated code.

**Do NOT touch:** anything else in `populateDropdowns()` (lines 6298–6347, 6351–6354 in current numbering) — `partSelector`, `batchProductSelect`, `newWOProduct*`, `multiBatchProduct*`, `aliasRecipeSelect`, and `initPackerzAdmin()` calls all remain exactly as-is.

## 4. Out-of-Scope Observation (do not action in this task)

Lines 6356–6362 of `index.html` (immediately after `populateDropdowns()` closes, right before `</script>`) contain an orphaned table-of-contents-style comment block:
```js
// --- 6. BULK MODAL ---
// --- 8. INVENTORY MANAGERS & REORDER LOGIC ---
// --- 9. SALES SYNC ENGINE ---
// --- 10. PROFITABILITY DASHBOARD ---
// --- 11. PRODUCTION MANAGER, ROUTING ENGINE, MEDIA, EXPORTS ---
// --- 12. PARSERS & FILE SYNC ---
// --- 13. NEW BACKUP & RESTORE SYSTEM ---
```
These numbered headers do not correspond to any code that follows them in `index.html` (the `<script>` block closes immediately after) — they appear to be a leftover index from before this logic was split out into `assets/js/*-module.js` files. This is a **separate, pre-existing** dead-code artifact, not part of the `addManualSale()`/`manualSaleRecipe` touch point named in this task's ledger item. **Flagging only — not deleting.** If desired, this should become its own `debt/dead-code` ledger line for a future task, not bundled into this one.

## 5. Security Considerations

- **No new attack surface.** This task only deletes code; it adds nothing. There is no new `innerHTML`/`insertAdjacentHTML` call, no new DOM write, no new Supabase query.
- **`window.safeHTML` orphan check:** the deleted `index.html` line was one of many `window.safeHTML(...)` call sites inside `populateDropdowns()` (others remain at lines 6323, 6333, 6335, 6336, 6337, 6339, 6340, 6341, 6346 in current numbering). Removing this one call site does not orphan `window.safeHTML` itself — it is defined in `assets/js/neogleamz-engine.js` and used extensively across `index.html` and other modules. No dangling reference, no broken guard.
- **No forbidden pattern introduced or left behind.** The deleted code in `sales-module.js` used direct `window.safeHTML`-free raw DOM reads (`.value`, `.value.trim()`) — never a ternary `window.safeHTML ? ... : ...` pattern — so there is no FORBIDDEN_TERNARY to worry about removing "cleanly"; it's a straight deletion.
- **RLS implications: none new.** The deleted function performed writes to `sales_ledger` (insert) and `inventory_consumption` (upsert) — both tables continue to exist and continue to be written by other, live code paths (CSV sync via `processParsedSales()`, and the Shopify webhook edge function). This task removes one additional (dead, never-invoked) write path to those tables; it does not change RLS policy, table structure, or any live write path. No RLS policy touched.
- **Print-window DOMPurify:** not applicable — no print-window code exists in the deleted block.

## 6. Vanilla JS Constraints

Not applicable in the sense of "constraints to apply" — no new code is being written. Confirmed the deletion does not leave behind any `var`, framework import, or non-native-DOM call anywhere in the surrounding kept code (both retained regions already conform: `sales-module.js` uses `let`/`const`/`async function`; `index.html`'s `populateDropdowns()` uses `let`/`const`).

## 7. 4-State UX / UI Mutex / Zero-Refresh

**Not applicable.** `addManualSale()` was never wired to any button (no `data-click` token, no `window.executeWithButtonAction` wrapper existed for it in the first place), and it renders no UI component. There is no Loading/Error/Empty/Success state to preserve, no UI mutex to remove, and no render function to re-invoke — deleting this code changes zero observable behavior because it was already 100% unreachable (its own internal calls to `renderSalesTable()`, `renderInventoryTable()`, and `renderAnalyticsDashboard()` on success were themselves dead code, never executed since nothing ever invoked `addManualSale()`).

## 8. Schema Changes

**None.** `sales_ledger` and `inventory_consumption` tables are untouched — they continue to exist with their current schema and RLS policies, and continue to be written by other live code paths. Only this dead function's (never-executed) calls to `supabaseClient.from('sales_ledger').insert(...)` and `supabaseClient.from('inventory_consumption').upsert(...)` are removed along with the rest of the function body. **No update to the `## Database Schemas` section of [tools/SK8Lytz_App_Master_Reference.md](../../../tools/SK8Lytz_App_Master_Reference.md) is required** (confirmed via grep: the Master Reference contains zero mentions of `addManualSale` or `manualSale` — there is nothing to update or remove there).

## 9. Topological Integrity (Mermaid Blueprint)

**No update required.** CLAUDE.md's topological-integrity rule triggers on creating/deleting/moving a **button, modal, or UI element**. `addManualSale()` was never wired to any button/modal (confirmed zero `data-click` token), and the deleted `index.html` line only populated a `<select>` that does not exist in the DOM. No live UI element is created, deleted, or moved by this change — the Mermaid Architectural Blueprint in the Master Reference needs no edit.

## 10. Verification Steps

1. **Pre-edit confirmation (already done for this plan, re-run post-edit to confirm):**
   ```
   grep -rn "addManualSale" .
   grep -rn "manualSaleRecipe" .
   grep -rn "manualSaleId\|manualSaleQty\|manualSalePrice\|manualSaleSubtot\|manualSaleShip\|manualSaleTax\|manualSaleDiscCode\|manualSaleDisc\|manualSaleTotal\|manualSaleSource\|manualSaleBalance" .
   ```
   Expected post-edit output: **zero matches in any source file** (`assets/js/*`, `index.html`). The only pre-edit matches were the function/line definitions themselves (now deleted) and the ledger description text in `tools/SK8Lytz_Bucket_List.md:41` (which is expected to remain until the ledger task is marked `[x]` per the CLAUDE.md ledger-exemption rule — do not edit the ledger as part of this micro-commit).
2. **Syntax validity:**
   - `node -c assets/js/sales-module.js` (or equivalent — Node's `--check` flag) to confirm the file still parses after the 66-line deletion.
   - Open `index.html` in a browser (or run any existing HTML/JS lint) to confirm `populateDropdowns()` still parses — specifically confirm the `try { ... } catch(e) {}` block braces still balance after removing lines 6348–6350.
3. **Test suite:**
   ```
   npm test
   ```
   Expected: no new failures. `tests/unified-parity.test.js` (the only test file that `require()`s `sales-module.js`) should pass unchanged, since it never references `addManualSale` or any `manualSale*` identifier (confirmed via grep — zero matches in `tests/`).
4. **Lint:**
   ```
   npx eslint .
   ```
   Expected: no new errors. The deleted block carried no unique eslint-disable comments (the file-level `/* eslint-disable no-undef, no-unused-vars */` at line 1 of `sales-module.js` is untouched and still applies to remaining code).
5. **XSS audit (no functional change expected, but re-run per CLAUDE.md mandate since a `window.safeHTML(...)` call site was removed):**
   ```
   node scripts/xss-audit.js
   ```
   Expected: still 0 violations (removing a compliant call site cannot introduce a violation).
6. **Manual smoke check (per CLAUDE.md UI testing guide requirement — see below).**
7. **`git diff` review:** confirm the diff touches exactly two files (`assets/js/sales-module.js`, `index.html`), exactly the line ranges described in §2 and §3, and nothing else (no accidental whitespace changes elsewhere in either file).

## 11. Files Touched

- `assets/js/sales-module.js` — delete lines 51–116 (the full `addManualSale()` function body). Keep line 50 (`// --- 9. SALES SYNC ENGINE ---` header, still describes live code below) and line 117 (blank separator).
- `index.html` — delete lines 6348–6350 (the `// Manual sale — no sub-assemblies...` comment, the `manualDrop` dead-DOM-populator line, and its trailing blank separator) from inside the live `populateDropdowns()` function. No other line in `populateDropdowns()` (lines 6298–6354) is touched.

No other files are touched by this task. No schema/RLS files. No Master Reference edit. No ledger edit (deferred to `/wind-down` or task-completion step per CLAUDE.md ledger-exemption rule).

## 12. Testing Guide (for post-implementation verification)

Per CLAUDE.md's UI-testing-guide mandate — since this is dead-code removal with **zero observable UI change**, the testing guide is a **negative/regression check**, confirming nothing broke rather than confirming new behavior:

### Manual Testing Guide — Delete orphaned `addManualSale()`

**Browser:** Chrome 120+
**Environment:** local (`http://127.0.0.1:5500`) or live (`https://neogleamz.github.io`)
**Prerequisites:** logged-in session with access to REVENUEZ hub tab

#### Regression Checks (confirm nothing broke — no "happy path" exists since the feature was already dead)
1. Navigate to **REVENUEZ** hub tab. Confirm the tab loads with no new console errors (open DevTools console before navigating).
2. Within REVENUEZ, exercise the **CSV Sales Sync** flow (the live sales-entry mechanism this task did NOT touch): select a test CSV, confirm `processSalesCSV()`/`syncTrace()` terminal output still streams normally and the sync still completes.
3. Navigate to **MAKERZ** (or wherever `populateDropdowns()` is also invoked, e.g. via `bom-module.js`) and confirm all *other* dropdowns populated by `populateDropdowns()` still render correctly: Part Selector, Batch Product Select, New Work Order (Retail/Sub/Print), Multi-Batch (Retail/Sub/Print), Alias Recipe Select, and the Packerz Admin dropdown. All should populate exactly as before — this function is called from multiple places (including `bom-module.js`), so confirm from at least two entry points if practical.
4. Confirm no console error references `addManualSale`, `manualSaleRecipe`, or any `manualSale*` ID (there should be none, because nothing ever called them).

#### Database Verification
- None required — no DB write path is live-affected. `sales_ledger` and `inventory_consumption` tables are unchanged in schema and in every *other* code path that writes to them (CSV sync, Shopify webhook).
