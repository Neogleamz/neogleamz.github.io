# fix/remote-scanner-history-xss — Implementation Plan

## 0. Scope & methodology note (per anti-hallucination protocol)

**Severity:** Critical — stored XSS, reachable today. Any operator who enters a `<script>`/`<img onerror>` payload into a stock-audit note field, then anyone who opens the phone bridge's History tab while connected to that item's Cycle Count session, executes it in their mobile browser session.

The ledger entry (`tools/SK8Lytz_Bucket_List.md` §🔴 P0) and the task prompt were both treated as the authoritative starting point but **not trusted blindly** — every cited line number, function name, and "dormant/unreachable" claim below was independently re-`Read`/`Grep`'d against the current on-disk state of `assets/js/inventory-module.js`, `tools/remote-scanner.html`, `tools/remote-capture.html`, `scripts/xss-audit.js`, and `.githooks/pre-commit` before finalizing this plan.

**Line-number drift confirmed and corrected:** the ledger cites `inventory-module.js:2778` (broadcast) and `:2773` (local safeHTML render). **Both are stale.** The function `window.refreshStockzAuditHistory` currently starts at **line 2603**; the local safeHTML render is at **line 2719**; the raw broadcast send is at **lines 2720-2726** (payload literal at line 2724). All snippets below are quoted from the file as it reads right now. The task prompt's citation of `tools/remote-scanner.html:1123` for the `innerHTML` assignment, and `:1064`/`:1081`/`:1105` for the three sibling findings, **are all accurate** — verified via direct `Read`.

**"Dormant" claim for `populateItemsFromCache()` — verified, with the precise mechanism.** The function itself is not dead code (it has a live call site, `remote-scanner.html:934`, inside the `SESSION_TRANSFER` handler, gated on `if (payload.catalogCache)`). It is dormant because **no current PC-side broadcaster ever includes a `catalogCache` field.** Repo-wide grep of every `SESSION_TRANSFER` send (`inventory-module.js:1367-1374`, `:1381-1391`; `packerz-module.js:2698-2705`) confirms all three only ever send `{ accessToken, refreshToken }`. This exactly matches the ledger's own phrasing ("gated behind a `catalogCache` field the PC never sends") and is also independently corroborated by a prior sibling plan (`docs/plans/fix-cc-mobile-bridge-sync-bugs-1.md` §3) that reached the identical conclusion. Confirmed correct — not re-derived from scratch, cross-checked.

**No Supabase schema/table/column/RLS change is required by any fix in this plan — confirmed.** Every fix below is either a client-side broadcast-payload sanitization change, a DOM-construction rewrite, or a Node scanner-script change. Zero Supabase queries are added, removed, or altered. `tools/SK8Lytz_App_Master_Reference.md`'s `## Database Schemas` section requires no update.

**No button/modal/UI element is created, deleted, or moved by any fix below** (only internal sanitization/rendering logic changes; every touched DOM id already exists and is unmodified) — the Mermaid Architectural Blueprint topological-integrity rule does not apply.

**Critical scanner-limitation discovery (read before trusting the "bonus scope" glob extension to have caught this bug) — see §4.** This is surfaced prominently, not buried.

---

## 1. Root cause, side A — send: `inventory-module.js` broadcasts the raw string

**Confirmed current state**, `window.refreshStockzAuditHistory` (`assets/js/inventory-module.js:2603-2731`), success-path tail:

```js
2717:        });
2718:        
2719:        historyContainer.innerHTML = window.safeHTML(h);
2720:        if (window.ccSyncChannel && window.currentAuditItemKey) {
2721:            window.ccSyncChannel.send({
2722:                type: 'broadcast',
2723:                event: 'PC_HISTORY_UPDATE',
2724:                payload: { html: h }
2725:            }).catch(()=>{});
2726:        }
2727:    } catch(e) {
```

`h` (built starting line 2631) embeds, per history row: `displayName` (catalog item name), `row.reason_code`, `row.operator_email`, and — critically — `row.notes` (raw, operator-typed free text, line 2711-2714) with **zero escaping**, directly interpolated into the template literal. Line 2719 correctly wraps the PC's own local render in `window.safeHTML(h)`. Line 2724 broadcasts the **pre-sanitization** variable `h` instead. This is the entire root cause: a well-intentioned local sanitization step whose output is simply never reused for the broadcast.

**Repo-wide confirmed: this is the only broadcast payload anywhere in `assets/js/*.js` carrying an `html`-shaped key** (grep for `payload:\s*\{[^}]*html` across `assets/js/` returns exactly this one hit) — the bug is fully contained to this single call site, no sibling instance elsewhere in the module graph.

**Repo-wide confirmed: `PC_HISTORY_UPDATE` has exactly one sender (here) and exactly one receiver** (`tools/remote-scanner.html:1118`) — no other file broadcasts or listens for this event.

### Fix

```diff
-        historyContainer.innerHTML = window.safeHTML(h);
-        if (window.ccSyncChannel && window.currentAuditItemKey) {
-            window.ccSyncChannel.send({
-                type: 'broadcast',
-                event: 'PC_HISTORY_UPDATE',
-                payload: { html: h }
-            }).catch(()=>{});
-        }
+        const safeH = window.safeHTML(h);
+        historyContainer.innerHTML = safeH;
+        if (window.ccSyncChannel && window.currentAuditItemKey) {
+            window.ccSyncChannel.send({
+                type: 'broadcast',
+                event: 'PC_HISTORY_UPDATE',
+                payload: { html: safeH }
+            }).catch(()=>{});
+        }
```

Sanitize once, reuse for both the local render and the broadcast — single source of truth, no risk of the two ever drifting again, and a nice side effect: **the phone's history view will now render byte-identically to the PC's own local history panel**, since both are populated from the exact same `DOMPurify`-sanitized string. Today they can differ (the phone gets the raw string; whatever `DOMPurify` already strips from the PC's local render — e.g. the `onmouseover`/`onmouseout` attributes on the `<summary>` element at line 2675, since `DOMPurify` strips all `on*` handler attributes by default regardless of the `ADD_ATTR` allowlist, which does not re-add any handler attribute — is a pre-existing, unrelated-to-this-fix cosmetic quirk of the *existing* local render, not something this fix introduces or should touch per the Boy Scout rule's bug-fix exemption).

---

## 2. Root cause, side B — receive: `remote-scanner.html` has zero sanitizer infrastructure

**Confirmed current state**, `tools/remote-scanner.html:1117-1126`:

```js
1117:                // Listen for History broadcast
1118:                syncChannel.on('broadcast', { event: 'PC_HISTORY_UPDATE' }, (envelope) => {
1119:                    const payload = envelope.payload;
1120:                    if (payload && payload.html) {
1121:                        const histContainer = document.getElementById('mobileHistoryContent');
1122:                        if (histContainer) {
1123:                            histContainer.innerHTML = payload.html;
1124:                        }
1125:                    }
1126:                });
```

**Confirmed: this file's entire `<head>` (lines 1-15) loads exactly two `<script src>` CDNs** — `@supabase/supabase-js@2` and `html5-qrcode@2.3.8`. No `neogleamz-engine.js`, no `window.safeHTML`, no `DOMPurify`, anywhere. Repo-wide grep for `safeHTML` inside `tools/` returns zero matches in either `.html` file (only in the two `.md` doc files).

### 2.1 What does `payload.html` actually look like? (required investigation before choosing a sanitization strategy)

Read `h`'s construction in full (`inventory-module.js:2631-2716`). It is **not** a flat list of plain-text rows. It is genuinely structural, styled HTML:
- A `<style>` block (details-marker suppression CSS).
- Per row, a native `<details class="stockz-audit-details">…<summary>…</summary>…</details>` progressive-disclosure widget.
- Nested `<div>`/`<span>` elements with per-element inline `style="…"` (colors, layout, ellipsis truncation).
- Color-coded delta/valuation badges computed from row data.
- A conditional block (`${row.notes ? … : ''}`) for the optional notes callout.
- Two static, hardcoded inline handlers on the `<summary>` (`onmouseover`/`onmouseout`, using `this.parentElement…` — no dynamic data in the handler bodies themselves; see §6.3 for why this is flagged but out of scope).

### 2.2 Design decision: `DOMPurify.sanitize()` vs. `.textContent`/DOM-rebuild — chosen: DOMPurify

Rebuilding this via pure `.textContent`/`createElement` DOM construction in `remote-scanner.html` was seriously considered per the task's explicit prompt. **Rejected** for this specific sink, because:
1. The structure is genuinely rich (nested `<details>`/`<summary>`, multiple styled `<div>`/`<span>` per row, conditional blocks) — a full DOM-construction reimplementation would mean duplicating `refreshStockzAuditHistory()`'s entire row-rendering logic a second time, in a different file, in a much more verbose imperative style. That is a large, error-prone diff for a *fix* branch, and creates a second copy of the template that will inevitably drift from the PC's version on the next unrelated edit.
2. Fix §1 already makes the sanitized string **the single source of truth** for both renders — the receive side genuinely does not need to re-derive structure, only to defend against a compromised/tampered payload in transit.
3. `DOMPurify` (loaded once, reused across all 4 dynamic sites in this file — see §3) is a two-line fix per site vs. a multi-hundred-line reimplementation, with materially lower regression risk on a Critical-severity branch.

**Contrast with the simpler sibling sites (§5):** for `populateItemsFromCache()`'s flat `<option>`/`<optgroup>` list, DOM-construction *is* chosen instead, because that structure is trivially simple, an already-safe sibling pattern exists 12 lines above it in the same file to copy, and it fully eliminates the sink rather than merely sanitizing it. Different structures warranted different answers — this was evaluated per-site, not applied as a blanket rule.

### 2.3 Why receive-side sanitization is real defense-in-depth, not redundant paranoia

Even after §1's sender fix, a second, independent layer on the receive side matters because:
- Supabase Realtime **broadcast channels are not table-level-RLS-protected** — RLS governs Postgres row access, not Realtime pub/sub channel messages. A malicious client that subscribes to the same channel name could, in principle, send a forged `PC_HISTORY_UPDATE` broadcast directly, bypassing the PC entirely.
- The channel name is `neogleamz-cc-sync-${window.ccSessionId}`, and `ccSessionId` (`inventory-module.js:1337`) is generated as `` `${userId}-cc-${Math.random().toString(36).substring(2,6)}` `` — a **4-character base-36 suffix (~1.68M combinations)**. This is a session capability token, not a cryptographically strong secret, and there is no additional server-side authorization on the broadcast channel itself. (This is a pre-existing architectural characteristic, not introduced or worsened by this fix — flagged here because it is exactly the reason receive-side sanitization has independent value, not covered further in this task; **recommend a separate follow-up ledger item to evaluate Supabase Realtime Authorization / private channels for this bridge**, out of scope here.)
- Defense against any *future* regression where a new call site broadcasts `PC_HISTORY_UPDATE` without routing through the now-sanitized `safeH`.

### Fix — add DOMPurify + a local `window.safeHTML` shim, sanitize on receipt

```diff
                     if (payload && payload.html) {
                         const histContainer = document.getElementById('mobileHistoryContent');
                         if (histContainer) {
-                            histContainer.innerHTML = payload.html;
+                            // Defense-in-depth: payload.html is already sanitized by the sender
+                            // (inventory-module.js's refreshStockzAuditHistory now broadcasts
+                            // window.safeHTML(h) instead of raw h — see fix-remote-scanner-history-xss
+                            // plan §1) — re-sanitize here too so this sink never trusts the network
+                            // payload alone.
+                            histContainer.innerHTML = window.safeHTML(payload.html);
                         }
                     }
```

(Infra + shim details in §3-4 below, since the shim is shared across all 4 fix sites in this file.)

---

## 3. Infra: DOMPurify CDN tag — exact match to `index.html`

**Confirmed exact current tag**, `index.html:19`:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.5/purify.min.js" integrity="sha384-rneZSW/1QE+3/U5/u+/7eRNi/tRc+SzS+yXy36fltr1tDN9EHaVo1Bwz2Z8o8DA4" crossorigin="anonymous"></script>
```

**CSP compatibility — confirmed non-issue.** `index.html:10` has a CSP `<meta>` tag whose `script-src` already whitelists `https://cdnjs.cloudflare.com`, but that CSP is scoped to the `index.html` document only. **`tools/remote-scanner.html` has zero `<meta http-equiv="Content-Security-Policy">` of its own** (confirmed — no such tag anywhere in its `<head>`, lines 1-15) — it is a separate, directly-loaded HTML document (not an iframe of `index.html`), so `index.html`'s CSP does not apply to it and there is no CSP to satisfy or violate by adding this tag. (The complete absence of any CSP on this standalone tool page is a separate, out-of-scope hardening opportunity — not introduced or worsened by this fix; not addressed here.)

**SRI integrity:** copy the hash verbatim from `index.html:19` — do not regenerate it. This guarantees byte-identical behavior to the already-deployed, already-trusted copy the main app loads.

### Fix — `tools/remote-scanner.html`, insert as new line 15 (after the `html5-qrcode` tag, before `<style>`)

```diff
     <!-- Supabase JS SDK & Html5Qrcode CDNs -->
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
+    <script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.5/purify.min.js" integrity="sha384-rneZSW/1QE+3/U5/u+/7eRNi/tRc+SzS+yXy36fltr1tDN9EHaVo1Bwz2Z8o8DA4" crossorigin="anonymous"></script>
```

### Fix — local `window.safeHTML` shim, insert after `triggerHaptic()` (currently lines 869-873, before `updateStatus`)

Mirrors `assets/js/neogleamz-engine.js:52-64`'s exact contract (unconditional `window.safeHTML(x)` call pattern, same DOMPurify-missing fallback) — **not** a copy of its full `ADD_TAGS`/`ADD_ATTR` allowlist, deliberately:

```js
        // XSS defense-in-depth: this standalone page has no neogleamz-engine.js, so it gets its
        // own minimal DOMPurify wrapper. Same unconditional-call contract as the main app's
        // window.safeHTML (assets/js/neogleamz-engine.js:52-64) — never a ternary, always call
        // window.safeHTML(x) directly. Deliberately uses DOMPurify's plain default allowlist (no
        // ADD_TAGS/ADD_ATTR) — this page never renders iframe/video/data-click-token content, so
        // the wider main-app allowlist would only add unused surface. Least privilege.
        window.safeHTML = function(dirtyHTML) {
            if (typeof DOMPurify !== 'undefined') {
                return DOMPurify.sanitize(dirtyHTML);
            }
            console.warn("DOMPurify not loaded. Using fallback HTML escaper.");
            const div = document.createElement('div');
            div.innerText = dirtyHTML;
            return div.innerHTML;
        };
```

**Why a named `window.safeHTML` shim instead of calling `DOMPurify.sanitize()` directly at each of the 4 sites** (both are CLAUDE.md-sanctioned patterns — the print-window pattern explicitly allows raw `DOMPurify.sanitize()`): this file ends up with **4** dynamic-content sinks after this task (§2, §5), not one isolated print-window call — using the codebase's canonical `window.safeHTML(x)` name at all 4 keeps them uniform with the rest of the repo's established convention, and means `node scripts/xss-audit.js`'s `hasDirectSafeHTML()` check (which matches on the literal text `window.safeHTML(`) correctly recognizes every guarded site here identically to how it recognizes them in `assets/js/*.js` and `index.html`.

**Default-allowlist correctness check (not just asserted):** the history HTML (§2.1) uses only `style=`/`class=` attributes and standard tags (`div`, `span`, `details`, `summary`) — none of `neogleamz-engine.js`'s extra `ADD_TAGS`/`ADD_ATTR` entries (`iframe`/`video`/`source`, `data-click` tokens, etc.) are used anywhere in this payload. A plain-default-config `DOMPurify.sanitize()` therefore produces the same practical result for this content as the main app's wider config would.

---

## 4. Critical discovery: the "bonus scope" glob extension would NOT have caught this bug — flagged prominently, not buried

Investigated per the task's explicit instruction not to wave this away. `scripts/xss-audit.js`'s `UNGUARDED_INNERHTML` rule requires **both** `/\.innerHTML\s*=/` **and** `hasDynamic(line)`, and `hasDynamic()` is:

```js
function hasDynamic(line) {
  return /\$\{/.test(line);
}
```

It only recognizes **template-literal interpolation** (`${…}`) on the *same line* as the assignment. It has **no concept of a bare variable or property-access assignment** (`x.innerHTML = someVar;`). Checked every one of the 4 fix sites in `tools/remote-scanner.html` against this rule, before and after this task's changes:

| Site | Line | Assignment form | `hasDynamic()` today | Would glob extension alone have caught it? |
|---|---|---|---|---|
| `populateItemsFromCache` | 1064 | `selectBox.innerHTML = html;` (bare var) | **false** | **No** |
| `PC_STOCK_UPDATE` gridHtml | 1081 | `` gridContainer.innerHTML = `<div>${payload.gridHtml}</div>`; `` (template literal) | **true** | **Yes** |
| `PC_STOCK_UPDATE` alertBadgeHtml | 1105 | `tempDiv.innerHTML = p.alertBadgeHtml;` (bare property) | **false** | **No** |
| **`PC_HISTORY_UPDATE` — the actual root cause** | **1123** | `histContainer.innerHTML = payload.html;` (bare property) | **false** | **No** |

**The exact line this whole task exists to fix (1123) would never have been flagged by the scanner even with the file-glob extension fully wired, because of this pre-existing blind spot — unrelated to file coverage.** Only one of the four sinks (`gridHtml`, line 1081, already provably static/numeric per §5.2) would actually have been surfaced. This means: extending `collectFiles()` to `tools/*.html` is still correct and required (per the ledger's ask, and it does close real future-visibility gaps for template-literal-style violations), but **it must not be presented or relied upon as the thing that caught or would have caught this specific vulnerability class.** The manual code fixes in §1-§3 and §5 are what actually close it.

**Recommend as a separate, future, dedicated follow-up (not in this task's diff):** enhance `hasDynamic()` to also recognize bare-identifier/property-access assignments (e.g. a pattern like `/\.innerHTML\s*=\s*[A-Za-z_$][\w$.]*\s*;/` excluding string/boolean literals). **Not implemented here** because turning that on would need its own full sitewide triage pass across `index.html` + all of `assets/js/*.js` (an unknown, unbounded number of new true/false positives) — exactly the kind of unscoped blast radius this task's own sequencing analysis (§6) is designed to avoid introducing on a Critical-severity hotfix branch.

---

## 5. Dormant/adjacent sibling findings — decision: fix all three while already in the file

The task explicitly invites this decision ("fix these too... if small and low-risk... or explicitly leave them"). All three are fixed, for the reasons below, since DOMPurify infra now exists in this file at near-zero marginal cost.

### 5.1 `populateItemsFromCache()` (lines 1033-1065) — fix via DOM construction, not a wrap

**Confirmed still dormant post-this-task** (§0 — no `SESSION_TRANSFER` sender includes `catalogCache`; this task does not add one). Fixed anyway because: (a) it is reachable code gated on a runtime condition, not literally unreachable, so it should not remain a live sink; (b) an already-correct sibling pattern sits **12 lines above it in the same file** (`ITEM_DIRECTORY` handler, lines 1017-1031) using `document.createElement('option')` + `appendChild` — copying an in-file precedent is lower-risk than introducing a new sanitizer-wrap pattern; (c) it fully eliminates the sink (works even if `DOMPurify` somehow failed to load), which a wrap alone would not.

```diff
         function populateItemsFromCache() {
             const selectBox = document.getElementById('ccMobileItemSelect');
             if (!selectBox || !window.catalogCache) return;
             
             const groups = {};
             for (let k in window.catalogCache) {
                 const item = window.catalogCache[k];
                 const name = item.neoName || item.itemName || k;
                 
                 // Determine group (e.g., HALO, NEO, etc.)
                 let prefix = 'OTHER';
                 if (item.type) {
                     prefix = item.type.toUpperCase();
                 } else {
                     const match = name.match(/^([a-zA-Z]+)/);
                     if (match) prefix = match[1].toUpperCase();
                 }
                 
                 if (!groups[prefix]) groups[prefix] = [];
                 groups[prefix].push({ value: k, text: name });
             }
             
-            let html = '<option value="">-- Choose Item Natively --</option>';
-            for (let prefix in groups) {
-                html += `<optgroup label="${prefix}">`;
-                groups[prefix].sort((a,b) => a.text.localeCompare(b.text)).forEach(i => {
-                    html += `<option value="${i.value}">${i.text}</option>`;
-                });
-                html += `</optgroup>`;
-            }
-            selectBox.innerHTML = html;
+            // Native DOM construction (createElement/appendChild), mirroring the ITEM_DIRECTORY
+            // handler above — zero string-based HTML, so this sink can never become an innerHTML
+            // XSS vector regardless of future edits, without needing DOMPurify at all.
+            selectBox.innerHTML = '';
+            const blankOpt = document.createElement('option');
+            blankOpt.value = '';
+            blankOpt.text = '-- Choose Item Natively --';
+            selectBox.appendChild(blankOpt);
+            for (let prefix in groups) {
+                const optgroup = document.createElement('optgroup');
+                optgroup.label = prefix;
+                groups[prefix].sort((a,b) => a.text.localeCompare(b.text)).forEach(i => {
+                    const opt = document.createElement('option');
+                    opt.value = i.value;
+                    opt.text = i.text;
+                    optgroup.appendChild(opt);
+                });
+                selectBox.appendChild(optgroup);
+            }
         }
```
(`selectBox.innerHTML = ''` is the explicitly CLAUDE.md-allowed empty-clear pattern.)

### 5.2 `gridHtml` / `alertBadgeHtml` (`PC_STOCK_UPDATE` handler, lines 1078-1112) — fix via `window.safeHTML()` wrap

**Confirmed content source is provably static/numeric, not fixed via DOM rebuild (too much diff for no risk reduction).** Traced both producers on the PC side:
- `gridHtml` = `document.getElementById('stockzAuditBalancesGrid')?.innerHTML` (`inventory-module.js:2071`) — that grid's own `innerHTML` is built at `inventory-module.js:1970-1995`/`2000-2025`, and every interpolated value in it is `parseFloat(...).toFixed(2)` — pure numeric formatting, zero free-text fields.
- `alertBadgeHtml` = `document.getElementById('stockzAuditAlertStatusBadge')?.outerHTML` (`inventory-module.js:2069`) — that badge's content is set via `badge.innerText = "🚨 REORDER ALERT"` or `"✅ Stock Healthy"` (`inventory-module.js:2877`/`2880`) — two hardcoded literal strings, no dynamic data reaches it at all.

Wrapped anyway (belt-and-suspenders, near-zero cost now that infra exists, and closes the visibility gap even though — per §4's table — the `gridHtml` site is the one sibling the scanner extension would have flagged as CRITICAL):

```diff
                         if (payload.gridHtml) {
                             const gridContainer = document.getElementById('mobileStockPanel');
                             if (gridContainer) {
-                                gridContainer.innerHTML = `<div class="stock-grid" style="grid-template-columns: repeat(3, 1fr); gap: 6px;">${payload.gridHtml}</div>`;
+                                gridContainer.innerHTML = window.safeHTML(`<div class="stock-grid" style="grid-template-columns: repeat(3, 1fr); gap: 6px;">${payload.gridHtml}</div>`);
                             }
                         }
```

```diff
                             if (alertBadge && p.alertBadgeHtml) {
                                 // Extract inner text and color from PC's badge
                                 const tempDiv = document.createElement('div');
-                                tempDiv.innerHTML = p.alertBadgeHtml;
+                                tempDiv.innerHTML = window.safeHTML(p.alertBadgeHtml);
                                 const child = tempDiv.firstElementChild;
```
(`tempDiv` here is never appended to `document` — used only to parse text/color back out — so this was already low-risk even unwrapped; wrapping costs nothing and removes the ambiguity for any future reader/reviewer.)

---

## 6. Bonus scope: `scripts/xss-audit.js` glob extension — full impact investigation + sequencing design

### 6.1 Exhaustive inventory of what extending the glob to `tools/*.html` surfaces

Confirmed via `Glob('tools/*.html')`: exactly two files exist — `tools/remote-scanner.html`, `tools/remote-capture.html`. Every `.innerHTML`/`insertAdjacentHTML`/`outerHTML`/`document.write` occurrence in both was individually traced (not sampled):

**`tools/remote-scanner.html`** (7 total `.innerHTML` occurrences):
- 1022, 1166, 1211 — static literal / empty-clear → already CLAUDE.md-compliant, never flagged.
- 1064, 1081, 1105, 1123 — the four sites fixed in §2/§5 above → **zero remain after this task's fixes**.

**`tools/remote-capture.html`** (4 total `.innerHTML` occurrences):
- 622, 655, 983 — empty-clear → compliant, never flagged.
- **722 — new finding, not named in the original ledger entry** (the ledger named only the two `remote-scanner.html` siblings): `` card.innerHTML = `<img src="${url}" alt="Thumbnail" /><button class="phone-staged-thumbnail-delete-btn">CLOSE</button>`; `` — a template literal with `${url}`, so `hasDynamic()` **would** flag this as CRITICAL the moment the glob is extended. Traced `url`'s origin (`remote-capture.html:826-840`): it is a Supabase Storage `getPublicUrl()` result, built from `` `remote-${Date.now()}-${safeName}` `` where `safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')` — fully alphanumeric-constrained, system-generated, no free-text injection vector. Low actual exploitability, **but the scanner cannot know that**, and leaving it unfixed would immediately trip a CRITICAL finding the instant the glob is extended.

**Fix — DOM construction, no DOMPurify needed in this file at all:**
```diff
             const card = document.createElement('div');
             card.className = 'phone-staged-thumbnail-card';
             card.setAttribute('data-url', url);
-            card.innerHTML = `
-                <img src="${url}" alt="Thumbnail" />
-                <button class="phone-staged-thumbnail-delete-btn">CLOSE</button>
-            `;
+            const img = document.createElement('img');
+            img.src = url;
+            img.alt = 'Thumbnail';
+            card.appendChild(img);
+
+            const deleteBtn = document.createElement('button');
+            deleteBtn.className = 'phone-staged-thumbnail-delete-btn';
+            deleteBtn.textContent = 'CLOSE';
+            card.appendChild(deleteBtn);
```
Unchanged, still works: the immediately-following `card.querySelector('img')` / `card.querySelector('.phone-staged-thumbnail-delete-btn')` calls (lines ~728, ~738) target the same class names — event binding is untouched. `deleteBtn.textContent = 'CLOSE'` already satisfies CLAUDE.md's "Close buttons: never X/✕, always the explicit word Close" rule (unchanged from before — was already `>CLOSE<` text, now just built via `textContent` instead of a string literal). **This keeps `remote-capture.html`'s footprint minimal — no new CDN script tag added to this file at all**, since a DOM-construction fix fully eliminates the need for a sanitizer here.

### 6.2 The much bigger surprise: 15 pre-existing inline-event-handler violations

Grepped both files for `on(click|change|submit|input)\s*=\s*"` (the exact 4 event names `xss-audit.js`'s `INLINE_EVENT_HANDLER_IN_HTML` rule tracks) — **not** limited to the two named files' `innerHTML` sites, since this is a separate rule category the task's own framing did not pre-empt:

- **`tools/remote-scanner.html`: 14 occurrences** (lines 616-618, 662-663, 672, 674-675, 702, 704-705, 757, 765, 825).
- **`tools/remote-capture.html`: 1 occurrence** (line 475).

All 15 are **static, hardcoded, literal-argument calls** (`onclick="switchMobileTab('audit')"`, `oninput="syncMobileDeltaValuation()"`, `onclick="window.close()"`, etc.) — **zero dynamic/DB-sourced data is interpolated into any handler.** These are not themselves exploitable as stored XSS (no attacker-controlled string ever reaches them) — they are a CSP-hygiene / code-convention violation, not a live vulnerability. But `xss-audit.js`'s rule matches them literally regardless of severity, and — critically — **its exit-code logic does not distinguish CRITICAL from MODERATE**: `process.exit(WARN_MODE ? 0 : 1);` fires on **any** non-empty finding list, MODERATE included.

### 6.3 Sequencing decision — resolved, not just flagged

**If the glob extension shipped in blocking mode in this same commit, ~15 unrelated MODERATE findings would immediately start blocking every future commit** — a scope explosion far beyond what a "Critical stored-XSS fix" branch should absorb (rewriting 15 inline handlers to `data-click`/`data-input` delegation tokens would also require standing up delegator infrastructure in a standalone page that currently has none — `system-event-delegator.js` is `index.html`-only). **Decision: two-tier, single-invocation design — mirrors the exact precedent already established in this repo for `nomenclature-audit.js`** (`.githooks/pre-commit:40`, `--warn --changed-only`, with the explicit documented lifecycle: soft-launch advisory now, flip to blocking once the backlog is paid down).

**Confirmed: after this task's code fixes (§1-§5), the *only* `tools/*.html` findings the extended glob would surface are these 15 inline-handler MODERATE findings — zero CRITICAL `UNGUARDED_INNERHTML` findings remain in either file.** (Every `.innerHTML`/`insertAdjacentHTML`/`outerHTML`/`document.write` site in both files was traced individually in §6.1 — none remain unaddressed.)

### Fix — `scripts/xss-audit.js`

**(a) Extend `collectFiles()`:**
```diff
 function collectFiles() {
   const files = [path.join(ROOT, 'index.html')];
   const jsDir = path.join(ROOT, 'assets', 'js');
   if (fs.existsSync(jsDir)) {
     fs.readdirSync(jsDir)
       .filter(f => f.endsWith('.js'))
       .forEach(f => files.push(path.join(jsDir, f)));
   }
+  // tools/*.html — standalone pages (remote-scanner.html, remote-capture.html) outside the main
+  // index.html module graph. Previously invisible to every prior XSS audit (this class of bug
+  // hid here undetected — see fix-remote-scanner-history-xss). Findings here are advisory-only
+  // (ADVISORY_ONLY_PREFIXES below) until the pre-existing inline-handler backlog is triaged,
+  // mirroring nomenclature-audit.js's --warn soft-launch precedent.
+  const toolsDir = path.join(ROOT, 'tools');
+  if (fs.existsSync(toolsDir)) {
+    fs.readdirSync(toolsDir)
+      .filter(f => f.endsWith('.html'))
+      .forEach(f => files.push(path.join(toolsDir, f)));
+  }
   return files;
 }
```

**(b) Add advisory-only demotion (new, near the top-level constants):**
```js
// Findings under these path prefixes are reported (full visibility) but never block the commit —
// a newly-extended scan surface with a pre-existing backlog (15 inline-handler findings in
// tools/remote-scanner.html, 1 in tools/remote-capture.html as of 2026-07-20) that this task does
// not remediate. Flip to fully blocking by removing the 'tools' + path.sep entry once that backlog
// reaches 0 — same lifecycle index.html/assets/js/*.js already completed (see file header).
const ADVISORY_ONLY_PREFIXES = ['tools' + path.sep];
function isAdvisoryOnly(relPath) {
  return ADVISORY_ONLY_PREFIXES.some(p => relPath.startsWith(p));
}
```

**(c) Update the report loop (add a visible tag) and the exit logic (gate on blocking findings only):**
```diff
 for (const v of allFindings) {
   const icon = v.severity === 'CRITICAL' ? '🔴' : '🟠';
-  console.error(`${icon}  ${v.file}:${v.lineNum}  [${v.ruleId}]`);
+  const tag = isAdvisoryOnly(v.file) ? '  [ADVISORY-ONLY — does not block]' : '';
+  console.error(`${icon}  ${v.file}:${v.lineNum}  [${v.ruleId}]${tag}`);
   console.error(`   ${v.desc}`);
   console.error(`   ${v.snippet}`);
   console.error('');
 }
 ...
-process.exit(WARN_MODE ? 0 : 1);
+const blocking = allFindings.filter(f => !isAdvisoryOnly(f.file));
+process.exit((WARN_MODE || blocking.length === 0) ? 0 : 1);
```

**Zero changes needed to `.githooks/pre-commit`** — its existing unconditional `execSync('node scripts/xss-audit.js', { stdio: 'inherit' })` (line 33) automatically picks up the new file set and the new advisory-tiering logic with no edit required. This is the single-invocation design used deliberately — it avoids doubling the pre-commit XSS pass the way `nomenclature-audit.js` runs as a fully separate invocation, since here the *same* rule set applies to both tiers, only the blocking decision differs per file.

**Follow-up required (log as new `tools/SK8Lytz_Bucket_List.md` § Technical Debt entry at `/wind-down`, not in this task's commits per the ledger-exemption rule):** remediate the 15+1 inline-handler findings (convert to `data-click`/`data-input` tokens + minimal per-page delegator, or accept and formally allowlist if judged non-exploitable-by-design), then remove `'tools' + path.sep` from `ADVISORY_ONLY_PREFIXES` to complete the promotion to fully blocking — matching `xss-audit.js`'s own documented history for `index.html`/`assets/js`.

---

## 7. Security analysis (this task IS the security analysis)

**XSS — summary:** root cause closed at both the sender (§1, sanitize-once-reuse) and receiver (§2, independent re-sanitization) for the actual reported vulnerability. Three adjacent sinks in the same file closed proactively (§5). One previously-unflagged sink in the sibling tool file discovered and closed (§6.1). A genuine, non-obvious scanner blind spot discovered and explicitly documented rather than allowed to create false confidence (§4). Zero new `innerHTML`/`insertAdjacentHTML`/`outerHTML`/`document.write` sinks are introduced anywhere by this task — every change either sanitizes an existing sink or eliminates it via DOM construction.

**Forbidden-ternary check:** no `window.safeHTML ? window.safeHTML(x) : x` pattern appears anywhere in this plan's diffs — every call is the unconditional `window.safeHTML(x)` form, matching the one CLAUDE.md-sanctioned pattern.

**RLS implications:** none — no Supabase table read/write is added, removed, or altered anywhere in this plan. The one relevant, pre-existing architectural gap discussed (§2.3) is that Supabase Realtime **broadcast channels are not RLS-scoped**, which is exactly why the receive-side defense-in-depth layer (§2) has independent value beyond the sender fix — flagged as a separate future hardening item (channel-level authorization / Realtime private channels), not addressed by this task.

**Print-window DOMPurify:** not applicable — no `document.write`/print-window code path exists anywhere in this task's touched files.

**CSP:** confirmed non-issue for the new `remote-scanner.html` script tag (§3 — the file has no CSP of its own; `index.html`'s CSP, which does whitelist `cdnjs.cloudflare.com`, doesn't apply to a separately-loaded document anyway).

**SRI:** hash copied verbatim from the already-deployed, already-trusted `index.html:19` tag — no new hash generated, no risk of a typo'd/mismatched hash silently blocking `DOMPurify` from loading.

---

## 8. Vanilla JS / framework constraints

Every fix in this plan is native DOM only: `document.createElement`, `.appendChild`, `.setAttribute`, `.value`/`.text`/`.textContent`, and the existing `DOMPurify.sanitize()` global (loaded via a plain `<script src>` CDN tag, no bundler/build step — matches every other CDN dependency already in this repo). No `var` is introduced anywhere (`const`/`let` only, matching each file's existing style). No framework code (React/Vue/jQuery/TypeScript) is introduced. Web Bluetooth is not touched — this entire cluster is Supabase Realtime broadcast over WebSocket + `html5-qrcode`'s camera API, unaffected by any change here.

---

## 9. 4-state UX

`window.refreshStockzAuditHistory()` already implements all 4 states on the PC's local render, and none are altered by this task:
- **Loading** (line 2607): static message, unaffected.
- **Empty** (lines 2626-2629): already `window.safeHTML(...)`-wrapped, unaffected.
- **Error** (lines 2727-2730): already `window.safeHTML(...)`-wrapped (interpolates `e.message`, correctly guarded), unaffected.
- **Success**: the only state that ever broadcasts to the phone, and the only one this task's §1 fix touches (sanitize-once-reuse, does not change the state itself).

**Out-of-scope observation, not fixed here:** only the Success state is ever broadcast to the phone (`return` on line 2628 for Empty, and the `catch` block for Error, both exit before reaching the broadcast call). The phone's history panel therefore never mirrors a Loading/Empty/Error state from the PC — it simply retains whatever it last displayed. This is a pre-existing feature-completeness gap, unrelated to the XSS root cause, and out of scope for a security-fix branch per the Boy Scout rule's bug-fix exemption. Recommend a separate future ledger item if PC/phone state-parity for this panel is ever prioritized.

---

## 10. UI mutex

**Not applicable to any fix in this plan.** No new DB-mutation button is introduced or touched. `window.executeWithButtonAction` is defined only inside `index.html`'s inline `<script>` (`index.html:4630`) and is a `window`-global of the **PC's own page** — `tools/remote-scanner.html` is a separate document load with its own independent JS context and does not have access to it regardless. The one real DB mutation adjacent to this cluster, `submitStockzAudit()` (`inventory-module.js:2886`), already correctly wraps its button in `executeWithButtonAction` (line 2890) and is completely untouched by this task. `clearStockzAuditHistory()` (a genuine DB `DELETE`, line 2733) does **not** use the mutex pattern today (relies on double `confirm()` dialogs instead) — this is pre-existing, unrelated debt, not touched here per the Boy Scout rule's bug-fix exemption.

---

## 11. Zero-refresh

Not materially applicable — none of this task's fixes change *when* or *whether* any render function is invoked, only *what content* is sanitized before assignment. `refreshStockzAuditHistory()`'s existing invocation sites (tab-switch, post-save, post-clear — lines 2599, 2753, 3068) are unchanged. `remote-scanner.html`'s `PC_HISTORY_UPDATE` handler already re-assigns `histContainer.innerHTML` live on every broadcast receipt with no page reload required — that already-correct zero-refresh behavior is preserved, just now safely.

---

## 12. Schema changes

**None — confirmed.** No `CREATE`/`ALTER TABLE`, no RLS policy change, no new Supabase query of any kind anywhere in this plan. `tools/SK8Lytz_App_Master_Reference.md`'s `## Database Schemas` section requires no update. Per the ledger-exemption rule, the Master Reference is not touched in this task's micro-commits regardless (it syncs at `/wind-down`); this is noted here only to explicitly satisfy the "confirm no schema changes" requirement, not because a schema-driven update is being deferred.

---

## 13. Verification plan

### 13.1 Deterministic Node proof (write to `scratch/`, gitignored, not committed — per Verification Mandate)

`dompurify` + `jsdom` are already devDependencies (proven pattern: `tests/test-dompurify.js`). Recommend a throwaway script, e.g. `scratch/verify-history-xss-fix.js`, that:
1. Builds a minimal reproduction of one `h`-style row using a malicious `notes` value, e.g. `` `"><img src=x onerror="window.__NEO_XSS_PROOF=true">` `` interpolated exactly as line 2712-2714 does.
2. Confirms the **raw, unsanitized** string (what today's `payload.html` actually sends) still contains the literal `onerror=` attribute verbatim — proving the pre-fix exploit is live.
3. Runs the same string through `DOMPurify.sanitize(dirty)` (both the send-side full-allowlist config from `neogleamz-engine.js` and the receive-side plain-default config) and asserts the sanitized output contains **no** `onerror`/`<script>`/`onclick` attribute or tag — proving both sanitization layers strip the payload.
4. Confirms a benign row (normal `notes` text, e.g. `"Recount after supplier shipment"`) survives sanitization unchanged in its visible text content — proving normal entries still render readably.

### 13.2 Manual, two-device browser verification (required — proves actual script execution, which `jsdom` cannot fully replicate)

Covered in the mandatory testing guide at the end of this plan (§15). Must be run **before** this fix (on `main`, to reproduce the live exploit) and **after** (on this branch, to confirm it is blocked), using a real malicious `<img onerror>` payload in a stock-audit note and a real second device/browser for the phone bridge.

### 13.3 Automated scans (post-implementation validation swarm, per CLAUDE.md)

- `node scripts/xss-audit.js --warn` — confirm the `PC_HISTORY_UPDATE`/`populateItemsFromCache`/`gridHtml`/`remote-capture.html:722` findings this task targets are gone, and confirm the 15 `INLINE_EVENT_HANDLER_IN_HTML` findings appear tagged `[ADVISORY-ONLY]` (visible, non-blocking) — not silently invisible, not blocking.
- `node scripts/xss-audit.js` (no `--warn`, i.e. the actual pre-commit invocation) — must exit 0. This is the concrete proof that the sequencing design in §6.3 works as intended before it ever reaches a real commit.
- `npm test` / `npx eslint .` — no existing test file references any of the touched functions (`refreshStockzAuditHistory`, `populateItemsFromCache`, `PC_HISTORY_UPDATE`, `PC_STOCK_UPDATE`) — confirmed via grep of `tests/`; expect no new failures, no new coverage added (out of scope — this cluster has zero pre-existing automated coverage, matching the sibling `fix-cc-mobile-bridge-sync-bugs-1.md` plan's same finding for the same file family).

---

## 14. Risks (ranked)

1. **Highest — the local `window.safeHTML` shim in `remote-scanner.html` must load `DOMPurify` before first use.** The CDN `<script>` tag (§3) is a plain synchronous `<script src>` (no `defer`/`async`), so by the time the inline `<script>` block (starting line 836) executes, `DOMPurify` is guaranteed available — but re-confirm the tag is placed in `<head>` *before* the inline script block, not after, when implementing.
2. **Medium — `populateItemsFromCache()`'s DOM-construction rewrite (§5.1) is genuinely dead code today** (§0), so it cannot be exercised by the manual test in §15 without also fabricating a `catalogCache` payload — verify it via direct console invocation (`window.catalogCache = {...}; populateItemsFromCache();`) rather than the live broadcast path, since no current sender reaches it.
3. **Medium — the `ADVISORY_ONLY_PREFIXES` mechanism (§6.3) is new scanner logic with no existing test coverage.** Manually run both `node scripts/xss-audit.js` and `node scripts/xss-audit.js --warn` locally and inspect output before committing — do not assume the diff is correct from code review alone (Verification Mandate).
4. **Low — `remote-capture.html`'s fix (§6.1) touches a file with an active, in-use phone-camera-upload flow** unrelated to the Stockz audit history bug. Regression-test that flow explicitly (§15) even though the fix is a narrow, mechanical `innerHTML`-to-DOM-construction swap.
5. **Low — this is a live, Supabase-Realtime-broadcast-driven, multi-device feature with zero automated test coverage**, same characteristic risk profile as the sibling `fix-cc-mobile-bridge-sync-bugs-1.md` cluster. Phone-in-the-loop testing (§15) is mandatory, not optional, for the same reason.

---

## 15. Manual testing

### 🧪 Manual Testing Guide — Remote Scanner History Stored-XSS Fix

**Browser:** Chrome 120+ on both PC and phone (Web Bluetooth-adjacent camera APIs + Supabase Realtime WebSocket + DOMPurify CSP compatibility).
**Environment:** PC on `http://127.0.0.1:5500` (or local network IP) + phone on the same Wi-Fi network. Repeat once against `https://neogleamz.github.io` post-deploy.
**Prerequisites:** logged-in Neogleamz OS session with at least one STOCKZ inventory item; a second device (phone or laptop) with a camera and Chrome, on the same network.

#### 🔴 Pre-fix reproduction (run on `main` FIRST, before checking out this branch — required proof the bug is real)
1. STOCKPILEZ → STOCKZ → open any item's audit modal.
2. Perform a stock adjustment with **Notes** set to: `<img src=x onerror="alert('XSS-PROOF: ' + document.cookie)">`. Submit.
3. Click **📷 SCAN PORTAL** → **📱 Smartphone Link**, scan the QR on the phone, wait for "Bridge Connected ✓".
4. On the phone, tap the **📜 History** tab.
5. **Expected on `main` (pre-fix):** an `alert()` fires on the **phone's own screen** containing the session cookie string — this is the live, unauthenticated-injection proof. Screenshot it for the record, then dismiss.

#### ✅ Happy Path (post-fix, this branch)
1. Repeat steps 1-4 above on this branch (`fix/remote-scanner-history-xss`).
2. **Expected:** no `alert()` fires. The phone's History tab shows the adjustment entry with the notes text rendered as inert, visible plain text (e.g. literally showing `<img src=x onerror="...">` as text, or the tag stripped entirely with the surrounding text intact — either is an acceptable "did not execute" outcome; confirm via View Source / DOM inspection on the phone that no live `<img>`/`onerror` attribute exists in the actual DOM).
3. Perform a second, benign adjustment with normal notes (e.g. "Recount after supplier shipment — 3 units damaged in transit"). Confirm it appears in the phone's History tab identically formatted to how it appears in the PC's own history panel (item name, delta badge, valuation, operator, timestamp, notes callout) — this is the parity check from §1's "sanitize once, reuse" design.
4. Open the phone's manual item-selection area (Physical Audit tab) — confirm the dropdown still populates and functions normally (regression check on §5.1's rewrite, exercised via its live path — the `ITEM_DIRECTORY` broadcast, not `populateItemsFromCache` itself, which remains dormant per §0).
5. On the PC, adjust the same item's stock again and confirm the phone's live stock-balance grid (Planning tab) still updates in real time with correct numeric values (regression check on §5.2's `gridHtml` wrap) and the reorder-alert badge still shows the correct color/text (regression check on §5.2's `alertBadgeHtml` wrap).

#### ❌ Error & Edge Cases
1. Submit a note containing only structural HTML with no script payload, e.g. `<b>bold</b> test`. Expected: renders as inert text (not bolded), no console error.
2. Submit a note containing an unclosed tag, e.g. `<div>oops`. Expected: DOMPurify auto-closes/repairs it safely; no broken layout, no console error.
3. Disconnect the phone's Wi-Fi mid-session on the History tab, then reconnect. Expected: no PC-side crash; this is an existing, out-of-scope gap (no disconnect-detection UI for this panel).
4. Load `tools/remote-scanner.html` directly with DevTools → Network set to block `cdnjs.cloudflare.com`. Expected: `console.warn("DOMPurify not loaded. Using fallback HTML escaper.")` fires, and the fallback `div.innerText` escaper still prevents the `<img onerror>` payload from executing (proves the fallback path in §3's shim, not just the primary path).

#### 🔁 Regression Checks (nearby features — verify nothing broke)
- `tools/remote-capture.html`'s photo-capture flow (unrelated feature, touched only for its own §6.1 finding): open the Snapshot/Photo remote-capture bridge from a relevant modal, take a photo on the phone, confirm the thumbnail card still renders (image + red "CLOSE" button) and both the image-preview-expand and delete-thumbnail interactions still work.
- The phone's manual barcode entry drawer and scanner camera view (untouched by this task) still function normally.
- PC-side "💾 RECORD AUDIT" save button still shows `⚡ COMMITTING...` → `✅ SUCCESS` states correctly (untouched `executeWithButtonAction` wiring, §10).
- `node scripts/xss-audit.js` (no `--warn`) exits 0 on the final committed diff — this is itself a regression check for the whole main app surface (§6.3's design must not weaken the existing blocking guarantee for `index.html`/`assets/js/*.js`).

#### 🗄️ Database Verification
No DB schema or row-shape changes — the fix does not add/alter/remove any Supabase read or write. Verify only that `inventory_adjustments_log` still receives correctly-shaped rows exactly as before (no new/missing columns) when running the Happy Path's adjustment steps.

---

## Files Touched

- **`assets/js/inventory-module.js`** — send-side root-cause fix. `window.refreshStockzAuditHistory` (lines ~2603-2731): sanitize `h` once (`const safeH = window.safeHTML(h);`) and reuse for both the local `historyContainer.innerHTML` assignment (line ~2719) and the `PC_HISTORY_UPDATE` broadcast payload (line ~2724, was `{ html: h }`, now `{ html: safeH }`). No other change in this file.

- **`tools/remote-scanner.html`** — receive-side root-cause fix + infra + 3 sibling fixes:
  - New line ~15 (`<head>`): add DOMPurify 3.0.5 CDN `<script>` tag, exact copy of `index.html:19`'s `src`/`integrity`/`crossorigin`.
  - New block after `triggerHaptic()` (~line 873): local `window.safeHTML` shim (plain-default-config `DOMPurify.sanitize()` + fallback escaper).
  - Line ~1064 (`populateItemsFromCache`): rewrite from string-concatenation `innerHTML` to native `createElement`/`appendChild` DOM construction, mirroring the `ITEM_DIRECTORY` handler pattern.
  - Line ~1081 (`PC_STOCK_UPDATE` handler, `gridHtml`): wrap in `window.safeHTML(...)`.
  - Line ~1105 (`PC_STOCK_UPDATE` handler, `alertBadgeHtml`): wrap in `window.safeHTML(...)`.
  - Line ~1123 (`PC_HISTORY_UPDATE` handler — the reported vulnerability): wrap `payload.html` in `window.safeHTML(...)` before the `histContainer.innerHTML` assignment.
  - **Not touched:** the 14 static inline-event-handler occurrences (§6.2) — deliberately deferred to a future ledger item per §6.3's sequencing decision.

- **`tools/remote-capture.html`** — one fix, discovered during the bonus-scope investigation (§6.1), not named in the original ledger entry:
  - Line ~722 (`addPhoneStagedThumbnail`): rewrite `card.innerHTML = \`<img src="${url}">...\`` to native `createElement('img')`/`createElement('button')` + `appendChild`. No new CDN script tag added to this file — the DOM-construction fix needs no sanitizer.
  - **Not touched:** the 1 static inline-event-handler occurrence (line 475, `onclick="window.close()"`) — deferred per §6.3, same as `remote-scanner.html`'s 14.

- **`scripts/xss-audit.js`** — bonus-scope glob extension + sequencing design:
  - `collectFiles()`: add every `tools/*.html` file to the scanned set.
  - New `ADVISORY_ONLY_PREFIXES` constant + `isAdvisoryOnly()` helper: demote `tools/*`-path findings to non-blocking (still printed, tagged `[ADVISORY-ONLY]`) until the 15+1 inline-handler backlog (§6.2) is separately remediated.
  - Report loop: add the `[ADVISORY-ONLY]` tag to advisory findings.
  - Exit logic: `process.exit((WARN_MODE || blocking.length === 0) ? 0 : 1)` — blocking is computed only from non-advisory findings; `index.html`/`assets/js/*.js`'s existing 0-violations-blocking guarantee is fully preserved, unweakened.

**Not touched (confirmed):**
- `.githooks/pre-commit` — its existing unconditional `node scripts/xss-audit.js` call automatically covers the new glob + tiering logic; no line changes needed.
- `tools/SK8Lytz_App_Master_Reference.md` — no schema/RLS/UI-topology change (§0, §12); ledger-exemption rule defers any doc sync to `/wind-down`.
- `tools/SK8Lytz_Bucket_List.md` — ledger-exemption rule; recommend logging the new 15+1 inline-handler Technical Debt entry (§6.3) at `/wind-down`, alongside marking this task's line `[x]`.
- `index.html` — zero DOM producers created/deleted/moved; the DOMPurify CDN tag it already has is only read (as the copy source for §3), not modified.
- `assets/js/packerz-module.js` — read for verification only (confirmed its `SESSION_TRANSFER`/`cameraSyncChannel` sends carry no `catalogCache` or `html`-shaped payload; no root-cause-class bug found here — §0, §2.3).
- `assets/js/system-event-delegator.js` — no delegator tokens added; the 15 deferred inline handlers (§6.3) would need this infrastructure if/when that follow-up is implemented, not here.
- `tests/` — zero existing coverage for this cluster to update (confirmed via grep); no new automated tests added — the Node throwaway script (§13.1) belongs in `scratch/` (gitignored), not `tests/`.

## Suggested commit message(s)

Micro-commit cadence, one commit per logical fix (matching this repo's established style):

1. `fix(remote-scanner): broadcast the sanitized history HTML instead of the raw string` — `assets/js/inventory-module.js` (§1)
2. `fix(remote-scanner): add DOMPurify + local safeHTML shim, sanitize PC_HISTORY_UPDATE on receipt` — `tools/remote-scanner.html` (§2, §3)
3. `refactor(remote-scanner): rebuild populateItemsFromCache via DOM construction, wrap gridHtml/alertBadgeHtml in safeHTML` — `tools/remote-scanner.html` (§5)
4. `fix(remote-capture): rebuild staged-thumbnail card via DOM construction instead of innerHTML` — `tools/remote-capture.html` (§6.1)
5. `feat(xss-audit): scan tools/*.html, demote pre-existing inline-handler backlog to advisory-only` — `scripts/xss-audit.js` (§6.3)

(Per the ledger-exemption rule, `tools/SK8Lytz_Bucket_List.md` and `tools/SK8Lytz_App_Master_Reference.md` are not touched in any of these micro-commits.)
