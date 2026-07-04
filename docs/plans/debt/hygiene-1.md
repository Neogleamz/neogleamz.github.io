# Implementation Plan — Delete 7 Orphaned Fossil Section-Header Comments (`index.html`)

**Branch slug:** `debt/hygiene-1`
**Task type:** `chore` (comment-only dead-artifact removal — zero runtime behavior change)
**Scope:** `index.html` ONLY, lines 6353–6359 (verified at plan-authoring time — see drift warning in §2). No other file is edited by this task.
**Bucket List source:** `tools/SK8Lytz_Bucket_List.md` §🧹 Technical Debt → **Epic: Hygiene Micro-Batch** → 🟡 Low — Hygiene → `debt/hygiene` (line 38):
> "`index.html:6353–6359` — seven orphaned section-header comments (`// --- 6. BULK MODAL ---` through `// --- 13. NEW BACKUP & RESTORE SYSTEM ---`) sit at the tail of the inline `<script>` with no code beneath them — fossils from when those sections were extracted into `assets/js/*` modules. Delete the seven comment lines. [Files: index.html]"

**Out of scope:** the same Hygiene Micro-Batch epic has a second, unrelated `debt/hygiene` ledger line (pruning `.claude/settings.json`'s stale permission allowlist entries). That is a different file and a different task (presumably `debt/hygiene-2`) — do not touch `.claude/settings.json` as part of this plan.

## 1. Summary

`index.html`'s inline `<script>` block contains a numbered table-of-contents-style comment convention (`// --- N. SECTION NAME ---`). Confirmed live via `Read`/`Grep`: numbers **1–3** are still active section headers with real code underneath them inside `index.html` itself (line 4332 `// --- 1. GLOBAL VARIABLES & SUPABASE ---`, line 4408 `// --- 2. THEME & SAFETY NET ---`, line 4486 `// --- 3. PREFS & AUTH ENGINES ---`). Numbers **6, 8, 9, 10, 11, 12, 13** appear a second time — as a contiguous 7-line block at lines 6353–6359, immediately after the closing brace of the live `populateDropdowns()` function and immediately before the `</script>` closing tag. This second appearance has **zero code beneath it** (the very next line is `</script>`) — it is a leftover index fossil from when those sections (BULK MODAL, INVENTORY MANAGERS & REORDER LOGIC, SALES SYNC ENGINE, PROFITABILITY DASHBOARD, PRODUCTION MANAGER/ROUTING/MEDIA/EXPORTS, PARSERS & FILE SYNC, NEW BACKUP & RESTORE SYSTEM) were fully extracted into their own `assets/js/*-module.js` files, each of which retained the *identical* header text as a **live, meaningful** section marker over real code that still exists there today (confirmed by direct grep, see table below). Only the orphaned duplicate inside `index.html` is being deleted.

This task was previously flagged and explicitly **not** actioned during an earlier, adjacent cleanup (`debt/tooling-2`, see `docs/plans/debt/tooling-2.md` §4 "Out-of-Scope Observation") specifically so it could become its own ledger item — which it now is.

**Confirmed live duplicates that must NOT be touched:**

| File | Line | Content |
| --- | --- | --- |
| `assets/js/bom-module.js` | 12 | `// --- 6. BULK MODAL ---` |
| `assets/js/inventory-module.js` | 16 | `// --- 8. INVENTORY MANAGERS & REORDER LOGIC ---` |
| `assets/js/sales-module.js` | 50 | `// --- 9. SALES SYNC ENGINE ---` |
| `assets/js/production-module.js` | 17 | `// --- 11. PRODUCTION MANAGER, ROUTING ENGINE, MEDIA, EXPORTS ---` |
| `assets/js/system-tools-module.js` | 9 | `// --- 12. PARSERS & FILE SYNC ---` |
| `assets/js/system-tools-module.js` | 1463 | `// --- 13. NEW BACKUP & RESTORE SYSTEM ---` |

(Note: `// --- 10. PROFITABILITY DASHBOARD ---` has its live counterpart in `assets/js/analytics-module.js:11`, phrased as `// --- PROFITABILITY DASHBOARD MODULE ---` — textually similar but not byte-identical to the fossil at `index.html:6356`, and irrelevant either way since this task never touches any `assets/js/*` file.)

This is a pure subtraction. No new code, no new callers, no behavior change for any user-facing surface, no change to any other section of `index.html`.

## 2. Exact Deletion Boundaries — `index.html`

**⚠️ Line-number drift warning:** the line numbers below (6353–6359) were confirmed correct by a fresh `Read` of `index.html` at plan-authoring time. However, `index.html` is a high-traffic, frequently-edited file (a prior micro-commit already shifted this exact region once, per `debt/tooling-2`'s edit to `populateDropdowns()` immediately above this block). **Do not trust these line numbers blindly at implementation time.** The implementer MUST, immediately before editing:
1. Run `Grep` for the literal pattern `// --- 6\. BULK MODAL ---` inside `index.html` to get the current live line number.
2. `Read` a generous window around that hit (e.g. offset −10/+15) to reconfirm the full 7-line block is still contiguous, in the same order, immediately preceded by the blank line after `populateDropdowns()`'s closing `}`, and immediately followed by `</script>`.
3. Locate and delete the block **by content match against the fresh Read**, not by re-using the line numbers transcribed in this document.

**Confirmed content at plan-authoring time (lines 6350–6360):**
```
6350	        } catch(e) {}
6351	    }
6352	
6353	    // --- 6. BULK MODAL ---
6354		// --- 8. INVENTORY MANAGERS & REORDER LOGIC ---
6355	    // --- 9. SALES SYNC ENGINE ---
6356	    // --- 10. PROFITABILITY DASHBOARD ---
6357	    // --- 11. PRODUCTION MANAGER, ROUTING ENGINE, MEDIA, EXPORTS ---
6358	    // --- 12. PARSERS & FILE SYNC ---
6359	    // --- 13. NEW BACKUP & RESTORE SYSTEM ---
6360	</script>
```

- **Line 6350** (`} catch(e) {}`) — closes a `try/catch` inside `populateDropdowns()`. **Keep, do not touch.**
- **Line 6351** (`}`) — closes the `populateDropdowns()` function itself (opens at line 6298, confirmed via `Grep`). **Keep, do not touch.**
- **Line 6352** — blank separator line. **Keep.** After the deletion, this blank line becomes the sole separator immediately preceding `</script>`.
- **Lines 6353–6359** — the 7 fossil comment lines. **Delete, all 7, nothing more, nothing less.**
  - **Critical whitespace detail:** line 6354 (`// --- 8. INVENTORY MANAGERS & REORDER LOGIC ---`) is indented with a **literal TAB character**, not 4 spaces like its six siblings on lines 6353/6355–6359. This is confirmed via direct `Read`, not a transcription artifact — do not silently "normalize" it when building the edit. The exact bytes (tab vs. space) must come from a fresh `Read` immediately before the edit, not from copy-typing this plan document.
- **Line 6360** (`</script>`) — closes the inline script block. **Keep, do not touch.** This must be the line that immediately follows the blank separator after the deletion.

**Edit mechanics:** use the `Edit` tool with `old_string` = the exact 7-line span captured from a fresh `Read` (line 6353 through line 6359 inclusive, including their trailing newlines and the tab on line 6354) and `new_string` = `''` (empty string). This removes exactly those 7 lines and their line breaks, leaving the blank line (old 6352) immediately adjacent to `</script>` (old 6360) with no double-blank and no missing separator — i.e., byte-for-byte the same spacing convention already described in the ledger entry and confirmed in §2's "Post-deletion result" below.

Each of the 7 target strings was individually confirmed (via repo-wide `Grep`) to appear **exactly once** inside `index.html` — at these exact 7 lines and nowhere else in the file — so the 7-line block is trivially unique and safe for an exact-match `Edit`. If, at implementation time, the `Edit` tool reports a non-unique or failed match, re-`Read` and retry; per CLAUDE.md's Surgical Edits rule, never fall back to a blind full-file `Write`.

**Post-deletion result (expected):**
```
6350	        } catch(e) {}
6351	    }
6352
6353	</script>
6354	    </div>
6355	</div>
```
(Old line 6360 `</script>` becomes new line 6353; everything after it shifts up by 7 lines, unchanged in content.)

**Do not touch:** anything above line 6350 (all of `populateDropdowns()`'s body, lines 6298–6349) or anything from old-line 6360 onward (`</script>`, the closing `</div>` tags, and the entirety of the rest of the file, including the `manualPrintModal` markup that begins at old line 6365).

## 3. Security Considerations

- **Zero DOM/XSS surface.** Confirmed via `Grep` of lines 6353–6359 specifically: no `innerHTML`, `insertAdjacentHTML`, `outerHTML`, `document.write`, or `safeHTML` token appears anywhere in the deleted block. These are seven standalone `//`-prefixed JS comment lines — inert text with no executable content, no string concatenation, no template literals, no variables. Comments carry zero syntactic or runtime weight; the JS engine discards them identically whether they exist or not.
- **No FORBIDDEN_TERNARY risk.** This edit adds, removes, or modifies zero `window.safeHTML(...)` call sites. The banned `window.safeHTML ? window.safeHTML(x) : x` pattern is not present in, adjacent to, or affected by this deletion.
- **No RLS implication.** No Supabase table, column, policy, or query is referenced anywhere in the deleted lines (they are plain-text comments, not code) or in the surrounding kept code (`populateDropdowns()` only reads already-fetched in-memory product arrays and writes to `<select>` elements via existing, unrelated `window.safeHTML(...)` calls at lines 6333/6335–6337/6339–6341/6346 — none of which are touched).
- **No print-window / DOMPurify implication.** No `document.write`, print-window, or `DOMPurify.sanitize(...)` code exists in or near the deleted block.
- **Master Reference cross-check.** `Grep` of `tools/SK8Lytz_App_Master_Reference.md` for all 7 header strings returns zero hits — none of these comments were ever documented there, so there is nothing stale to retract.
- **Risk level: negligible.** Because whole comment lines carry no braces, parentheses, quotes, or template-literal delimiters, their removal cannot unbalance any enclosing syntax. The only realistic failure mode is a *tooling* mistake (deleting the wrong line range), which is why §2 anchors the deletion against the unique, already-verified 7-line content block rather than raw line numbers, and why §7 includes redundant post-edit verification.

## 4. Vanilla JS Constraints

Not applicable in the sense of "new constraints to satisfy" — no new code is written. Confirmed by subtraction: removing 7 `//` comment lines cannot introduce a `var`, a framework dependency, a non-native DOM API, or a non-`navigator.bluetooth` Bluetooth call. The surrounding kept code (`populateDropdowns()`) already uses `const`/`let` exclusively and is untouched by this edit.

## 5. 4-State UX / UI Mutex / Zero-Refresh

**Not applicable — confirmed, not assumed.** The deleted lines sit at the tail of the inline `<script>` block with zero code beneath them (the very next line is `</script>`); they were never attached to any function, render call, or event handler.
- **4-state UX (Loading/Error/Empty/Success):** no data component reads, renders, or depends on this text — there is nothing to instrument.
- **UI mutex (`window.executeWithButtonAction`):** no button, `data-click` token, or DB-mutation path is wired to this location — nothing to wrap.
- **Zero-refresh:** no render function (`renderInventoryTable`, `renderSalesTable`, etc.) needs to be re-invoked after this edit — nothing changes at runtime for any already-loaded page, since the comments were never evaluated as anything other than inert text in the first place.

## 6. Schema Changes / Master Reference / Topological Integrity

- **Schema changes: none.** No Supabase table, column, or RLS policy is created, altered, or referenced. No update to the `## Database Schemas` section of `tools/SK8Lytz_App_Master_Reference.md` is required.
- **Topological integrity (Mermaid Blueprint): no update required.** CLAUDE.md's topological-integrity rule triggers on creating, deleting, or moving a **button, modal, or UI element**. This task creates/deletes/moves none of those — it deletes 7 inert comment lines with no DOM or UI representation whatsoever.
- **CHANGELOG.md: no entry for this task.** Per established project convention (confirmed by sibling debt-batch plans `docs/plans/debt/tooling-2.md` and `docs/plans/debt/tooling-3.md`, neither of which touched `CHANGELOG.md`), changelog entries are aggregated at `/release` time, not per micro-task.
- **Ledger: not edited by this task.** Per CLAUDE.md's Ledger Exemption rule, `tools/SK8Lytz_Bucket_List.md` is not touched as part of this micro-commit; the `[ ]` → `[🚀]` transition and epic-archival happen later via `/bucketlist`/`/wind-down`.

## 7. Verification Steps

1. **Fresh re-Read immediately before editing** (see §2) — confirm the 7-line block by content match, not by trusting this document's line numbers.
2. **Post-edit grep — confirm the fossils are gone from `index.html` only:**
   ```
   grep -n "BULK MODAL\|INVENTORY MANAGERS & REORDER LOGIC\|SALES SYNC ENGINE\|PROFITABILITY DASHBOARD\|PRODUCTION MANAGER, ROUTING ENGINE, MEDIA, EXPORTS\|PARSERS & FILE SYNC\|NEW BACKUP & RESTORE SYSTEM" index.html
   ```
   Expected: **zero matches.**
3. **Confirm the live duplicates in the module files are untouched (byte-identical, same line numbers):**
   ```
   grep -n "BULK MODAL" assets/js/bom-module.js
   grep -n "INVENTORY MANAGERS & REORDER LOGIC" assets/js/inventory-module.js
   grep -n "SALES SYNC ENGINE" assets/js/sales-module.js
   grep -n "PRODUCTION MANAGER, ROUTING ENGINE, MEDIA, EXPORTS" assets/js/production-module.js
   grep -n "PARSERS & FILE SYNC" assets/js/system-tools-module.js
   grep -n "NEW BACKUP & RESTORE SYSTEM" assets/js/system-tools-module.js
   ```
   Expected: **all six still present at their original line numbers** (`bom-module.js:12`, `inventory-module.js:16`, `sales-module.js:50`, `production-module.js:17`, `system-tools-module.js:9` and `:1463`) — none of these files are part of this task's diff.
4. **Structural sanity — `</script>` still intact and immediately follows the blank separator:**
   ```
   grep -n "</script>" index.html
   ```
   Confirm exactly one hit at the expected (now-shifted-up-by-7) line, and `Read` the ~5 lines above it to visually confirm: `}` (populateDropdowns close) → blank line → `</script>`, with no leftover blank-line duplication or missing line.
5. **Syntax sanity ("node -c equivalent" for an embedded `<script>` block — no test in this repo parses `index.html` directly, see note below, so this throwaway check fills that gap):** write a one-off script to `scratch/` (gitignored, per CLAUDE.md's Verification Mandate — do not commit it) that extracts the `<script>...</script>` content from `index.html` and feeds it to Node's `vm.Script` to confirm no `SyntaxError` is thrown, mirroring the existing pattern already used in this repo at `scripts/check_syntax.js` (which does the same thing for `qa-dashboard.html`):
   ```js
   // scratch/check-index-syntax.js (throwaway — do not commit)
   const fs = require('fs');
   const content = fs.readFileSync('index.html', 'utf8');
   const script = content.match(/<script>([\s\S]*?)<\/script>/)[1];
   const vm = require('vm');
   try {
       new vm.Script(script);
       console.log('Syntax OK');
   } catch (e) {
       console.error('Syntax Error:', e);
       process.exit(1);
   }
   ```
   Expected: `Syntax OK`. (This is near-certain regardless, since deleting whole comment lines cannot unbalance braces/parens/quotes/template literals — this step is a belt-and-suspenders confirmation, not a real risk mitigation.)
6. **Manual browser smoke test** (the most direct real-world check, since no automated harness loads `index.html`'s inline script — see note below): open the app locally, open DevTools console before load, confirm zero new console errors on boot, and confirm `populateDropdowns()` still populates every dropdown it touches (see §9 Testing Guide).
7. **Test suite:**
   ```
   npm test
   ```
   Expected: identical pass/fail counts to the pre-edit baseline. **Note (verified, not assumed):** no Jest test in `tests/` actually loads or executes `index.html`'s inline `<script>` content — `tests/comment-sync.test.js` (despite its name) tests Task Engine WIP-checklist comment logging, unrelated to these header comments; `tests/unified-parity.test.js` and `tests/ui-button-states.test.js` each contain a single descriptive *comment* mentioning "index.html" but reimplement the relevant logic inline rather than `require()`/`readFileSync`-ing the file. `npm test` therefore provides no direct syntax coverage of this diff — step 5 (vm.Script) and step 6 (manual load) are the real safety nets here.
8. **Lint:**
   ```
   npx eslint .
   ```
   Expected: no new warnings/errors. **Note (verified, not assumed):** `eslint.config.mjs` has no `files: ["**/*.html"]` override and loads no HTML plugin, so ESLint's default file-extension matching does not lint `index.html` at all — this command is a baseline sanity check on the (untouched) `assets/js/*` files, not a direct verification of this specific diff.
9. **XSS audit (re-run per CLAUDE.md's "any code review" mandate):**
   ```
   node scripts/xss-audit.js
   ```
   Expected: identical violation count before/after (0 → 0). Deleting 7 comment lines with zero DOM-write sinks cannot introduce or remove a violation.
10. **`git diff index.html`** — confirm the diff is exactly a 7-line removal (old lines 6353–6359), with no other line in the file touched.
11. **Pre-commit hook side effect (expected, not a manual step):** this repo's `.githooks/pre-commit` runs an automatic version bump (`npm run version:bump`) and re-stages `assets/js/system-version.js` + `index.html` on every commit that includes `index.html`. Do not be alarmed if `git status`/`git show` shows `assets/js/system-version.js` also changed after committing — that is the hook's existing, unrelated behavior, not a manual edit made by this task (see §8).

## 8. Files Touched

- **`index.html`** — delete lines 6353–6359 (the 7 orphaned fossil section-header comments). No other line in this file changes. (Re-locate the exact range by content match at implementation time per §2's drift warning.)
- **`assets/js/system-version.js`** — touched automatically by the repo's existing pre-commit hook version-bump step on every commit; **not a manual edit performed by this task.**

**Explicitly NOT touched (verify in final diff review):**
- `assets/js/bom-module.js`, `assets/js/inventory-module.js`, `assets/js/sales-module.js`, `assets/js/production-module.js`, `assets/js/system-tools-module.js`, `assets/js/analytics-module.js` — all contain live, meaningful, active section-header comments describing real code beneath them and must remain byte-identical.
- `tools/SK8Lytz_App_Master_Reference.md` — no schema, nomenclature, or Mermaid Blueprint entry references this comment text; no update required.
- `tools/SK8Lytz_Bucket_List.md` — not edited by this task (ledger-exemption rule; synced later via `/bucketlist`/`/wind-down`).
- `CHANGELOG.md` — no per-task entry (aggregated at `/release`).
- `.claude/settings.json` — belongs to the sibling `debt/hygiene` ledger item, out of scope here.

## 9. Testing Guide (Manual — CLAUDE.md mandate)

Since this is a comment-only deletion with **zero observable UI change**, this is a negative/regression guide confirming nothing broke, not a "new behavior" guide.

### 🧪 Manual Testing Guide — Delete orphaned fossil section-header comments

**Browser:** Chrome 120+
**Environment:** local (`http://127.0.0.1:5500`) or live (`https://neogleamz.github.io`)
**Prerequisites:** logged-in session with access to STOCKPILEZ, MAKERZ, and REVENUEZ hub tabs (all fed by `populateDropdowns()`, the function immediately above the deleted block)

#### ✅ Happy Path / Regression Checks (no new behavior exists — confirm existing behavior is unchanged)
1. Open DevTools console **before** loading the page. Load the app and log in. Expected: no new console errors or warnings on boot (comments are inert; there should be zero difference from pre-edit behavior).
2. Navigate to **MAKERZ** → **RECIPEZ** pane. Open **+ CREATE** (Recipe Action Modal) or the **BULK ADD** modal. Expected: the Retail/Sub-Assembly/3D-Print/Custom-Label product dropdowns populate exactly as before (these are rendered by `populateDropdowns()`, the function immediately preceding the deleted comment block).
3. Navigate to **MAKERZ** → **BATCHEZ** pane. Open **+ CreateBatch** (Start Production Batch modal) and **+ BatchOrder** (Batch Estimator modal). Expected: `newWOProductRetail`/`newWOProductSub`/`newWOProductPrint` and `multiBatchProductRetail`/`multiBatchProductSub`/`multiBatchProductPrint` dropdowns all populate normally.
4. Navigate to **STOCKPILEZ** or wherever the Alias Recipe Select / Packerz Blueprint Admin dropdowns surface (also populated inside the same `populateDropdowns()` call). Expected: normal population, no missing options, no console errors.
5. Confirm the page's `<script>` tag structure is intact indirectly: if any of the above dropdowns fail to populate or the console shows a `SyntaxError`, that indicates the edit damaged the script boundary — treat as a failed test and re-check §2/§7.

#### ❌ Error & Edge Cases
- None specific to this change — there is no new logic path, input, or error state introduced. If any *pre-existing* error state in the above flows behaves differently than before the edit, that is a regression to investigate (unlikely, given the change is 7 deleted comment lines with zero code beneath them).

#### 🔁 Regression Checks (nearby features — verify nothing broke)
- Confirm `populateDropdowns()` is still reachable and functioning from a second entry point if practical (it is also invoked from `bom-module.js`, per the sibling `debt/tooling-2` plan's regression notes) — e.g. trigger a recipe-related action from `assets/js/bom-module.js`'s call path and confirm dropdowns still populate.

#### 🗄️ Database Verification
- None required — this task performs no database read or write of any kind.
