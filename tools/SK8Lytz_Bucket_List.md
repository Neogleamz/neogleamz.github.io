# 🦅 Neogleamz Master Bucket List

This document acts as the permanent, living task tracker integrated directly with your autonomous AI development agents. 

> [!CAUTION]
> **THE IMMUTABLE LEDGER DIRECTIVE:** You are STRICTLY FORBIDDEN from deleting history in this file. Even if this file becomes extremely long, do NOT "clean up" the history or truncate the `🗄️ Completed & Archived Epics` section. Completed items must remain exactly as they are until the `/release` workflow tags them with `[🚀]`.

> [!NOTE]
> **Archiving Protocol:** When all items in an Epic are marked `[x]`, the entire block is moved to the **🗄️ Completed & Archived Epics** section at the bottom of this file. This provides a clean active workspace while preserving a permanent historical record of our accomplishments!

> [!IMPORTANT]
> **Prioritization Protocol:** The AI executes tasks strictly top-to-bottom to guarantee stability.
> * **🔴 P0 Critical:** System blockers, hotfixes, data corruption risks. Drop everything to fix.
> * **🟠 P1 High Priority:** Core application features, necessary infrastructure, and major business logic. 
> * **🟡 P2 Medium Priority:** UI enhancements, workflow automations, and quality-of-life updates.
> * **🟢 P3 Backlog:** Approved ideas and long-term targets pending active development.
### 🔴 P0 Critical (Blockers & Hotfixes)
*Clean sweep — all P0 blockers successfully completed and archived!* ✅

### 🟢 P3 Backlog (Ideas & Sandbox)
*Clean sweep — all backlog sandbox ideas successfully completed and archived!* ✅

### 🟠 P1 High Priority (Active Epics)


*Clean sweep — all high priority active epics successfully completed and archived!* ✅

## 🧹 Technical Debt

*Verified by 4 independent agents — 2026-07-01*

#### 🔴 Critical — Unguarded DOM Injection (no safeHTML at all)
- [x] `debt/security` : **[index.html:4408](../index.html)** — `sysLog()` debug logger calls `insertAdjacentHTML('beforeend', ...)` with raw `${msg}` and `${htmlPayload}`. `msg` is passed by `window.onerror`, unhandled promise rejections (`event.reason`), and all `catch(e)` blocks across the app — any of these can carry DB-sourced or externally-influenced strings. `htmlPayload` is `JSON.stringify(payload)` which does not HTML-escape. No `window.safeHTML()` anywhere in the call path. Wrap both variables before insertion.
- [x] `debt/security` : **[barcodz-module.js:485](../assets/js/barcodz-module.js)** — print confirmation modal: `modalEl.innerHTML = innerHtml` where `innerHtml` interpolates `${activeSizeSelect}` (DB-populated dropdown value, unsanitized). Attribute-escape attack vector. Wrap in `window.safeHTML(...)`.
- [x] `debt/security` : **[label-designer.js:708](../assets/js/label-designer.js)** — print confirmation modal: `modalEl.innerHTML = innerHtml` where `innerHtml` interpolates `${window.ldState.paperProfile}` (user-saved label profile name, unsanitized). Same attribute-escape vector. Wrap in `window.safeHTML(...)`.

#### 🔴 Critical — Systemic: Ternary safeHTML Fallback (38 DOM-write instances in index.html)
- [x] `debt/security` : **[index.html — 38 instances](../index.html)** — Pattern `window.safeHTML ? window.safeHTML(x) : x` throughout the inline script. If `neogleamz-engine.js` fails to load (network error, script error), `window.safeHTML` is `undefined` and every fallback branch injects raw HTML. High-risk fallback sites include: L5461 (recipe names from DB), L5861 (DB column keys in button HTML), L5918/6016 (full DB table rows), L6303–6319 (product name dropdowns from DB), L4855/7002/7068 (Supabase error messages). Replace all 38 with unconditional `window.safeHTML(x)` calls — the function itself already has an `innerText` escape fallback if DOMPurify is absent.

#### 🟠 Moderate — Unguarded Print Window document.write (DB data flows unescaped)
- [x] `debt/security` : **[production-module.js:2545–2626](../assets/js/production-module.js)** — SOP print window pipes `globalRichTextHTML` (raw rich-text HTML from DB) and `s.text` (SOP step text from DB) into `win.document.write(html)` with no sanitization. An admin-inserted `<script>` in an SOP step executes in the same-origin print popup.
- [x] `debt/security` : **[packerz-module.js:925–1008](../assets/js/packerz-module.js)** — SOP print window pipes `pName` (recipe name from DB), `s.text`, and `s.qaChecks` (SOP step/QA text from DB) into `win.document.write(html)` unguarded.
- [x] `debt/security` : **[print-module.js:880–956](../assets/js/print-module.js)** — SOP print window pipes `s.text` and header content from DB SOP steps into `win.document.write(html)` unguarded.
- [x] `debt/security` : **[inventory-module.js:1091–1097](../assets/js/inventory-module.js)** — Reorder report print window pipes `x.nn` (neogleamz name), `x.n` (item name), `x.sp` (spec) from DB into `win.document.write(html)` unguarded.
- [x] `debt/security` : **[production-module.js:2419–2425](../assets/js/production-module.js)** — Work order print window pipes `name` and product names from DB into `win.document.write(html)` unguarded. Fix pattern for all five: run `DOMPurify.sanitize(html)` on the assembled string before passing to `document.write`, or switch to `Blob` + `URL.createObjectURL`.

#### 🟠 Moderate — DOMPurify as Last Line of Defense (free-text DB fields reach safeHTML)
- [x] `debt/security` : **[inventory-module.js:3116–3162](../assets/js/inventory-module.js)** — `refreshStockzAuditHistory()` concatenates raw DB fields `row.reason_code`, `row.operator_email`, and `row.notes` (free-text form input) directly into the HTML string `h` before calling `window.safeHTML(h)`. DOMPurify is the only protection. Add a text-escape helper for free-text fields before concatenation so DOMPurify isn't a single point of failure for stored-XSS.
- [x] `debt/security` : **[socialz-module.js:788, 814](../assets/js/socialz-module.js)** — `log()` function embeds `s.name` (skater name from Supabase) into `msg` and then into `term.innerHTML` via the ternary fallback. If DOMPurify is absent, a malicious skater name in the DB executes as HTML in the socialz terminal.

#### 🟠 Hygiene — Inline Event Handlers (CLAUDE.md violation)
- [x] `debt/hygiene` : **[index.html:2653](../index.html)**, **[index.html:2712](../index.html)**, **[index.html:2822](../index.html)** — three `<select>` elements (`#barcodzTemplateSelect`, `#labelzTemplateSelect`, `#labelzDesignerTemplateSelect`) use `onchange=""` inline attribute handlers. Convert all three to `data-change` tokens registered in `system-event-delegator.js`.
- [x] `debt/hygiene` : **[bom-module.js:38](../assets/js/bom-module.js)** — inline `onclick="document.getElementById('bulkAddModal').style.display='none';"` baked into a dynamically built `<tr>`. Replace with a `data-click` delegator token.
- [x] `debt/hygiene` : **[packerz-module.js:163](../assets/js/packerz-module.js)** and **[packerz-module.js:2489](../assets/js/packerz-module.js)** — redundant `onclick="event.stopPropagation()"` alongside `data-app-click="stopProp"` (which already works). Remove the inline `onclick=` attributes.

#### 🟠 Infrastructure — No SRI on CDN Scripts + CSP Gaps
- [ ] `debt/security` : **[index.html:11–17](../index.html)** — None of the 7 CDN `<script>` tags (including DOMPurify itself) carry an `integrity="sha384-..."` SRI hash. A compromised CDN could serve a malicious DOMPurify that bypasses all safeHTML calls. Add SRI hashes to all CDN scripts.
- [ ] `debt/security` : **[index.html:6](../index.html)** — CSP `script-src` includes both `'unsafe-inline'` and `'unsafe-eval'`, which nullifies XSS injection protection entirely (required by the inline-script architecture). Long-term: extract the inline `<script>` block to an external file to allow `'unsafe-inline'` removal. Short-term: add a `report-uri` directive so violations are visible.
- [x] `debt/hygiene` : **[index.html:6](../index.html)** — Dev/sandbox `connect-src` URLs (`http://127.0.0.1:54321`, `ws://127.0.0.1:54321`) are present in the production CSP. Remove from production.

#### 🟡 Low — outerHTML with e.message (browser-controlled, low risk)
- [x] `debt/security` : **[packerz-module.js:1734, 1742](../assets/js/packerz-module.js)** and **[production-module.js:2763, 2769](../assets/js/production-module.js)** — `el.outerHTML = \`...\${e.message}\`` in barcode/QR error handlers. `e.message` is JS Error.message (browser-controlled, unlikely to carry injection), but should be escaped for correctness. Replace with `textContent` on a created element.

#### 🔴 Critical — Systemic: Ternary safeHTML Fallback (38 remaining instances across 6 modules)
- [ ] `debt/security` : **[task-engine.js — 26 instances](../assets/js/task-engine.js)** — FORBIDDEN_TERNARY at lines 147, 187, 544, 833, 860, 923, 954, 972, 1006, 1043, 1425, 1468, 1512, 1580, 1655, 1661, 1932, 2108, 2111, 2120, 2322, 2348, 2627, 2729, 2760, 2774. These cover task name rendering, section labels, and status pill HTML — all DB-sourced. Replace all 26 with unconditional `window.safeHTML(x)`. [Files: assets/js/task-engine.js]
- [ ] `debt/security` : **[scraper-module.js — 3 ternaries + 1 unguarded](../assets/js/scraper-module.js)** — FORBIDDEN_TERNARY at lines 46, 468, 506; UNGUARDED_INNERHTML at line 302 (raw DB product data injected directly). Replace ternaries with unconditional `window.safeHTML(x)`; wrap line 302 in `window.safeHTML()`. [Files: assets/js/scraper-module.js]
- [ ] `debt/security` : **[ceo-module.js — 4 instances](../assets/js/ceo-module.js)** — FORBIDDEN_TERNARY at lines 241, 378, 577, 690. CEO dashboard renders DB product/revenue labels into DOM. Replace all 4 with unconditional `window.safeHTML(x)`. [Files: assets/js/ceo-module.js]
- [ ] `debt/security` : **[labelz-module.js — 2 instances](../assets/js/labelz-module.js)** — FORBIDDEN_TERNARY at lines 299, 1032. Template name and label data from DB. Replace both with unconditional `window.safeHTML(x)`. [Files: assets/js/labelz-module.js]
- [ ] `debt/security` : **[analytics-module.js — 1 instance](../assets/js/analytics-module.js)** — FORBIDDEN_TERNARY at line 297. Replace with unconditional `window.safeHTML(x)`. [Files: assets/js/analytics-module.js]
- [ ] `debt/security` : **[kpi-reports-module.js — 1 instance](../assets/js/kpi-reports-module.js)** — FORBIDDEN_TERNARY at line 54. Replace with unconditional `window.safeHTML(x)`. [Files: assets/js/kpi-reports-module.js]

---

## 🗄️ Completed & Archived Epics

### Target: `main`
**Epic: Technical Debt Sweep**
*(Archived — 2026-07-01)*

#### 🔴 Security
- [🚀] `debt/security` : **[packerz-module.js:1581](../assets/js/packerz-module.js)** — `insertAdjacentHTML('beforeend', window.safeHTML ? window.safeHTML(h) : h)` — the ternary fallback `: h` injects raw unguarded HTML if `window.safeHTML` is undefined. Hardened to early-return with console error if safeHTML unavailable.

#### 🟡 Hygiene
- [🚀] `chore/hygiene` : Add `coverage/` to [.gitignore](../.gitignore) — test artifacts (`clover.xml`, `lcov.info`, HTML coverage reports) are currently tracked and deploy to the live GitHub Pages site on every push.

#### 🟢 Dependencies
- [🚀] `debt/dependencies` : `exceljs` removed entirely — runtime unused (all Excel I/O uses SheetJS). Removal eliminates the `uuid` moderate vulnerability at the root. `npm audit` now reports 0 vulnerabilities.

### Target: `main`
**Epic: Technical Debt Sweep**
*(Archived — 2026-06-30)*

#### 🔴 Security: Unguarded innerHTML
- [🚀] `debt/security` : **[inventory-module.js:3162](../assets/js/inventory-module.js)** — `historyContainer.innerHTML = h` — `h` is built from database rows including `row.notes` (user-supplied text). Wrap in `window.safeHTML()`.
- [🚀] `debt/security` : **[inventory-module.js:3172](../assets/js/inventory-module.js)** — `historyContainer.innerHTML = \`...$\{e.message}\`` — error message injected into DOM without sanitization. Wrap template in `window.safeHTML()`.
- [🚀] `debt/security` : **[label-designer.js:78](../assets/js/label-designer.js)** — `sel.innerHTML = html` — `html` is built from database template names/IDs. Wrap in `window.safeHTML()`.
- [🚀] `debt/security` : **[packerz-module.js:3479](../assets/js/packerz-module.js)** — `card.innerHTML` injects `imageUrl` into `src` AND an inline `onclick` handler — double violation (unguarded innerHTML + forbidden inline event handler). Refactor to use `data-click` token and `window.safeHTML()`.

#### 🔴 Vulnerabilities (npm audit — resolved)
- [🚀] `debt/dependencies` : **fabric@5.5.2 → 7.4.0** — HIGH severity stored XSS via SVG export (GHSA-hfvx-25r5-qc3w, GHSA-w22m-hvvm-xmwx). Run `npm audit fix --force` — **BREAKING CHANGE**, audit fabric 7.x API diff before upgrading.
- [🚀] `debt/dependencies` : **tar (via @mapbox/node-pre-gyp)** — HIGH severity path traversal (6 CVEs). Run `npm audit fix` — non-breaking, safe to run.
- [🚀] `debt/dependencies` : **uuid < 11.1.1 (via exceljs)** — MODERATE, missing buffer bounds check. Requires `npm audit fix --force` (downgrades exceljs to 3.4.0).

#### 🟡 Stale Packages (resolved)
- [🚀] `debt/dependencies` : `eslint` 10.4.1 → 10.6.0 (patch — safe)
- [🚀] `debt/dependencies` : `prettier` 3.8.3 → 3.9.4 (patch — safe)
- [🚀] `debt/dependencies` : `supabase` 2.104.0 → 2.109.0 (minor — safe)

### Target: `main`
**Epic: Technical Debt Sweep**
*(Archived — 2026-06-30)*
- [🚀] `debt/security` : **Unguarded innerHTML** - `modalEl.innerHTML = innerHtml;` is currently used in `assets/js/barcodz-module.js` (Line 476) without `window.safeHTML()` wrapper. This poses an XSS risk.
- [🚀] `debt/security` : **Unguarded insertAdjacentHTML** - `b.insertAdjacentHTML(...)` is currently used in `index.html` (Line 4268) without `window.safeHTML()` wrapper.
- [🚀] `debt/dependencies` : Update `@supabase/supabase-js` from `2.106.2` to `2.107.0` (Patch).
### Target: `main`
**Epic: Zero-Drift Sandbox Protocol**
*(Archived — 2026-06-06)*
- [🚀] `feat/zero-drift-sandbox` : **Zero-Drift Local Engine** - Build a standalone Node.js `local-engine.js` server to orchestrate local Docker containers, executing `pg_dump` data and schema pulls directly from the Live DB, hardening dumps against circular foreign keys with `session_replication_role = 'replica'`, and streaming chunked HTTP logs directly into the frontend BRAINZ Vault Trace UI. [🤖 Antigravity] [🧠 20k / 20k] [💸 $0.05 / $0.05]

### Target: `main`
**Epic: Webhooks Manager**
*(Archived — 2026-06-06)*
- [🚀] `feat/webhooks-manager` : **Webhooks Manager Pane** - Build a native UI pane in SALEZ to log, inspect, and manually replay incoming Shopify webhooks via Supabase Edge Functions. (Plan: [docs/plans/feat/webhooks-manager.md](file:///d:/GitHub/neogleamz.github.io/docs/plans/feat/webhooks-manager.md))

### Target: `main`
**Epic: Standalone Technical Debt Sweep**
*(Archived — 2026-06-06)*
- [🚀] `debt/eslint-warnings-sweep` : **ESLint Zero Warnings** - Resolved 25 persistent `no-undef` and `no-unused-vars` warnings across `label-designer.js`, `labelz-module.js`, and `system-realtime-sync.js` to achieve a pristine 0-warning output state.

### Target: `main`
**Epic: Label Inventory & Template Sync**
*(Archived — 2026-06-05)*
- [🚀] `feat/label-inventory-sync` : **Label Inventory & Template Sync** - Track physical sticker and label stock as an actual raw material inventory item. Enable adding this label stock to a recipe (e.g., a "product box") so that when the recipe is manufactured, it correctly deducts the label inventory like all other standard components. (Plan: [docs/plans/feat/label-inventory-sync.md](file:///d:/GitHub/neogleamz.github.io/docs/plans/feat/label-inventory-sync.md))

### Target: `main`
**Epic: Storefront Alias Explicit Resolution**
*(Archived — 2026-06-04)*
- [🚀] `fix/sku-alias-manager-barcode` : **SKU Alias Manager Barcode Overwrite** - Add product webhook routing to `shopify-webhook` to ingest barcodes via `products/update`. Remove destructive `null` barcode overwrites from the `orders/create` payload. Switch database conflict target from Product Title to `shopify_sku` across all functions and UI.

### Target: main
**Epic: Mobile Audit Console Sync & Fullscreen Modal**
*(Archived — 2026-06-04)*
- [🚀] `feat/mobile-audit-console` : **Mobile Audit Console Sync & Fullscreen Modal** - Expand PC cycle count modal to fullscreen overlay. Upgrade mobile scanner to 1:1 functional clone with Bottom-Sheet UI. Fix WebRTC Base64 sync via Supabase channels, auto-trigger PC Audit Modal on scan. (Plan: [docs/plans/feat-mobile-audit-console.md](file:///d:/GitHub/neogleamz.github.io/docs/plans/feat-mobile-audit-console.md))

**Epic: UUID Inventory Architecture Migration**\r
*(Archived — 2026-06-03)*\r
- [🚀] `feat/uuid-inventory-migration` : **UUID Inventory Architecture Migration** - Migrate `full_landed_costs` and all 9 downstream relational tables from mutable string keys to permanent `item_uuid` foreign keys to ensure stable historical reporting. Implement UI data-binding refactors to handle `data-uuid` safely across modules. (Plan: [docs/plans/feat-uuid-inventory-migration.md](file:///d:/GitHub/neogleamz.github.io/docs/plans/feat-uuid-inventory-migration.md))
\r
*(Archived — 2026-06-02)*
- [🚀] `feat/packerz-check-all` : **Check All QA Automation** - Introduce a "Check All" utility within the Packerz SOP Viewer Modal specifically for the Mandatory Quality Checklist section, allowing operators to bulk-clear standard textual QA checks. (Plan: [docs/plans/feat/packerz-check-all.md](file:///d:/GitHub/neogleamz.github.io/docs/plans/feat/packerz-check-all.md))

### Target: `main`
**Epic: Dynamic Label Tracking & Designer**
*(Archived — 2026-06-02)*
- [🚀] `feat/label-print-tracking-and-designer` : **Label Print Tracking & Visual Designer** - Bridge Barcodz and the BOM by injecting dynamically tracked `BARCODE_LABEL:::` components to track produced SKU stickers, and introduce a Vanilla JS physical-unit visual template designer. (Plan: [docs/plans/feat-label-print-tracking-and-designer.md](file:///d:/GitHub/neogleamz.github.io/docs/plans/feat-label-print-tracking-and-designer.md))

### Target: `main`
*(Epic: Legacy HTML Audits)*
- [🚀] `chore/dep-patch-updates` : Run npm update to safely bump `eslint` (10.4.0 -> 10.4.1) and `supabase` (2.101.0 -> 2.102.0) safe patch versions.
### Target: `feat/unified-sku-barcode-parity`
**Epic: Unified SKU & Barcode Parity Engine**
*(Archived — 2026-06-01)*
- [🚀] `feat/unified-sku-barcode-parity` : **Unified SKU & Barcode Parity Engine** - Establish a Unified Hybrid Identification Architecture (UHIA) that emulates the Shopify MS Barcodes settings (9-digit random numbers in Code 128 format and 'NG-XXXX-' SKUs) for all internal raw goods, sub-assemblies, and finished goods, backed by a self-healing conflict resolution protocol that always defers to Shopify records upon sync detection. [🤖 Antigravity] [🧠 5k / 5k] [💸 $0.02 / $0.02]

### Target: `main`
**Epic: Technical Debt Sweep**
*(Archived — 2026-05-31)*
- [🚀] `debt/security-insertAdjacentHTML` : Wrap dynamic checklist text inside safeHTML at [packerz-module.js:L1069](file:///d:/GitHub/neogleamz.github.io/assets/js/packerz-module.js#L1069) to eliminate dynamic XSS injection vectors. [🤖 Antigravity] [🧠 3k / 3k] [💸 $0.01 / $0.01]
- [🚀] `debt/orphan-root-files` : Relocate [remote-capture.html](file:///d:/GitHub/neogleamz.github.io/remote-capture.html) and [remote-scanner.html](file:///d:/GitHub/neogleamz.github.io/remote-scanner.html) from root to /tools/ or /docs/ subfolders to resolve Whitelist Violations. [🤖 Antigravity] [🧠 1.5k / 1.5k] [💸 $0.01 / $0.01]

### Target: `feat/stockz-audit-planning-console`
**Epic: Stockz Bulletproof Audit & Planning Console**
*(Archived — 2026-05-31)*
- [🚀] `feat/stockz-audit-planning-console` : Implement a high-fidelity glassmorphism Audit Console modal supporting both Physical Count Reconciliation (auto-calculating delta offsets) and Quick delta adjustments with forensic transaction logging, average COGS financial impact calculations, an interactive ROP Planning Config simulator, and mobile QR-code handheld scanning sync. [🤖 Antigravity] [🧠 TBD / 5k] [💸 TBD / $0.02]

### Target: `feat/cycle-count-dual-preview`
**Epic: Cycle Count Dual-Preview Live Sync**
*(Archived — 2026-05-28)*
- [🚀] feat/cycle-count-dual-preview : **Cycle Count Dual-Preview Live Sync** - Add dynamic preview routing options (PC only, Phone only, or simultaneous Dual-Preview) to the Cycle Count Manager while preserving instantaneous barcode/QR scanning. [🤖 Antigravity] [🧠 5k / 5k] [💸 $0.02 / $0.02]

### Target: `main`
**Epic: Live Mobile Camera Preview & Physical Capture Sync**
*(Archived — 2026-05-28)*
- [🚀] feat/mobile-camera-sync : **Live Mobile Camera Preview & Physical Capture Sync** - Enable mobile WebRTC camera views in the SOP Editor and Cycle Count manager to show a live stream preview on the phone itself, and support physical device capture triggers rather than relying solely on Command Center button clicks. [🤖 Antigravity] [🧠 TBD / 5k] [💸 TBD / $0.02]

### Target: `main`
**Epic: Login Theme Synchronization & Persistence**
*(Archived — 2026-05-28)*
- [🚀] bug/login-theme-sync-issue : **Login Theme Synchronization & Persistence** - Resolve the issue where the login container is locked in dark mode upon load/logout even if the operator previously saved a light theme preference. Check and apply the stored theme state immediately at the start of window loading. [🤖 Antigravity] [🧠 TBD / 5k] [💸 TBD / $0.02]

### Target: `main`
**Epic: Login Boot Progress Modal Integration**
*(Archived — 2026-05-28)*
- [🚀] feat/login-boot-progress-modal : **Login Boot Progress Modal** - Prevent users from interacting with the app during the initial boot sequence by showing a gorgeous loading/progress modal on the login page, redirecting to the Stockpilez page only after successful initialization. [🤖 Antigravity] [🧠 TBD / 5k] [💸 TBD / $0.02]

### Target: `main`
**Epic: Standalone Technical Debt Sweep**
*(Archived — 2026-05-24)*
- [🚀] debt/orphan-diagnostic-dumps : **Root Diagnostic Orphan Dumps** - Move root-level diagnostic files (all_buttons.txt, modals_trace.txt, pane_orders.txt) to a consolidated diagnostics/ folder to ensure perfect repository hygiene. [🤖 Antigravity] [🧠 1k / 1k] [💸 $0.01 / $0.01]
- [🚀] debt/documentation-consolidation : **Documentation Relocation & Master Reference Integration** - Relocate loose root markdown documents and SVG assets to the /docs/ folder, update root whitelists, and integrate under Section 8 of the Master Reference. [🤖 Antigravity] [🧠 1.5k / 1.5k] [💸 $0.01 / $0.01]

### Target: `main`
**Epic: Swarm HTML Utility Audits**
*(Archived — 2026-05-24)*
- [🚀] debt/legacy-audit-qa-dashboard : **qa-dashboard.html** - Execute /legacy_audit and refactor target to enforce Vanilla JS rules, removing any inline layout styles. [🤖 Antigravity] [🧠 1k / 1.5k] [💸 $0.01 / $0.01]
- [🚀] debt/legacy-audit-test-print : **test-print.html** - Execute /legacy_audit and refactor target to enforce Vanilla JS rules, removing any inline layout styles. [🤖 Antigravity] [🧠 0.5k / 1k] [💸 $0.01 / $0.01]

### Target: `main`
**Epic: Swarm Audit & Security Penetration Scans**
*(Archived — 2026-05-24)*
- [🚀] epic/red-team-audit : **Red Team Security Pentest** - Deploy Teamwork Swarm to run a deep penetration scan across the core Vanilla DOM modules, validating window.safeHTML and input isolation. [🤖 Teamwork Swarm] [🧠 5k / 5k] [💸 $0.02 / $0.02]
- [🚀] epic/legacy-code-janitor : **Legacy Code Audit & Refactor** - Deploy Teamwork Swarm to execute system-wide audit on any remaining legacy JS templates to enforce modern block-scoping and event delegator standards. [🤖 Teamwork Swarm] [🧠 5k / 5k] [💸 $0.02 / $0.02]

### Target: `main`
**Epic: Technical Debt Sweep**
*(Archived — 2026-05-24)*
- [🚀] debt/eslint-warnings-sweep : Resolve the 11 ESLint warnings (no-undef on updateLabelCanvasOrientation, showNexlPane, Image, and no-unused-vars) to achieve 100% warning-free lint output. [🤖 Antigravity] [🧠 4.5k / 5k] [💸 $0.02 / $0.02]
- [🚀] debt/orphan-scripts-root : Relocate remaining 2 orphaned scripts (dump_buttons.py, trace3.py) from root to tools/ or scripts/ directories. [🤖 Antigravity] [🧠 1.5k / 1.5k] [💸 $0.01 / $0.01]

### Target: `main`
**Epic: Architecture and Task Engine Sweeps**
*(Archived — 2026-05-23)*
- [🚀] chore/hub-hierarchy-nomenclature-audit : **Hub Hierarchy & Nomenclature Audit** - Deploy Teamwork Swarm to map a comprehensive hierarchy chart of all Hubz, Pagez, and Modalz, establish official nomenclature, and refactor the entire repository to purge legacy references. [🤖 Teamwork Swarm] [🧠 TBD / 5k] [💸 TBD / .02]
- [🚀] research/task-engine-competitive-analysis : **Task Engine Competitive Analysis** - Deploy Teamwork Swarm to analyze the current Task Engine architecture against Asana/Jira and generate an improvement proposal artifact. [🤖 Teamwork Swarm] [🧠 TBD / 5k] [💸 TBD / .02]

### Target: main
**Epic: Standalone Cleanups**
*(Archived — 2026-05-22)*
- [🚀] debt/cleanup : **check_syntax.js orphan** - Relocate the orphan script check_syntax.js from root to the scripts/ directory. [🤖 Antigravity] [🧠 TBD / 1k] [💸 TBD / .01]


### Target: `main`
**Epic: Legacy Audit File-by-File Sequence**
*(Generated by User Request — 2026-05-21)*
- [🚀] `refactor/audit-index` : **index.html** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]
- [🚀] `refactor/audit-task-engine` : **task-engine.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]
- [🚀] `refactor/audit-analytics-module` : **analytics-module.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]
- [🚀] `refactor/audit-barcodz-module` : **barcodz-module.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]
- [🚀] `refactor/audit-bom-module` : **bom-module.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]
- [🚀] `refactor/audit-ceo-module` : **ceo-module.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]
- [🚀] `refactor/audit-inventory-module` : **inventory-module.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🧠 4k / 5k] [💸 $0.02 / $0.02]
- [🚀] `refactor/audit-labelz-module` : **labelz-module.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]
- [🚀] `refactor/audit-neogleamz-engine` : **neogleamz-engine.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🧠 1.5k / 5k] [💸 $0.01 / $0.02]
- [🚀] `refactor/audit-orders-module` : **orders-module.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🧠 4k / 5k] [💸 $0.02 / $0.02]
- [🚀] `refactor/audit-packerz-module` : **packerz-module.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]
- [🚀] `refactor/audit-print-module` : **print-module.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🧠 4.5k / 5k] [💸 $0.02 / $0.02]
- [🚀] `refactor/audit-production-module` : **production-module.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Model] [🧠 TBD] [💸 TBD]
- [🚀] `refactor/audit-sales-module` : **sales-module.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🧠 4k / 5k] [💸 $0.02 / $0.02]
- [🚀] `refactor/audit-scraper-module` : **scraper-module.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🧠 4k / 5k] [💸 $0.02 / $0.02]
- [🚀] `refactor/audit-socialz-module` : **socialz-module.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]
- [🚀] `refactor/audit-system-event-delegator` : **system-event-delegator.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]
- [🚀] `refactor/audit-system-realtime-sync` : **system-realtime-sync.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [✅ COMPLETE] [🟢 Passed]
- [🚀] `refactor/audit-system-tools-module` : **system-tools-module.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]
- [🚀] `refactor/audit-system-version` : **system-version.js** - Execute `/legacy_audit` and refactor target to enforce Vanilla JS rules. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]

### Target: `main`
**Epic: Global Error Telemetry**
*(Shipped v1.0.57 — 2026-05-22)*
- [🚀] `test/audit-jest-coverage` : **Jest Test Coverage Audit** - Ensure the npm test suite is updated and aligned with all the recent structural changes and that it is testing everything possible across the platform. [🤖 Gemini 3.1 Pro (High)] [🧠 5k / 25k] [💸 $0.02 / $0.08]
- [🚀] `feat/global-error-telemetry` : **Global Error Telemetry Wrapper** - Implement a global execution wrapper to catch, log, and surface 100% of UI events, interactions, and silent errors directly to the Diagnostics Console. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]

### Target: `main`
**Epic: Task Engine 'T' Shortcut Fix**
*(Shipped Silent — 2026-05-21)*
- [🚀] `bug/task-engine-shortcut-t-regression` : **Task Engine 'T' Shortcut Regression** - Fix the regression where pressing 'T' in the task engine no longer starts creating a new task under the "No Section" bucket for rapid-fire task entry. [🤖 Gemini 3.1 Pro (High)] [🧠 5k / 5k] [💸 $0.02 / $0.02]

### Target: `main`
**Epic: Code Debt Hunt & Dependencies**
*(Archived — 2026-05-21)*
- [🚀] `debt/socialz-eslint-warnings` : Resolve the 3 ESLint warnings (IntersectionObserver no-undef, ig and data no-unused-vars) in socialz-module.js to achieve zero warnings. [🤖 Gemini 3.1 Pro (High)] [🧠 6.5k / 5k] [💸 $0.02 / $0.02]
- [🚀] `debt/task-engine-legacy-var` : Migrate the legacy `var r = ...` scope declaration in task-engine.js (Line 8) to block-scoped let/const to enforce modern ECMAScript standards. [🤖 Gemini 3.1 Pro (High)] [🧠 4.5k / 5k] [💸 $0.01 / $0.02]
- [🚀] `chore/dep-supabase-js-update` : Update `@supabase/supabase-js` from 2.105.4 to 2.106.1. [🤖 Gemini 3.1 Pro (High)] [🧠 4k / 1k] [💸 $0.01 / $0.01]
- [🚀] `chore/dep-dompurify-update` : Update `dompurify` from 3.4.4 to 3.4.5. [🤖 Gemini 3.1 Pro (High)] [🧠 4k / 1k] [💸 $0.01 / $0.01]
- [🚀] `chore/dep-supabase-cli-update` : Update `supabase` CLI from 2.98.2 to 2.101.0. [🤖 Gemini 3.1 Pro (High)] [🧠 4k / 1k] [💸 $0.01 / $0.01]

### Target: `main`
**Epic: Socialz "System Fault" on Save**
*(Shipped v.2026.05.21.0352 — 2026-05-21)*
- [🚀] `bug/socialz-system-fault-error` : **Socialz "System Fault" on Save** - Investigate the custom diagnostic console error "System Fault: Unknown Error" that triggers immediately after a successful "Saved to DB!" event when adding a new skater. [🤖 Gemini 3.1 Pro (High)] [🧠 TBD / 5k] [💸 TBD / $0.02]

### Target: `main`
**Epic: Hide 3D Printed SOPs in Stage 3**
*(Shipped v.2026.05.21.0350 — 2026-05-21)*
- [🚀] `feat/batchez-hide-3dprint-sops-stage3` : **Hide 3D Printed SOPs in Stage 3** - Batchez: Ensure 3D printed SOPs do not display in Stage 3 of the Batchez work order process. [🤖 Gemini 3.1 Pro (High)] [🧠 TBD / 5k] [💸 TBD / $0.02]

### Target: `main`
**Epic: Socialz Missing Avatars Migration**
*(Shipped v1.0.45 — 2026-05-21)*
- [🚀] `bug/socialz-missing-avatars` : **Socialz Missing Avatars** - Update the Socialz page logic to properly pull and display an avatar for each skater by iterating through their available social media links if the primary one is missing. [🤖 Gemini 3.1 Pro (High)] [🧠 TBD / 5k] [💸 TBD / $0.02]

### Target: `main`
**Epic: Always Render Empty "No Section" Bucket**
*(Shipped v1.0.44 — 2026-05-20)*
- [🚀] `feat/task-engine-always-show-no-section` : **Always Render Empty "No Section" Bucket** - Task Engine: Ensure that an empty "No Section" bucket (with the "+ Add Task..." dropzone) is always rendered natively in all views (Inbox, My Tasks, Projects, etc.), even if there are zero tasks currently without a section. This allows users to instantly create a task without having to create a section first. [🤖 Gemini 1.5 Pro] [🧠 85k / 5k] [💸 $0.20 / $0.02]

### Target: `main`
**Epic: Shopify Missing Order Sync (Hotfix)**
*(Shipped v1.0.43 — 2026-05-20)*
- [🚀] `bug/shopify-missing-order-sync` : **Shopify Missing Order Sync** - Investigate why order 1043 (completed in Shopify) failed to import into the application via webhook/sync. [🤖 Gemini 1.5 Pro] [🧠 85k / 10k] [💸 $0.20 / $0.05]

### Target: `main`
**Epic: Infinite Nested Subtasks & UI Auto-Fit Density**
*(Shipped v1.0.47 — 2026-05-21)*
- [🚀] `feat/infinite-nested-subtasks` : **Infinite Nested Subtasks** - Task Engine: Support infinite nested subtasks (n-level hierarchy) and drag-and-drop subtask repositioning. [🤖 Gemini 3.1 Pro (High)] [🧠 TBD / 5k] [💸 TBD / $0.02]

### Target: `main`
**Epic: ESLint Persistent Warnings Sweep**
*(Shipped v1.0.43 — 2026-05-18)*
- [🚀] `debt/eslint-warnings-sweep` : **ESLint Warnings Sweep** - Perform a comprehensive tech debt sweep to resolve the 158 persistent `no-unused-vars` and related ESLint warnings to harden the application and clean up CI output. [🤖 AI Model] [🧠 25k / 25k] [💸 $0.08 / $0.08]

### Target: `main`
**Epic: Legacy Codebase Security Hardening (Tier 1)**
*(Generated by `/legacy_audit` — 2026-05-17)*
- [🚀] `refactor/audit-bom-module` : **Purge Inline onclick Handlers (bom-module.js)** - Migrated all inline `onclick`, `onmouseover`, and `onmouseout` handlers in the Recipe Manager UI to `data-app-click` delegators registered in `system-event-delegator.js`. Replaced inline hover styles with standard Vanilla DOM classes (`btn-blue`). [🤖 Gemini 3.1 Pro] [🧠 4.5k / 5k] [💸 $0.02 / $0.02]

### Target: `main`
**Epic: Sitewide Real-Time Sync**
*(Shipped v1.0.34 — 2026-05-16)*
- [🚀] `feat/sitewide-realtime-sync` : **Implement Sitewide Supabase Websockets** - Expand real-time synchronization globally across the entire application. Wired up `supabaseClient.channel` to listen to all core tables for `postgres_changes`. Updated local DB caches in real-time and injected UI redraws. Handled project-level section logic across personal task views. [🤖 AI Model] [🧠 22k / 25k] [💸 $0.07 / $0.08]

### Target: `main`
**Epic: Task Engine Flexibility**
*(Shipped v1.0.33 — 2026-05-16)*
- [🚀] `feat/task-engine-user-sections` : **Personalized Task Sections & Drag-and-Drop Re-parenting** - Make task sections unique per user in personal views (Inbox, My Tasks, In Progress, Completed) while keeping them uniform in organization-wide projects. Unassigned tasks (with proper section/project context) must remain visible in the Inbox. Assigned tasks and completed assigned tasks must be visible in My Tasks. Enable creating tasks under a "non assigned" section, and allow drag-and-drop to reorder tasks across sections or dynamically re-parent tasks as subtasks. [🤖 AI Model] [🧠 4k / 5k] [💸 $0.02 / $0.02]

### Target: `main`
**Epic: Asana Task Engine Overhaul**
*(Shipped v1.0.32 — 2026-05-16)*
- [🚀] `feat/asana-inline-tasks` : **Asana-style Inline Task Creation** - Refactor the Task Engine UI to support creating tasks and sections directly inline via rapid-entry rows, similar to Asana, without requiring modals or top-level dropdowns. [🤖 AI Model] [🧠 4k / 5k] [💸 $0.01 / $0.02]

### Target: `fix/ui-state-refresh`
*(Epic: UI State Persistence & Form Submission Prevention)*
- [🚀] `fix/ui-state-refresh` : **UI State Refresh Prevention** - Fix the bug where creating a new item in EDITZ (and potentially other manual entry forms) causes a full page refresh and redirects to the Stockpilez hub. Prevent default form submission behaviors across the application to ensure the user stays on the current page during manual CRUD operations. [🤖 Gemini 3.1 Pro] [🧠 4.5k / 5k] [💸 $0.02 / $0.02]

### Target: `main`
**Epic: Sandbox Engine Immersive Refactor**
*(Shipped v1.0.29 — 2026-05-04)*
- [🚀] `feat/sandbox-engine-immersive` : **Sandbox Engine Immersive Refactor** - Transformed the "Net Profit Sandbox Engine" into a full-screen immersive terminal with strict metric color-coding, overhauled the mathematical inheritance for Exchange logic, and patched the cash-basis net profit calculations. [🤖 Gemini 3.1 Pro] [🧠 15k / 10k] [💸 $0.05 / $0.05]

### Target: `main`
**Epic: Inventory History & Stability (Tier 1)**
*(Shipped v1.0.28 — 2026-05-04)*
- [🚀] `feat/cycle-count-snapshots` : **Cycle Count Snapshots & Restoration** - Implement a system to capture "point-in-time" snapshots of cycle counts, enabling history tracking and the ability to restore inventory state to a previous snapshot. [🤖 AI Model] [🧠 45k / 15k] [💸 $0.15 / $0.05]
- [🚀] `chore/dep-supabase-js` : **@supabase/supabase-js** `2.105.0` → `2.105.1` (patch). [🤖 AI Model] [🧠 1k / 1k] [💸 $0.01 / $0.01]
- [🚀] `chore/dep-eslint` : **eslint** `10.2.1` → `10.3.0` (minor). [🤖 AI Model] [🧠 1k / 1k] [💸 $0.01 / $0.01]
- [🚀] `chore/dep-supabase-cli` : **supabase** `2.95.5` → `2.98.0` (minor). [🤖 AI Model] [🧠 1k / 1k] [💸 $0.01 / $0.01]

### Target: `main`
**Epic: Vanilla JS Code Modernization (Tier 2)**
*(Generated by `/legacy_audit` — 2026-05-03)*
- [🚀] `refactor/var-to-const-let` : **Legacy var → let/const Upgrade** - Systematically upgrade all legacy `var` declarations to block-scoped `let`/`const` across all 16 production modules, verifying no hoisting-dependent logic breaks. [🤖 Gemini 3.1 Pro] [🧠 5k / 20k] [💸 $0.02 / $0.06]
- [🚀] `refactor/event-listener-cleanup` : **Event Listener Memory Leak Audit** - Add `removeEventListener` cleanup to the 10 modules missing it (task-engine, sales, scraper, orders, labelz, inventory, ceo, bom, barcodz, analytics) to prevent memory leaks on view re-renders. [🤖 Gemini 3.1 Pro] [🧠 15k / 15k] [💸 $0.05 / $0.05]

**Epic: Legacy Codebase Security Hardening (Tier 1)**
*(Generated by `/legacy_audit` — 2026-05-03)*
- [🚀] `refactor/inline-onclick-purge-production` : **Purge Inline onclick Handlers (production-module.js)** - Migrate all ~40 inline `onclick=` handlers to `data-click` delegators registered in `system-event-delegator.js`. [🤖 AI Model] [🧠 45k / 25k] [💸 $0.15 / $0.08]
- [🚀] `refactor/inline-onclick-purge-print` : **Purge Inline onclick Handlers (print-module.js)** - Migrate all ~15 inline `onclick=` handlers to `data-click` delegators. [🤖 AI Model] [🧠 25k / 15k] [💸 $0.08 / $0.05]
- [🚀] `refactor/inline-onclick-purge-packerz` : **Purge Inline onclick Handlers (packerz-module.js)** - Migrate all ~10 inline `onclick=` handlers to `data-click` delegators. [🤖 AI Model] [🧠 15k / 10k] [💸 $0.05 / $0.04]
- [🚀] `refactor/inline-onclick-purge-labelz` : **Purge Inline onclick Handlers (labelz-module.js)** - Migrate all ~10 inline `onclick=` handlers to `data-click` delegators. [🤖 AI Model] [🧠 15k / 10k] [💸 $0.05 / $0.04]
- [🚀] `refactor/inline-onclick-purge-system-tools` : **Purge Inline onclick Handlers (system-tools-module.js)** - Migrate all ~8 inline `onclick=` handlers to `data-click` delegators. [🤖 AI Model] [🧠 10k / 10k] [💸 $0.04 / $0.04]
- [🚀] `refactor/inline-onclick-purge-remaining` : **Purge Inline onclick Handlers (sales, ceo, barcodz, analytics, task-engine)** - Migrate remaining ~17 inline `onclick=` handlers across 5 smaller modules. [🤖 AI Model] [🧠 15k / 15k] [💸 $0.05 / $0.05]
- [🚀] `refactor/dompurify-coverage` : **DOMPurify Coverage Expansion** - Wrap all unguarded `.innerHTML =` assignments through `window.safeHTML()` in the 10 unprotected modules (socialz, scraper, print, packerz, orders, labelz, ceo, bom, barcodz, analytics). [🤖 Gemini 3.1 Pro] [🧠 20k / 15k] [💸 $0.06 / $0.05]

**Epic: The Task Engine (ERP Command Center)**
*(See: `@/tools/SK8Lytz_Task_Engine_Blueprint.md` for full architectural specs)*
- [🚀] `feat/task-engine-p3` : **Phase 3 (The UI Takeover)** - Build the fullscreen glassmorphism modal, the split-pane layout, and the slide-out Context Panel (Anti-Modal). *(Shipped in v.2026.05.02.2102)*
- [🚀] `feat/task-engine-p4` : **Phase 4 (Deep UX Synthesis & Command Palette)** - Implemented global Cmd+K palette and Asana/Monday-style grid architectures.
- [🚀] `feat/task-engine-p5` : **Phase 5 (Embedded UI Payloads)** - Wire up the cross-module hooks (embedding Cycle Counts and Low Stockz reports natively inside tasks).
- [🚀] `feat/task-engine-p6` : **Phase 6 (Automations & Templates)** - Build the logic that auto-spawns SOP tasks and dynamically generates children workflows. [🤖 Gemini 3.1 Pro] [🧠 15k / 20k] [💸 $0.05 / $0.06]
- [🚀] `feat/task-engine-p7` : **Phase 7 (Communication & Inbox)** - Implement the Universal Inbox triage system, nested progress rollups, and rich-text activity feeds.
- [🚀] `feat/task-engine-archive` : **Task Engine Archive** - Implement the ability to soft-delete/archive tasks, cycles, and teams, and build a dedicated Archive UI view. [🤖 AI Model] [🧠 40k / 10k] [💸 $0.15 / $0.04]
- [🚀] `feat/task-status-dropdown` : **Status Selector Refactor** - Replace the click-to-cycle logic on task status pills with a native dropdown/selector menu for precise status assignments. [🤖 AI Model] [🧠 10k / 5k] [💸 $0.05 / $0.02]
- [🚀] `feat/task-mass-status-update` : **Mass Update Task Status** - Decouple row checkboxes from individual status toggling to enable mass selection and status updating for multiple tasks simultaneously. [🤖 AI Model] [🧠 Bundled / 8k] [💸 Bundled / $0.03]
- [🚀] `feat/task-engine-sorting` : **Task Sorting & Prioritization** - Implement the ability to sort tasks globally and prioritize them (e.g., via drag-and-drop) within specific cycles. [🤖 AI Model] [🧠 15k / 10k] [💸 $0.06 / $0.04]
- [🚀] `feat/task-engine-column-sort` : **List View Column Sorting** - Enable dynamic sorting by clicking on any column header within the List/Row view (Owner, Status, Timeline, Priority). [🤖 AI Model] [🧠 5k / 5k] [💸 $0.02 / $0.02]
- [🚀] `feat/task-engine-timelines` : **Task Timelines & Calendar Sync** - Implement date picking/timelines for individual tasks and map them to render dynamically on the Calendar view. [🤖 AI Model] [🧠 8k / 8k] [💸 $0.03 / $0.03]
- [🚀] `feat/task-engine-ui-colors` : **Task Engine UI Colorization** - Inject more vibrant colors into the left sidebar pane and the top navigation of the right pane (List/Board/Calendar) to create clearer visual distinction for active states. [🤖 AI Model] [🧠 5k / 5k] [💸 $0.02 / $0.02]
- [🚀] `feat/task-engine-board-interactions` : **Task Engine Board View Interactions** - Enable full interaction, opening, and working of individual tasks directly from within the Kanban Board view. [🤖 AI Model] [🧠 5k / 10k] [💸 $0.02 / $0.04]
- [🚀] `feat/global-column-truncation` : **Global Column Truncation Standard** - Ensure all columns in data grids (like the Source column in Orderz) properly truncate with ellipsis (...) when resized too small, preventing text from overlapping adjacent columns. Document this as a global UI standard in the Master Reference and apply across all pages. [🤖 Gemini 3.1 Pro] [🧠 5.2k / 5k] [💸 $0.02 / $0.02]

### Target: `main`
- [🚀] `feat/buildz-step-time-tracking` : Build capability to track time spent on individual Buildz steps, log durations to Supabase, and display metrics in the Work Orders archive.
*(Epic: Orderz Financial Visibility)*
*(Shipped v1.0.22 — 2026-04-29)*
- [🚀] `test/actual-net-matrix-verification` : Build a test modal or verification script to validate Actual Net math across complex order combinations (e.g., unshipped items keeping revenue vs. post-ship exchanges vs. replacement exchanges without returning the original, ref: Orders 1017, 1019). [🤖 Gemini 3.1 Pro] [🧠 60k / 10k] [💸 $0.20 / $0.05]

### Target: `epic/hub-card-math-validation`
*(Epic: Hub Card Math Validation)*
- [🚀] `fix/importz-total-goods-cost` : Validate all math on the cards for all hubs, starting with investigating why the IMPORTZ card shows a massively inflated Total Goods Cost. [🤖 AI Model] [🧠 TBD / 10k] [💸 TBD / $0.05]

### Target: `main`
*(Epic: Sitewide Mathematical Verification Audit)*
- [🚀] `test/cogs-bom-rollup` : Audit recursive Bill of Materials (BOM) cost roll-ups, raw goods quantity conversions, and 3D printing time/cost algorithms to verify exact unit COGS. [🤖 Gemini 3.1 Pro] [🧠 TBD / 20k] [💸 TBD / $0.05]
- [🚀] `test/item-net-profit` : Verify item-level net profit algorithms, ensuring individual product margins correctly deduct proportional shipping, packaging weights, and gateway fees. [🤖 Gemini 3.1 Pro] [🧠 TBD / 20k] [💸 TBD / $0.05]
- [🚀] `test/global-financial-waterfall` : Thoroughly investigate global CFO Waterfall, Gross Gross Sales, Total Net Profit, Gateway Fees, Shipping, and Social Ad spend calculations for exact cross-page match. [🤖 Gemini 3.1 Pro] [🧠 TBD / 20k] [💸 TBD / $0.05]
- [🚀] `test/inventory-velocity-engine` : Audit all inventory formulas including Reorder Points (ROP), Trailing Velocity, Lead Times, and Safety Stock calculations for strict mathematical fidelity. [🤖 Gemini 3.1 Pro] [🧠 TBD / 15k] [💸 TBD / $0.04]
- [🚀] `test/sales-adjustments-audit` : Deep-dive into Sales Engine metrics: verify Pre-Ship Exchange, Post-Ship returns, and Warranty offset adjustments against the true profit ledgers. [🤖 Gemini 3.1 Pro] [🧠 TBD / 15k] [💸 TBD / $0.04]
- [🚀] `test/ltv-cac-cohort-math` : Audit Lifetime Value (LTV), Customer Acquisition Cost (CAC), repeat purchase rates, and Cohort Simulator predictive math for absolute correctness. [🤖 Gemini 3.1 Pro] [🧠 TBD / 15k] [💸 TBD / $0.04]

### Target: `main`
*(Epic: Inventory Enhancements)*
- [🚀] `feat/inventory-column-filters` : Add ability to filter columns in DATAZ and EDITZ ledgers. [🤖 AI Model] [🧠 25k / 5k] [💸 $0.08 / $0.02]

### Target: `main`
*(Epic: Socialz UI Hotfixes)*
- [🚀] `fix/socialz-blank-tab-render` : Investigate and fix the issue where the Socialz tab renders a completely blank screen instead of the expected UI. [🤖 AI Model] [🧠 40k / 5k] [💸 $0.15 / $0.02]

### Target: `main`
*(Epic: Batchez UI Fixes)*
- [🚀] `fix/batchez-sop-row-interactions` : Fix the bug in Batchez where SOP rows cannot be expanded or collapsed, and row-level print/edit buttons are unresponsive. [🤖 AI Model] [🧠 TBD / 5k] [💸 TBD / $0.02]
- [🚀] `fix/orderz-sorting-and-duplicates` : Fix the bug in Revenuez where ORDERZ columns cannot be sorted, and investigate/resolve duplicated Shopify order (#1039) from webhook payloads. [🤖 AI Model] [🧠 TBD / 5k] [💸 TBD / $0.02]

### Target: `epic/disaster-recovery`
*(Epic: Safe Database Defibrillation)*
*(Shipped v1.0.16 — 2026-04-14)*
- [🚀] `feat/schema-diff-defibrillator` : Develop the `[/schema_diff]` workflow. To eliminate database mutation anxiety, the workflow must be rigidly scoped to *Strict Read-Only Mode* to diff local `/supabase/migrations` against remote instances. Any state-mutating execution (e.g. `supabase migration repair`) must be completely isolated behind a secondary, mandatory user-authorization gate. [🤖 AI Model] [🧠 4k / 5k] [💸 $0.01 / $0.02]

### Target: `epic/workflow-architecture`
*(Epic: Agentic Orchestration Overhaul)*
*(Shipped v1.0.16 — 2026-04-14)*
- [🚀] `feat/orchestration-overhaul` : Architect and implement the unifying `[/finalize_epic]` deploy script to mitigate 3-step merge collision loops. Restructure `[/bucketlist]` branch mapping logic to prevent Phantom Ledger Divergences, and enact the global `active_context_lock.md` algorithm enforcing single-threaded AI cognitive bounds with hotfix overrides. [🤖 AI Model] [🧠 6k / 8k] [💸 $0.02 / $0.03]

### Target: `epic/agentic-evolution-ui`
*(Epic: UI & Security Hardening Automation)*
*(Shipped v1.0.16 — 2026-04-14)*
- [🚀] `feat/ui-xray-debugger` : Build the `[/ui_xray]` workflow allowing the AI to autonomously inject neon CSS borders over all flex containers to visually scan, report, and verify structural DOM overlaps without requiring human visual intervention. [🤖 AI Model] [🧠 4k / 5k] [💸 $0.01 / $0.02]
- [🚀] `feat/red-team-protocol` : Build the `[/red_team]` workflow to enforce a strict persona shift where the AI acts as a malicious Penetration Tester to proactively scan Vanilla JS modules for DOM clobbering, injection vectors, and XSS exploits prior to release. [🤖 AI Model] [🧠 TBD] [💸 TBD]
### Target: `epic/security-hardening`
*(Epic: Security Architecture Audit & Hardening)*
*(Shipped v1.0.16 — 2026-04-14)*
- [🚀] `security/infrastructure` : Executed a comprehensive repository-wide security audit utilizing `xss-risk-map.js`. Discovered and systematically remediated 230 injection vectors by wrapping them dynamically with a strict `window.safeHTML()` protocol that preserves vanilla JS UI functionality. Deployed a system-wide Content-Security-Policy (CSP) across the infrastructure locking down DOM mutations directly natively. [🤖 Gemini 3.1 Pro] [🧠 42k / 50k] [💸 $0.12 / $0.15]


### Target: `main`
*(Epic: Agentic Framework Telemetry)*
*(Shipped v1.0.14 — 2026-04-14)*
- [🚀] `feat/bucket-list-token-tracking` : Establish a visible tracking convention for LLM API token spend vs. expected spend budget directly on the Bucket List tasks and epics to monitor AI operational costs. [🤖 Gemini 3.1 Pro] [🧠 25k / 50k] [💸 $0.08 / $0.15]

### Target: `main`
*(Epic: Code Debt Hunt)*
*(Shipped v1.0.15 — 2026-04-14)*
- [🚀] `debt/css-flex-hack` : `index.html` (L327) - Review explicit CSS layout note tracked as `HACK` utilizing auto-margins for flexbox container squish centering. [🤖 Gemini 3.1 Pro] [🧠 5k / 5k] [💸 $0.02 / $0.02]

### Target: `main`
*(Epic: UI Enhancements & Fixes)*
*(Shipped v1.0.13 — 2026-04-14)*
- [🚀] `fix/cohort-intel-modal-ui` : Rebuild the Cohort Intel modal to standard ledge behavior (drag sorting), update columns (Order ID, Date, Item, Total, Net), and replace the top-right 'X' with a standard solid 'Close' rectangle button.

### Target: `main`
*(Epic: Cohort Simulator Formatting)*
*(Shipped v1.0.11 — 2026-04-13)*
- [🚀] `feat/cohort-sim-formatting` : Condensed top 6 KPIs to a single row to save vertical space. Relocated "View Cohort Intelligence" button to top right header. Fixed order-count logic to use unique Order IDs instead of line items. Expanded LTV modal to include 'Total Buyers' stat, enlarged it, and applied drag-to-sort logic to the table. Documented the new modal standards in the Master Reference.
- [🚀] `fix/header-responsive-wrap` : Fixed header `.top-controls` overlapping with `.tabs` on resize, enforcing mathematically perfect flex symmetry and min-content boundaries.

### Target: `main`
*(Epic: Automated Testing Suite)*
*(Shipped v1.0.13 — 2026-04-14)*
- [🚀] `feat/automated-test-suite` : Implemented robust Jest and JSDOM integration for zero-build vanilla JS compliance.
- [🚀] `test/math-engine` : Validated recursive BOM extraction via `calculateProductBreakdown`, Stripe fee mappings, 3D print durations, and `getHistoricalNetProfit`.
- [🚀] `test/inventory-engine` : Tested `calculateTrailingVelocity` forecasting, reconstructed the missing `getRawMaterials` function to fix a live crash, and added bounds logic for `calculateDynamicROP`.
- [🚀] `test/sales-engine` : Migrated legacy Math_Validator routines to test `Pre-Ship Exchange`, `Post-Ship returns`, and `Warranty` offset adjustments to enforce ledger fidelity.

### Target: `main`
*(Epic: Widescreen Header Consolidation)*
*(Shipped v1.0.10 — 2026-04-13)*
- [🚀] `feat/widescreen-top-bar-scroll` : Restructure the top header into a single horizontal row on widescreen displays (>1200px), with the Logo on the left, Utility Panel on the right, and the Hub Tabs (`.tabs`) freely scrolling in between using the new swiper arrows. Collapse back to the 3-row stacked view only on smaller screens (<1200px) when the hubs start to shrink too much.
- [🚀] `feat/pure-flexbox-gui-migration` : Completely rebuilt the global layout engine to utilize 100% fluid flexbox arrays safely mitigating element overlap bugs without absolute CSS overrides.

### Target: `main`
*(Epic: Tailwind Modal Migration)*
*(Shipped v1.0.6 — 2026-04-12)*
- [🚀] `chore/socialz-tailwind-purge` : Migrate the SOCIALZ Add/Edit Skater modal, LTV Metrics Modal, and Analytics Dashboard Modal from Tailwind utility classes to native Vanilla CSS / var(--*) tokens to enforce consistency with the rest of the terminal.

### Target: `main`
*(Epic: Sitewide Button State Feedback)*
*(Shipped v1.0.4 — 2026-04-12)*
- [🚀] `feat/button-progress-states` : Ensure that all save, sync, and upload buttons across the app visually reflect a progress or loading status (e.g. changing text to "Saving...", "Synced!", showing spinners) so users know an operation is processing/completed.
  - [dYs?] **Specific Hit Target**: Ensure the "EXPORT BACKUP" button in Brainz shows progress again.

### Target: `main`
*(Epic: Inventory Data Grid & ROP Management)*
*(Shipped v1.0.3 — 2026-04-12)*
- [🚀] `feat/inventory-grid-search` : Add a live search/filtering feature and column filters in the DATAZ/EDITZ ledgers (similar to the bulk edit search in Recipez).
- [🚀] `feat/raw-goods-rop-lead-times` : Create the ability to define and add ROP (Reorder Point) lead times for all individually tracked Raw Goods.

### Target: `epic/webrtc-cycle-scanner`
*(Shipped v1.0.2 — 2026-04-11)*
- [🚀] `feat/webrtc-cycle-counts` : A scanner using your iPhone camera connected natively to STOCKZ to do warehouse cycle counts rapidly.
- [🚀] `chore/cycle-count-scanner-refactor` : Migrate the Cycle Count camera scanner to use the same implementation pattern as the SOP editor scanner (which reliably launches phone camera). Ensure the WebRTC constraint logic fully supports cross-platform execution specifically for iPhone iOS Safari, native Android, and PC webcams. Ensure consistent behavior across all scanning entry points.

### Target: `epic/tech-debt-clearance`
*(Shipped Pre-v1.0.21)*
- [🚀] `debt/security` : **[HIGH] RESOLVED ✅** `xlsx` (SheetJS) CVEs Prototype Pollution + ReDoS. Audited the repo to verify it wasn't required for compilation, and effectively eradicated the NPM ghost package via `npm uninstall xlsx`. `npm audit` returned 0 vulnerabilities.
- [🚀] `debt/deps` : **RESOLVED ✅** `@supabase/supabase-js` bumped to `2.103.0`.
- [🚀] `debt/deps` : **RESOLVED ✅** `supabase` CLI bumped to `2.89.1`.
- [🚀] `debt/hmac-verification` : **RESOLVED ✅** `supabase/functions/shopify-webhook/index.ts:22` - Implemented native Deno `crypto.subtle` HMAC validation with dynamic 401 blocking. Also structurally patched the synchronous PII variables bug.
- [🚀] `debt/deps` : **RESOLVED ✅** `supabase` CLI bumped from `2.89.1` to `2.90.0`.
- [🚀] `debt/deps` : **RESOLVED ✅** Bump outdated dependencies: @supabase/supabase-js to 2.105.0, supabase CLI to 2.95.5, eslint to 10.2.1, prettier to 3.8.3. [🤖 Gemini 3.1 Pro] [🧠 5k / 5k] [💸 $0.02 / $0.02]

### Target: `epic/ltv-cac-metrics`
*(Shipped Pre-v1.0.21)*
- [🚀] `feat/historical-ltv-analysis` : Pull historical Shopify orders to find out how many people buy twice.
- [🚀] `feat/repeat-customer-engine` : Implement backend logic to digest the historical Shopify dataset and track repeat customers using anonymized metrics.
- [🚀] `feat/ltv-metrics-modal` : Design and build a new UI modal (or integrate into the CEO Terminal) to visualize Repeat Customer Rates and Lifetime Value insights.

### Target: `epic/shopify-sync-v2`
*(Shipped Pre-v1.0.21)*
- [🚀] `feat/auth-app-security` : Auth & App Security
- [🚀] `feat/orders-create-hook` : `orders/create` Inbound Edge Function
- [🚀] `feat/payload-normalization` : Payload Normalization
- [🚀] `feat/idempotent-db-insert` : Idempotent Database Insert

### Target: `epic/stockz-rop-alerts`
*(Shipped Pre-v1.0.21)*
- [🚀] `feat/inventory-velocity` : In `inventory-module.js`, calculate daily velocity of filament usage.
- [🚀] `feat/supplier-lead-time` : Hardcode a "Supplier Lead Time" (e.g., 5 days for Amazon Prime).
- [🚀] `feat/rop-warning-banner` : Build a red warning banner that flashes when stock hits `(Velocity * Lead Time) + 10% Safety`.

### Target: `epic/stockz-velocity-dashboard`
*(Shipped Pre-v1.0.21)*
- [🚀] `feat/velocityz-button` : Create a "Velocityz" button next to the Low Stockz Report.
- [🚀] `feat/velocity-forecasting-modal` : Build a forecasting modal that visualizes mathematical reorder constraints based on current raw sales velocity.
- [🚀] `feat/velocity-filters` : Add filters to slice and analyze velocity by day, week, and month.
- [🚀] `feat/sandbox-manipulation` : Enable "sandbox" manipulation where users can overwrite sold amounts to forecast hypothetical demand spikes, while strictly retaining the raw real sold velocity data unharmed.

### Target: `epic/cfo-waterfall`
*(Shipped Pre-v1.0.21)*
- [🚀] `feat/cfo-waterfall-chart` : In `ceo-module.js` (Chart.js block), build a Waterfall Chart.
- [🚀] `feat/cfo-waterfall-mapping` : Map Gross Sales → minus COGS → minus Gateway Fees (Shopify takes 2.9% + 30c) → minus Shipping Costs → minus Social Ads.

### Target: `epic/agentic-skills-evaluation`
*(Shipped Pre-v1.0.21)*
- [🚀] `chore/audit-to-skills` : Go back through all .md files and decide if any need to be migrated to `.agents/skills/`.
- [🚀] `feat/frontend-skills` : Investigate and create new .md skill files specifically tailored to a desktop-first browser-based HTML/JS application environment.

### Target: `epic/system-dependency-audit`
- [🚀] `chore/parse-dependencies` : Scan all 41 rule/workflow/skill `.md` files for references to uncreated files or folders (e.g., Cross-Reference TXTs, Master References).
- [🚀] `feat/bootstrap-missing-files` : Create the missing dependencies with as much actual payload data as expected (DB schemas, button UI tokens, etc.) to securely strap the agent to the current app state.

### Target: `epic/legacy-data-migration`
- [🚀] `chore/git-history-scan` : Search git history to recover contents of `ui_dev_stds.md` and `roadmap.md`.
- [🚀] `feat/legacy-data-integration` : Integrate recovered UI tokens into `tools/SK8Lytz_App_Master_Reference.md` and migrate roadmap ideas into `tools/SK8Lytz_Bucket_List.md`.

### Target: `epic/redundant-tools-cleanup`
- [🚀] `chore/audit-agents-tools` : Inspect `.agents/tools/` for outdated duplicates.
- [🚀] `feat/consolidate-tools` : Compare files with root `tools/` directory to resolve data divergence, delete the redundant folder, and update pointers.

### Target: `main`
*(Epic: Master Reference Compliance Audit)*
- [🚀] `chore/master-reference-compliance` : Do a complete pass of the entire running application (all modules, modals, and pages) and audit them against every rule defined in `tools/SK8Lytz_App_Master_Reference.md` — flag every divergence, document them, and produce a prioritized fix list.

### Target: `main`
*(Epic: Competitive Feature Benchmarking)*
- [🚀] `research/competitive-analysis` : Research industry-leading inventory, manufacturing, and DTC ops platforms (e.g. Cin7, Shopify, Fishbowl, inFlow, Katana MRP) — map their key features against our current STOCKPILEZ/MAKERZ/REVENUEZ capabilities and produce a prioritized list of ideas we could implement to meaningfully improve the platform.

### Target: `main`
*(Epic: Sitewide Security Audit)*
- [🚀] `chore/security-audit` : Full sitewide security audit — review Supabase RLS policies on all active tables, verify no secrets or keys are exposed client-side, audit all user-input paths for injection risks, confirm auth gate integrity, and check the public GitHub repo for any accidentally committed sensitive data.

### Target: `main`
*(Epic: Supabase CLI Repair)*
- [🚀] `chore/supabase-cli-repair` : Repair the local Supabase migration history tracking to re-sync `npx supabase db push` functionality with the remote database without destroying data, resolving the "Remote migration versions not found" tracked mismatches.

### Target: `main`
*(Epic: Sitewide Performance Optimization)*
- [🚀] `perf/global-performance-audit` : Perform a core-level performance audit and implement optimizations (e.g. DOM update batching, lazy-loading heavy modules, optimizing Supabase query counts) to ensure the webapp stays running as fast as possible.

### Target: `main`
*(Epic: Sitewide Button UI & Mobile Responsiveness)*
- [🚀] `style/global-button-spacing-mobile` : Review and refactor global button spacing on all pages and modals to ensure visual balance, utilizing flexible and dynamic CSS styling so buttons adapt perfectly for mobile environments.

### Target: `epic/agentic-workflow-tooling`
*(Epic: Agentic Workflow Tooling & QA Automation)*
- [🚀] `chore/prettier-eslint-initialization` : Setup a strict `.prettierrc` and `.eslintrc.json` in the root optimized for Vanilla ES6+ Javascript. Add NPM scrips `lint` and `format` so the AI can algorithmically sanitize the codebase and catch syntax errors pre-execution.
- [🚀] `feat/strict-jsdoc-typing` : Do a systematic pass over the core database sync modules (`sales-module.js`, `inventory-module.js`) and inject strict JSDoc typing (`/** @type {...} */`) for core data structures to mathematically prevent AI hallucination of payload shapes.
- [🚀] `feat/automated-test-suite` : Initialize a lightweight, native JavaScript automated testing suite (e.g. Jest or Playwright) that runs against the local `.js` algorithms. Provide the AI with an `npm test` script to autonomously verify complex math (like CFO waterfall algorithms) without bothering the user for manual QA.

### Target: `main`
*(Epic: Agentic Hygiene & Workflow Refactoring)*
- [🚀] `chore/agentic-rule-refactor` : Identified and repaired 5 core logical paradoxes across the agent environment. Granted `main` branch exemptions for `/release` and `/wind_down` tagging; normalized the 8-point pixel grid system to `clamp()` scaling via `modern-ui-ux.md`; fully exempted Bucket Lists and Master References from the 24/7 continuous micro-commit stream to enable graceful batch syncing; restricted the Boy Scout rule to explicit `feat/` cycles to isolate bug deployments; and officially excised the redundant `/idea_intake` workflow.

### Target: `epic/revenuez-fulfillment-expansion`
*(Epic: Revenuez Fulfillment & Cost Tracking)*
- [🚀] `feat/revenuez-fulfillment-expansion` : Intercept Shopify webhooks (orders/updated and fulfillments/create) and execute GraphQL fetches to extract tracking numbers, carriers, and exact label costs. Update the Supabase `sales_ledger` schema and modify the Revenuez UI data grid to surface this operational data directly with clickable tracking links and high-cost warnings. [🤖 AI Model] [🧠 40k / 25k] [💸 $0.15 / $0.08]

### Target: `epic/historical-data-sync`
*(Epic: Shopify Historical Backfill Engine)*
*(Shipped v1.0.30 — 2026-05-07)*
- [🚀] `feat/historical-shopify-backfill` : Architect a historical data sync engine using Shopify Custom Dev App (Admin API) to securely extract past operational data (tracking numbers, exact label costs, and carrier details) without fragile screen scraping, integrating it idempotently into the Supabase `sales_ledger`. [🤖 AI Model] [🧠 TBD / 25k] [💸 TBD / $0.08]
- [🚀] `feat/billing-csv-importer` : Build a frontend CSV importer on the CEO dashboard to ingest manual Shopify Billing exports (Billing -> Charges -> Shipping fees) and automatically match label costs to historical orders in the `sales_ledger`. [🤖 AI Model] [🧠 TBD / 25k] [💸 TBD / $0.08]
- [🚀] `feat/shopify-tag-parser` : Develop a forward-looking Webhook/Sync module to automatically extract "order type" and "shipping label cost" directly from Shopify Order Tags as they are generated, eliminating the need for future manual CSV imports. [🤖 Gemini 3.1 Pro] [🧠 15k / 25k] [💸 $0.05 / $0.08]
- [🚀] `fix/shopify-webhook-missing-data` : The active Shopify App/Webhook pipeline is missing critical data columns compared to the legacy CSV importer. Missing data includes PII hashes (`customer_email_hash`, `shipping_name_hash`), `fulfillment_status`, and `financial_status`. Must audit the Edge Function deployment versus local code, deploy the fix, and establish a backfill mechanism for missing historical data. [🤖 AI Model] [🧠 30k / 15k] [💸 $0.10 / $0.05]

### Target: `main`
*(Epic: UI Enhancements)*
*(Shipped v1.0.21 — 2026-04-29)*
- [🚀] `feat/salez-card-30d-metrics` : Change the SALEZ hub card to remove 'Unmapped Etsy' and 'Unmapped Shopify', replacing them with 'Orders (30D)' and 'Actual Net (30D)'. [🤖 AI Model] [🧠 TBD / 5k] [💸 TBD / $0.02]

### Target: `main`
*(Epic: Orderz Financial Visibility)*
- [🚀] `feat/actual-net-modal` : Build an "Actual Net" button in Orderz that launches a new modal displaying the full mathematical breakdown per order (COGS, Shipping, Taxes, Fees, Net). The modal must support expanding/collapsing line items, sorting, and live searching. [🤖 AI Model] [🧠 TBD / 10k] [💸 TBD / $0.05]

### Target: `main`
*(Epic: Shopify Flow Automation)*
*(Shipped v1.0.22 — 2026-04-29)*
- [🚀] `research/shopify-flow-auto-tag` : Investigate building a Shopify Flow that automatically tags orders with the `Label: <price>` format when a shipping label is purchased or printed, feeding natively into the webhook parser. (Finding: Impossible, relying on CSV) [🤖 Gemini 3.1 Pro] [🧠 10k / 5k] [💸 $0.03 / $0.02]

### Target: `main`
*(Epic: The Task Engine)*
*(Shipped v1.0.24 — 2026-05-02)*
- [🚀] `feat/task-engine-p1` : **Phase 1 (Multi-User Identity)** - Integrated Supabase Auth for Chris, Andy, and Tyson, and natively built the identity capture logic and UI header rendering. *(Shipped in v.2026.05.02.2013)*
- [🚀] `feat/task-engine-p2` : **Phase 2 (Database Schema)** - Execute SQL migrations for `taskz`, `cyclez`, `task_templates`, and `task_activity` tables. [🤖 Gemini 3.1 Pro] [🧠 20k / 10k] [💸 $0.05 / $0.02]

**Epic: Architecture Polish (Tier 3)**
*(Generated by `/legacy_audit` — 2026-05-03)*
- [🚀] `refactor/absolute-position-purge` : **Purge position:absolute from JS Templates** - Replace inline `position: absolute` styles in 7 modules (task-engine, system-tools, socialz, scraper, production, packerz, inventory) with flex-based CSS class alternatives. [🤖 AI Model] [🧠 45k / 15k] [💸 $0.15 / $0.05]
- [🚀] `chore/orphan-script-cleanup` : **Relocate Orphan Root Scripts** - Move 6 loose utility scripts (check_openapi.js, check_schema.js, check_ids.js, test-fetchall.js, test-supabase.js, test.js) from the project root into `tools/` or `scripts/` directories. [🤖 AI Model] [🧠 8k / 3k] [💸 $0.03 / $0.01]

### Target: `main`
*(Epic: Orderz Sandbox & Financial Logic Verification)*
*(Shipped v1.0.30 - 1.0.31 — 2026-05-07)*
- [🚀] `fix/orderz-math-parity-audit` : **Orderz Mathematical Parity Audit** - Centralized authoritative math into `neogleamz-engine.js` and verified parity across modules via `Math_Validator.js`.
- [🚀] `chore/unify-math-engine` : **Strict Mathematical Unification Mandate** - Eradicated local math engines in `sales-module.js` and `analytics-module.js`.
- [🚀] `feat/sandbox-nomenclature-audit` : **Sandbox UI Transformation Audit** - Refactored the Sandbox UI into a strict 4-Tier matrix mapping literal DB schema columns to their CSV origin headers. Eliminated "ghost value" data stripping bugs to accurately map raw shipping metrics, successfully restoring exact conditional pass logic for complex exchanges.
- [🚀] `style/sandbox-typography-spacing` : **Sandbox UI Typography & Layout Refactor** - Applied a uniform sizing structure to the numbers in the raw database snapshot and CSV row to improve readability, and shrank the vertical height of the main header to reclaim screen space.
- [🚀] `feat/live-staging-diff-highlighting` : **Live Staging DB Diff Highlighting** - Implement visual highlighting in the CSV Live Staging Sandbox for fields/totals that differ from existing database records.

### Target: `feat/editz-bulk-edit-modal`
*(Epic: EDITZ Bulk Edit System)*
*(Shipped v1.0.32 — 2026-05-16)*
- [🚀] `feat/editz-bulk-edit-modal` : **EDITZ Bulk Edit Modal** - Create a "Bulk Edit" button in the EDITZ tab that opens a fullscreen modal, letting the user search and mass edit all items. It should function like the sandbox staging environments for imports in NEXUZ, allowing the user to view and verify all changes before committing and approving the final upload. [🤖 AI Model] [🧠 4k / 20k] [💸 $0.02 / $0.05]

### Target: `main`
**Epic: Maintenance & Debt Sweep (May 17)**
*(Shipped v1.0.39 — 2026-05-17)*
- [🚀] `debt/orphan-scripts` : Clean up orphaned utility scripts and tests (Python scripts in `tools/`, `test-dompurify.js` in root, `test_supabase.js` and `Whydidthishappen.md` in `tools/`). Relocate or purge them to maintain project hygiene. [🤖 Gemini 3.1 Pro] [🧠 4k / 5k] [💸 $0.01 / $0.02]
- [🚀] `debt/npm-update` : Execute `npm update` to safely bump `dompurify`, `eslint`, `jest`, and `supabase` to their latest patch/minor versions. [🤖 Gemini 3.1 Pro] [🧠 3k / 3k] [💸 $0.01 / $0.01]



**Epic: SOP Media & Print Enhancements**
*(Shipped v1.0.36 - 1.0.38 — 2026-05-17)*
- [🚀] `chore/root-structure-cleanup` : **Project Structure Cleanup & Organization** - Clean up and organize the whole project structure. Ensure that leftover/test files in the root are either deleted or moved to proper directories, and establish a clear folder structure for everything to prevent random files accumulating in the root. [🤖 AI Model] [🧠 5k / 5k] [💸 $0.02 / $0.02]
- [🚀] `feat/sop-camera-integration` : **WebRTC Camera Integration for SOPs** - Integrate the WebRTC camera functionality (currently used for cycle counts) into the SOP editor and active SOP worker views. Allow users to natively take physical photos of their work in progress, automatically upload the image assets to Supabase Storage, and inject the direct image link into the active SOP document/step. [🤖 AI Model] [🧠 TBD / 25k] [💸 TBD / $0.08]
- [🚀] `fix/sop-legacy-media-regression` : **SOP Legacy Media Regression** - Only the new photo functionality works; old documents, images, and videos in SOPs are broken. [🤖 AI Model] [🧠 10k / 10k] [💸 $0.05 / $0.05]
- [🚀] `feat/sop-direct-file-upload` : **SOP Direct File Upload** - Implement direct file uploading to Supabase Storage for both checklist items and rich text attachments. Also repair/replace the non-functional "MEDIA" button in the checklist to utilize this new upload flow. [🤖 AI Model] [🧠 15k / 15k] [💸 $0.06 / $0.06]
- [🚀] `feat/sop-print-formatting-options` : **SOP Print Formatting Options** - Replaced the static "Print SOP" button with a 3-mode print modal (Checklist / Rich Text / Full SOP). Applied proper print styling to checklists (`#Headers` → section headings, `> Subtexts` → styled callouts). Standardized all 4 SOP button bars (Master Production, Master Packerz, Inline Packerz, Inline Batchez) into compact responsive pill rows. Fixed Rich Text toolbar flex overflow — `rt-toolbar` now wraps gracefully, font-size select is clamped, PHOTO/UPLOAD/NEW URL row uses `flex-wrap:wrap`. Eliminated 2 duplicate `no-duplicate-case` ESLint errors in `system-event-delegator.js` via Boy Scout protocol. [🤖 Gemini 2.5 Pro] [🧠 ~180k / 15k] [💸 ~$0.54 / $0.05]

### Target: `main`
**Epic: Theme Engine Polish (May 17)**
*(Shipped v1.0.41 — 2026-05-17)*
- [🚀] `fix/light-dark-mode-button` : **Fix Light/Dark Mode Button & Tasks UI** - Removed duplicate toggleTheme function that broke the dark mode button, and restyled the Tasks button/badge to purple to distinguish from Logout red. [🤖 Gemini 3.1 Pro (High)] [🧠 6k / 5k] [💸 0.02 / $0.02]
### Target: `main`
**Epic: XSS Security Audit (May 17)**
*(Shipped v1.0.42 — 2026-05-17)*
- [🚀] `debt/xss-vulnerabilities` : **Unguarded innerHTML Assignments** - Wrapped all dynamic `error.message` injections in `index.html` with `window.safeHTML()` protocol to prevent XSS payloads. [🤖 Gemini 3.1 Pro] [🧠 8k / 5k] [💸 $0.03 / $0.02]

### Target: `main`
**Epic: Global ESLint Hardening**
*(Shipped v1.0.42 — 2026-05-17)*
- [🚀] `debt/eslint-sweep` : **Resolve Legacy no-undef Warnings** - Systematically audited and resolved the ~2,131 `no-undef` ESLint warnings globally across the Vanilla JS codebase to harden module architectures and enforce strict browser-sandbox scoping. [🤖 Gemini 3.1 Pro] [🧠 25k / 25k] [💸 $0.05 / $0.05]

### Target: `main`
**Epic: Webhook Idempotency & Race Condition Fix**
*(Shipped v1.0.40 — 2026-05-17)*
- [🚀] `fix/webhook-idempotency` : **Webhook Idempotency Race Condition Fix** - Refactored the Shopify orders/create Edge Function to aggregate identical line items organically, and implemented a strict UNIQUE(order_id, storefront_sku) constraint to the PostgreSQL sales_ledger to guarantee mathematical parity during simultaneous webhook triggers. [🤖 Gemini 3.1 Pro] [🧠 20k / 20k] [💸 .05 / .05]

### Target: `main`
**Epic: Task Engine Routing Bugs**
*(Shipped v.2026.05.17.2248 — 2026-05-17)*
- [🚀] `fix/task-modal-routing` : **Fix Task Modal Inbox Routing** - When using CTRL+K to open the global task modal, clicking the "go to inbox and create new task" button fails to route the user, while the "manage tags" button routes correctly. Needs DOM routing repair. [🤖 Gemini] [🧠 4.5k / 5k] [💸 $0.01 / $0.02]

### Target: `main`
**Epic: Task Engine Project Section Colors**
*(Shipped v1.0.43 — 2026-05-18)*
- [🚀] `feat/task-engine-project-section-colors` : **Task Engine Project Section Colors** - Update the task engine UI so that when viewing a project, the sections are the same color as the color picked for that project. [🤖 Gemini 3.1 Pro (High)] [🧠 4k / 5k] [💸 $0.01 / $0.02]

### Target: `main`
**Epic: Recommission Avatar Engine**
*(Completed — 2026-05-22)*
- [🚀] `feat/unavatar-supabase-sync` : **Recommission Avatar Engine** - Re-enable the Avatar Migration Engine to fetch missing skater avatars from unavatar.io, permanently upload the image blob to Supabase Storage, and update the DB URL to completely remove external API reliance. [🤖 Antigravity] [🧠 4k / 5k] [💸 $0.01 / $0.02]

### Target: `main`
**Epic: Socialz Cards Flex & Scaling Fix**
*(Shipped v1.1.2 — 2026-05-24)*
- [🚀] style/socialz-cards-flex-scaling : **Socialz Cards Flex & Scaling Fix** - Fix the issue where the Socialz tab cards do not flex or scale correctly (the right side gets chopped off) when scaled down before snapping to 2 cards. [🤖 Antigravity] [🧠 TBD / 5k] [💸 TBD / $0.02]

### Target: `main`
**Epic: SOP Editor Checklist Photo Bug**
*(Archived — 2026-05-28)*
- [🚀] bug/sop-editor-photo-checklist : **SOP Editor Checklist Photo & Add Step Fixes** - Fix the photo button on the checklist side of all SOP editors, resolve the broken bottom "+ ADD PROCEDURE STEP" button ReferenceError/TypeError regressions, and ensure step rows save successfully even with empty rich text instructions if media attachments exist. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]

### Target: `bug/labelz-dropdown-categorization`
**Epic: Custom Label Dropdown Categorization**
*(Archived — 2026-05-28)*
- [🚀] `bug/labelz-dropdown-categorization` : **Custom Label Dropdown Categorization** - Refactor populateDropdowns() in index.html to group custom labels (is_label: true) under a dedicated 'Custom Labels' optgroup rather than falling through to Retail Products, and add them to secondary dropdowns like batch builds and aliases. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]

### Target: `feat/stockz-raw-inventory-upgrades`
**Epic: STOCKZ Raw Inventory Grid Upgrades**
*(Shipped v1.3.3 — 2026-05-31)*
- [🚀] `feat/stockz-raw-inventory-upgrades` : **STOCKZ Raw Inventory Grid Upgrades** - Implement global search, inline column-level filtering, focus-range preservation, and a Neogleamz Product column mapping for the Raw Inventory grid. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]

### Target: `main`
**Epic: Escape Double Quotes in DOM Interpolation**
*(Archived — 2026-06-02)*
- [🚀] `fix/recipe-quotes` : **Escape Double Quotes in DOM Interpolation** - Fix the UI breaking bug when rendering product names with double quotes in the Recipez pane.
- [🚀] `debt/eslint-warnings-sweep-2` : Resolve the 13 ESLint warnings across packerz, production-module, and system-realtime-sync to achieve a completely silent terminal.

### Target: `main`
**Epic: Barcode Engine Hardening**
*(Archived — 2026-06-02)*
- [🚀] `fix/cycle-count-camera` : **Dynamic WebRTC Scan Bounds** - Refactor the HTML5-QRCode instantiation parameters inside Inventory and Packerz modules to dynamically calculate the `qrbox` targeting matrix based on active viewport scale, preventing catastrophic scanner dropouts on mobile screens. (Plan: [docs/plans/fix/cycle-count-camera.md](file:///d:/GitHub/neogleamz.github.io/docs/plans/fix/cycle-count-camera.md))

### Target: `main`
**Epic: Packerz Assembly Verification Modal**
*(Archived — 2026-06-02)*
- [🚀] feat/packerz-assembly-modal : **Packerz Assembly Modal** - Replace native confirm dialog with rich Vanilla JS verification modal. (Plan: [docs/plans/packerz_assembly_modal.md](file:///d:/GitHub/neogleamz.github.io/docs/plans/packerz_assembly_modal.md))
- [🚀] `feat/velocity-filters` : Add filters to slice and analyze velocity by day, week, and month.
- [🚀] `feat/sandbox-manipulation` : Enable "sandbox" manipulation where users can overwrite sold amounts to forecast hypothetical demand spikes, while strictly retaining the raw real sold velocity data unharmed.

### Target: `epic/cfo-waterfall`
*(Shipped Pre-v1.0.21)*
- [🚀] `feat/cfo-waterfall-chart` : In `ceo-module.js` (Chart.js block), build a Waterfall Chart.
- [🚀] `feat/cfo-waterfall-mapping` : Map Gross Sales → minus COGS → minus Gateway Fees (Shopify takes 2.9% + 30c) → minus Shipping Costs → minus Social Ads.

### Target: `epic/agentic-skills-evaluation`
*(Shipped Pre-v1.0.21)*
- [🚀] `chore/audit-to-skills` : Go back through all .md files and decide if any need to be migrated to `.agents/skills/`.
- [🚀] `feat/frontend-skills` : Investigate and create new .md skill files specifically tailored to a desktop-first browser-based HTML/JS application environment.

### Target: `epic/system-dependency-audit`
- [🚀] `chore/parse-dependencies` : Scan all 41 rule/workflow/skill `.md` files for references to uncreated files or folders (e.g., Cross-Reference TXTs, Master References).
- [🚀] `feat/bootstrap-missing-files` : Create the missing dependencies with as much actual payload data as expected (DB schemas, button UI tokens, etc.) to securely strap the agent to the current app state.

### Target: `epic/legacy-data-migration`
- [🚀] `chore/git-history-scan` : Search git history to recover contents of `ui_dev_stds.md` and `roadmap.md`.
- [🚀] `feat/legacy-data-integration` : Integrate recovered UI tokens into `tools/SK8Lytz_App_Master_Reference.md` and migrate roadmap ideas into `tools/SK8Lytz_Bucket_List.md`.

### Target: `epic/redundant-tools-cleanup`
- [🚀] `chore/audit-agents-tools` : Inspect `.agents/tools/` for outdated duplicates.
- [🚀] `feat/consolidate-tools` : Compare files with root `tools/` directory to resolve data divergence, delete the redundant folder, and update pointers.

### Target: `main`
*(Epic: Master Reference Compliance Audit)*
- [🚀] `chore/master-reference-compliance` : Do a complete pass of the entire running application (all modules, modals, and pages) and audit them against every rule defined in `tools/SK8Lytz_App_Master_Reference.md` — flag every divergence, document them, and produce a prioritized fix list.

### Target: `main`
*(Epic: Competitive Feature Benchmarking)*
- [🚀] `research/competitive-analysis` : Research industry-leading inventory, manufacturing, and DTC ops platforms (e.g. Cin7, Shopify, Fishbowl, inFlow, Katana MRP) — map their key features against our current STOCKPILEZ/MAKERZ/REVENUEZ capabilities and produce a prioritized list of ideas we could implement to meaningfully improve the platform.

### Target: `main`
*(Epic: Sitewide Security Audit)*
- [🚀] `chore/security-audit` : Full sitewide security audit — review Supabase RLS policies on all active tables, verify no secrets or keys are exposed client-side, audit all user-input paths for injection risks, confirm auth gate integrity, and check the public GitHub repo for any accidentally committed sensitive data.

### Target: `main`
*(Epic: Supabase CLI Repair)*
- [🚀] `chore/supabase-cli-repair` : Repair the local Supabase migration history tracking to re-sync `npx supabase db push` functionality with the remote database without destroying data, resolving the "Remote migration versions not found" tracked mismatches.

### Target: `main`
*(Epic: Sitewide Performance Optimization)*
- [🚀] `perf/global-performance-audit` : Perform a core-level performance audit and implement optimizations (e.g. DOM update batching, lazy-loading heavy modules, optimizing Supabase query counts) to ensure the webapp stays running as fast as possible.

### Target: `main`
*(Epic: Sitewide Button UI & Mobile Responsiveness)*
- [🚀] `style/global-button-spacing-mobile` : Review and refactor global button spacing on all pages and modals to ensure visual balance, utilizing flexible and dynamic CSS styling so buttons adapt perfectly for mobile environments.

### Target: `epic/agentic-workflow-tooling`
*(Epic: Agentic Workflow Tooling & QA Automation)*
- [🚀] `chore/prettier-eslint-initialization` : Setup a strict `.prettierrc` and `.eslintrc.json` in the root optimized for Vanilla ES6+ Javascript. Add NPM scrips `lint` and `format` so the AI can algorithmically sanitize the codebase and catch syntax errors pre-execution.
- [🚀] `feat/strict-jsdoc-typing` : Do a systematic pass over the core database sync modules (`sales-module.js`, `inventory-module.js`) and inject strict JSDoc typing (`/** @type {...} */`) for core data structures to mathematically prevent AI hallucination of payload shapes.
- [🚀] `feat/automated-test-suite` : Initialize a lightweight, native JavaScript automated testing suite (e.g. Jest or Playwright) that runs against the local `.js` algorithms. Provide the AI with an `npm test` script to autonomously verify complex math (like CFO waterfall algorithms) without bothering the user for manual QA.

### Target: `main`
*(Epic: Agentic Hygiene & Workflow Refactoring)*
- [🚀] `chore/agentic-rule-refactor` : Identified and repaired 5 core logical paradoxes across the agent environment. Granted `main` branch exemptions for `/release` and `/wind_down` tagging; normalized the 8-point pixel grid system to `clamp()` scaling via `modern-ui-ux.md`; fully exempted Bucket Lists and Master References from the 24/7 continuous micro-commit stream to enable graceful batch syncing; restricted the Boy Scout rule to explicit `feat/` cycles to isolate bug deployments; and officially excised the redundant `/idea_intake` workflow.

### Target: `epic/revenuez-fulfillment-expansion`
*(Epic: Revenuez Fulfillment & Cost Tracking)*
- [🚀] `feat/revenuez-fulfillment-expansion` : Intercept Shopify webhooks (orders/updated and fulfillments/create) and execute GraphQL fetches to extract tracking numbers, carriers, and exact label costs. Update the Supabase `sales_ledger` schema and modify the Revenuez UI data grid to surface this operational data directly with clickable tracking links and high-cost warnings. [🤖 AI Model] [🧠 40k / 25k] [💸 $0.15 / $0.08]

### Target: `epic/historical-data-sync`
*(Epic: Shopify Historical Backfill Engine)*
*(Shipped v1.0.30 — 2026-05-07)*
- [🚀] `feat/historical-shopify-backfill` : Architect a historical data sync engine using Shopify Custom Dev App (Admin API) to securely extract past operational data (tracking numbers, exact label costs, and carrier details) without fragile screen scraping, integrating it idempotently into the Supabase `sales_ledger`. [🤖 AI Model] [🧠 TBD / 25k] [💸 TBD / $0.08]
- [🚀] `feat/billing-csv-importer` : Build a frontend CSV importer on the CEO dashboard to ingest manual Shopify Billing exports (Billing -> Charges -> Shipping fees) and automatically match label costs to historical orders in the `sales_ledger`. [🤖 AI Model] [🧠 TBD / 25k] [💸 TBD / $0.08]
- [🚀] `feat/shopify-tag-parser` : Develop a forward-looking Webhook/Sync module to automatically extract "order type" and "shipping label cost" directly from Shopify Order Tags as they are generated, eliminating the need for future manual CSV imports. [🤖 Gemini 3.1 Pro] [🧠 15k / 25k] [💸 $0.05 / $0.08]
- [🚀] `fix/shopify-webhook-missing-data` : The active Shopify App/Webhook pipeline is missing critical data columns compared to the legacy CSV importer. Missing data includes PII hashes (`customer_email_hash`, `shipping_name_hash`), `fulfillment_status`, and `financial_status`. Must audit the Edge Function deployment versus local code, deploy the fix, and establish a backfill mechanism for missing historical data. [🤖 AI Model] [🧠 30k / 15k] [💸 $0.10 / $0.05]

### Target: `main`
*(Epic: UI Enhancements)*
*(Shipped v1.0.21 — 2026-04-29)*
- [🚀] `feat/salez-card-30d-metrics` : Change the SALEZ hub card to remove 'Unmapped Etsy' and 'Unmapped Shopify', replacing them with 'Orders (30D)' and 'Actual Net (30D)'. [🤖 AI Model] [🧠 TBD / 5k] [💸 TBD / $0.02]

### Target: `main`
*(Epic: Orderz Financial Visibility)*
- [🚀] `feat/actual-net-modal` : Build an "Actual Net" button in Orderz that launches a new modal displaying the full mathematical breakdown per order (COGS, Shipping, Taxes, Fees, Net). The modal must support expanding/collapsing line items, sorting, and live searching. [🤖 AI Model] [🧠 TBD / 10k] [💸 TBD / $0.05]

### Target: `main`
*(Epic: Shopify Flow Automation)*
*(Shipped v1.0.22 — 2026-04-29)*
- [🚀] `research/shopify-flow-auto-tag` : Investigate building a Shopify Flow that automatically tags orders with the `Label: <price>` format when a shipping label is purchased or printed, feeding natively into the webhook parser. (Finding: Impossible, relying on CSV) [🤖 Gemini 3.1 Pro] [🧠 10k / 5k] [💸 $0.03 / $0.02]

### Target: `main`
*(Epic: The Task Engine)*
*(Shipped v1.0.24 — 2026-05-02)*
- [🚀] `feat/task-engine-p1` : **Phase 1 (Multi-User Identity)** - Integrated Supabase Auth for Chris, Andy, and Tyson, and natively built the identity capture logic and UI header rendering. *(Shipped in v.2026.05.02.2013)*
- [🚀] `feat/task-engine-p2` : **Phase 2 (Database Schema)** - Execute SQL migrations for `taskz`, `cyclez`, `task_templates`, and `task_activity` tables. [🤖 Gemini 3.1 Pro] [🧠 20k / 10k] [💸 $0.05 / $0.02]

**Epic: Architecture Polish (Tier 3)**
*(Generated by `/legacy_audit` — 2026-05-03)*
- [🚀] `refactor/absolute-position-purge` : **Purge position:absolute from JS Templates** - Replace inline `position: absolute` styles in 7 modules (task-engine, system-tools, socialz, scraper, production, packerz, inventory) with flex-based CSS class alternatives. [🤖 AI Model] [🧠 45k / 15k] [💸 $0.15 / $0.05]
- [🚀] `chore/orphan-script-cleanup` : **Relocate Orphan Root Scripts** - Move 6 loose utility scripts (check_openapi.js, check_schema.js, check_ids.js, test-fetchall.js, test-supabase.js, test.js) from the project root into `tools/` or `scripts/` directories. [🤖 AI Model] [🧠 8k / 3k] [💸 $0.03 / $0.01]

### Target: `main`
*(Epic: Orderz Sandbox & Financial Logic Verification)*
*(Shipped v1.0.30 - 1.0.31 — 2026-05-07)*
- [🚀] `fix/orderz-math-parity-audit` : **Orderz Mathematical Parity Audit** - Centralized authoritative math into `neogleamz-engine.js` and verified parity across modules via `Math_Validator.js`.
- [🚀] `chore/unify-math-engine` : **Strict Mathematical Unification Mandate** - Eradicated local math engines in `sales-module.js` and `analytics-module.js`.
- [🚀] `feat/sandbox-nomenclature-audit` : **Sandbox UI Transformation Audit** - Refactored the Sandbox UI into a strict 4-Tier matrix mapping literal DB schema columns to their CSV origin headers. Eliminated "ghost value" data stripping bugs to accurately map raw shipping metrics, successfully restoring exact conditional pass logic for complex exchanges.
- [🚀] `style/sandbox-typography-spacing` : **Sandbox UI Typography & Layout Refactor** - Applied a uniform sizing structure to the numbers in the raw database snapshot and CSV row to improve readability, and shrank the vertical height of the main header to reclaim screen space.
- [🚀] `feat/live-staging-diff-highlighting` : **Live Staging DB Diff Highlighting** - Implement visual highlighting in the CSV Live Staging Sandbox for fields/totals that differ from existing database records.

### Target: `feat/editz-bulk-edit-modal`
*(Epic: EDITZ Bulk Edit System)*
*(Shipped v1.0.32 — 2026-05-16)*
- [🚀] `feat/editz-bulk-edit-modal` : **EDITZ Bulk Edit Modal** - Create a "Bulk Edit" button in the EDITZ tab that opens a fullscreen modal, letting the user search and mass edit all items. It should function like the sandbox staging environments for imports in NEXUZ, allowing the user to view and verify all changes before committing and approving the final upload. [🤖 AI Model] [🧠 4k / 20k] [💸 $0.02 / $0.05]

### Target: `main`
**Epic: Maintenance & Debt Sweep (May 17)**
*(Shipped v1.0.39 — 2026-05-17)*
- [🚀] `debt/orphan-scripts` : Clean up orphaned utility scripts and tests (Python scripts in `tools/`, `test-dompurify.js` in root, `test_supabase.js` and `Whydidthishappen.md` in `tools/`). Relocate or purge them to maintain project hygiene. [🤖 Gemini 3.1 Pro] [🧠 4k / 5k] [💸 $0.01 / $0.02]
- [🚀] `debt/npm-update` : Execute `npm update` to safely bump `dompurify`, `eslint`, `jest`, and `supabase` to their latest patch/minor versions. [🤖 Gemini 3.1 Pro] [🧠 3k / 3k] [💸 $0.01 / $0.01]



**Epic: SOP Media & Print Enhancements**
*(Shipped v1.0.36 - 1.0.38 — 2026-05-17)*
- [🚀] `chore/root-structure-cleanup` : **Project Structure Cleanup & Organization** - Clean up and organize the whole project structure. Ensure that leftover/test files in the root are either deleted or moved to proper directories, and establish a clear folder structure for everything to prevent random files accumulating in the root. [🤖 AI Model] [🧠 5k / 5k] [💸 $0.02 / $0.02]
- [🚀] `feat/sop-camera-integration` : **WebRTC Camera Integration for SOPs** - Integrate the WebRTC camera functionality (currently used for cycle counts) into the SOP editor and active SOP worker views. Allow users to natively take physical photos of their work in progress, automatically upload the image assets to Supabase Storage, and inject the direct image link into the active SOP document/step. [🤖 AI Model] [🧠 TBD / 25k] [💸 TBD / $0.08]
- [🚀] `fix/sop-legacy-media-regression` : **SOP Legacy Media Regression** - Only the new photo functionality works; old documents, images, and videos in SOPs are broken. [🤖 AI Model] [🧠 10k / 10k] [💸 $0.05 / $0.05]
- [🚀] `feat/sop-direct-file-upload` : **SOP Direct File Upload** - Implement direct file uploading to Supabase Storage for both checklist items and rich text attachments. Also repair/replace the non-functional "MEDIA" button in the checklist to utilize this new upload flow. [🤖 AI Model] [🧠 15k / 15k] [💸 $0.06 / $0.06]
- [🚀] `feat/sop-print-formatting-options` : **SOP Print Formatting Options** - Replaced the static "Print SOP" button with a 3-mode print modal (Checklist / Rich Text / Full SOP). Applied proper print styling to checklists (`#Headers` → section headings, `> Subtexts` → styled callouts). Standardized all 4 SOP button bars (Master Production, Master Packerz, Inline Packerz, Inline Batchez) into compact responsive pill rows. Fixed Rich Text toolbar flex overflow — `rt-toolbar` now wraps gracefully, font-size select is clamped, PHOTO/UPLOAD/NEW URL row uses `flex-wrap:wrap`. Eliminated 2 duplicate `no-duplicate-case` ESLint errors in `system-event-delegator.js` via Boy Scout protocol. [🤖 Gemini 2.5 Pro] [🧠 ~180k / 15k] [💸 ~$0.54 / $0.05]

### Target: `main`
**Epic: Theme Engine Polish (May 17)**
*(Shipped v1.0.41 — 2026-05-17)*
- [🚀] `fix/light-dark-mode-button` : **Fix Light/Dark Mode Button & Tasks UI** - Removed duplicate toggleTheme function that broke the dark mode button, and restyled the Tasks button/badge to purple to distinguish from Logout red. [🤖 Gemini 3.1 Pro (High)] [🧠 6k / 5k] [💸 0.02 / $0.02]
### Target: `main`
**Epic: XSS Security Audit (May 17)**
*(Shipped v1.0.42 — 2026-05-17)*
- [🚀] `debt/xss-vulnerabilities` : **Unguarded innerHTML Assignments** - Wrapped all dynamic `error.message` injections in `index.html` with `window.safeHTML()` protocol to prevent XSS payloads. [🤖 Gemini 3.1 Pro] [🧠 8k / 5k] [💸 $0.03 / $0.02]

### Target: `main`
**Epic: Global ESLint Hardening**
*(Shipped v1.0.42 — 2026-05-17)*
- [🚀] `debt/eslint-sweep` : **Resolve Legacy no-undef Warnings** - Systematically audited and resolved the ~2,131 `no-undef` ESLint warnings globally across the Vanilla JS codebase to harden module architectures and enforce strict browser-sandbox scoping. [🤖 Gemini 3.1 Pro] [🧠 25k / 25k] [💸 $0.05 / $0.05]

### Target: `main`
**Epic: Webhook Idempotency & Race Condition Fix**
*(Shipped v1.0.40 — 2026-05-17)*
- [🚀] `fix/webhook-idempotency` : **Webhook Idempotency Race Condition Fix** - Refactored the Shopify orders/create Edge Function to aggregate identical line items organically, and implemented a strict UNIQUE(order_id, storefront_sku) constraint to the PostgreSQL sales_ledger to guarantee mathematical parity during simultaneous webhook triggers. [🤖 Gemini 3.1 Pro] [🧠 20k / 20k] [💸 .05 / .05]

### Target: `main`
**Epic: Task Engine Routing Bugs**
*(Shipped v.2026.05.17.2248 — 2026-05-17)*
- [🚀] `fix/task-modal-routing` : **Fix Task Modal Inbox Routing** - When using CTRL+K to open the global task modal, clicking the "go to inbox and create new task" button fails to route the user, while the "manage tags" button routes correctly. Needs DOM routing repair. [🤖 Gemini] [🧠 4.5k / 5k] [💸 $0.01 / $0.02]

### Target: `main`
**Epic: Task Engine Project Section Colors**
*(Shipped v1.0.43 — 2026-05-18)*
- [🚀] `feat/task-engine-project-section-colors` : **Task Engine Project Section Colors** - Update the task engine UI so that when viewing a project, the sections are the same color as the color picked for that project. [🤖 Gemini 3.1 Pro (High)] [🧠 4k / 5k] [💸 $0.01 / $0.02]

### Target: `main`
**Epic: Recommission Avatar Engine**
*(Completed — 2026-05-22)*
- [🚀] `feat/unavatar-supabase-sync` : **Recommission Avatar Engine** - Re-enable the Avatar Migration Engine to fetch missing skater avatars from unavatar.io, permanently upload the image blob to Supabase Storage, and update the DB URL to completely remove external API reliance. [🤖 Antigravity] [🧠 4k / 5k] [💸 $0.01 / $0.02]

### Target: `main`
**Epic: Socialz Cards Flex & Scaling Fix**
*(Shipped v1.1.2 — 2026-05-24)*
- [🚀] style/socialz-cards-flex-scaling : **Socialz Cards Flex & Scaling Fix** - Fix the issue where the Socialz tab cards do not flex or scale correctly (the right side gets chopped off) when scaled down before snapping to 2 cards. [🤖 Antigravity] [🧠 TBD / 5k] [💸 TBD / $0.02]

### Target: `main`
**Epic: SOP Editor Checklist Photo Bug**
*(Archived — 2026-05-28)*
- [🚀] bug/sop-editor-photo-checklist : **SOP Editor Checklist Photo & Add Step Fixes** - Fix the photo button on the checklist side of all SOP editors, resolve the broken bottom "+ ADD PROCEDURE STEP" button ReferenceError/TypeError regressions, and ensure step rows save successfully even with empty rich text instructions if media attachments exist. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]

### Target: `bug/labelz-dropdown-categorization`
**Epic: Custom Label Dropdown Categorization**
*(Archived — 2026-05-28)*
- [🚀] `bug/labelz-dropdown-categorization` : **Custom Label Dropdown Categorization** - Refactor populateDropdowns() in index.html to group custom labels (is_label: true) under a dedicated 'Custom Labels' optgroup rather than falling through to Retail Products, and add them to secondary dropdowns like batch builds and aliases. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]

### Target: `feat/stockz-raw-inventory-upgrades`
**Epic: STOCKZ Raw Inventory Grid Upgrades**
*(Shipped v1.3.3 — 2026-05-31)*
- [🚀] `feat/stockz-raw-inventory-upgrades` : **STOCKZ Raw Inventory Grid Upgrades** - Implement global search, inline column-level filtering, focus-range preservation, and a Neogleamz Product column mapping for the Raw Inventory grid. [🤖 Antigravity] [🟢 COMPLETE] [✅ Passed]

### Target: `main`
**Epic: Escape Double Quotes in DOM Interpolation**
*(Archived — 2026-06-02)*
- [🚀] `fix/recipe-quotes` : **Escape Double Quotes in DOM Interpolation** - Fix the UI breaking bug when rendering product names with double quotes in the Recipez pane.
- [🚀] `debt/eslint-warnings-sweep-2` : Resolve the 13 ESLint warnings across packerz, production-module, and system-realtime-sync to achieve a completely silent terminal.

### Target: `main`
**Epic: Barcode Engine Hardening**
*(Archived — 2026-06-02)*
- [🚀] `fix/cycle-count-camera` : **Dynamic WebRTC Scan Bounds** - Refactor the HTML5-QRCode instantiation parameters inside Inventory and Packerz modules to dynamically calculate the `qrbox` targeting matrix based on active viewport scale, preventing catastrophic scanner dropouts on mobile screens. (Plan: [docs/plans/fix/cycle-count-camera.md](file:///d:/GitHub/neogleamz.github.io/docs/plans/fix/cycle-count-camera.md))

### Target: `main`
**Epic: Packerz Assembly Verification Modal**
*(Archived — 2026-06-02)*
- [🚀] feat/packerz-assembly-modal : **Packerz Assembly Modal** - Replace native confirm dialog with rich Vanilla JS verification modal. (Plan: [docs/plans/packerz_assembly_modal.md](file:///d:/GitHub/neogleamz.github.io/docs/plans/packerz_assembly_modal.md))

### Target: `main`
**Epic: Shopify Exchange & Return Reconciliation**
*(Archived — 2026-06-30)*
- [🚀] `fix/shopify-exchange-reconciliation` : **Shopify Exchange & Return Reconciliation** - Resolve the double-counting of quantities and revenue on Shopify exchanges and returns. Ensure returned line items subtract their refunded quantities at the database webhook level and CSV import level. (Plan: [shopify_exchange_reconciliation.md](file:///d:/GitHub/neogleamz.github.io/docs/plans/shopify_exchange_reconciliation.md))

