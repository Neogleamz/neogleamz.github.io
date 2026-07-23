# Implementation Plan: debt/master-reference-doc-sync

## Task Summary
`tools/SK8Lytz_App_Master_Reference.md` describes a retired DOM id (`cycleCountManagerModal`) and its retired required child element (`#barcode-reader`) as the live STOCKZ scanner UI. Neither exists in the app anymore. The live modal is `stockzAuditModal` (index.html:6359) and the live reader element is `stockzAuditLocalReader` (index.html:6626 / inventory-module.js:2343). This is a pure documentation-truth fix: no application code changes, no schema/RLS changes, no new render surface.

## Independent Verification (confirms explore-mapper + task description)

| Claim | Verified |
|---|---|
| No `cycleCountManagerModal` DOM element anywhere in repo | Confirmed via grep — only hits are inside `tools/SK8Lytz_App_Master_Reference.md`, `tools/SK8Lytz_Bucket_List.md`, `docs/ARCHITECTURE.md`, and `docs/reports/master-reference-compliance-audit.md` (all prose/docs, zero `id="cycleCountManagerModal"` in any `.html`/`.js`). |
| `window.openCycleCountManager` / `window.closeCycleCountManager` are compatibility aliases | Confirmed at `assets/js/inventory-module.js:2148-2154` — they forward to `window.openStockzAuditModal('', 'audit')` / `window.closeStockzAuditModal()`. Still live call sites exist (e.g. `inventory-module.js:1478` calls `window.closeCycleCountManager()` from the mobile-bridge realtime channel handler), so the aliases must NOT be deleted — this task only touches the Markdown doc. |
| Live modal is `stockzAuditModal` | Confirmed at `index.html:6359`. |
| Live reader element is `stockzAuditLocalReader` | Confirmed at `index.html:6626`, instantiated at `assets/js/inventory-module.js:2343` (`new Html5Qrcode("stockzAuditLocalReader")`). |
| `Html5Qrcode.start()` still passes `{ aspectRatio: 1.0 }` | Confirmed at `assets/js/inventory-module.js:2369` and `:2397` (both `startStockzAuditWebcam` and `startStockzAuditWebcamWithDevice`). The iOS zoom-bug knowledge in the Master Reference remains technically accurate — only the DOM id it names is stale. |
| Lines 300-323 and 430-454 are verbatim-duplicated sections | Confirmed. Section headers "H. The Sandbox Preview Enforcer" (305 / 433), "I. Scraper Foundry" (310 / 438), and "I. WebRTC Scanner Layouts & iOS Compatibility" (314-318 / 442-446) are word-for-word identical blocks. Lines 316 and 444 are the two copies of the same "Aspect Ratio Hardware Constraint" bullet. |
| `tools/remote-scanner.html` has a genuinely separate, real `#barcode-reader` id | Confirmed at lines 123-142 (CSS), 601 (DOM), 1197/1201/1242/1261/1296 (JS `Html5Qrcode("barcode-reader")` and `document.getElementById("barcode-reader")`). This is a standalone phone-scanner tool (session-handoff companion app per `docs/ARCHITECTURE.md:399-402`), architecturally distinct from the main app's STOCKZ hub. **It is out of scope** — none of the 4 Master Reference lines are describing this file. |

## Scope Boundary (explicit)
- **In scope:** `tools/SK8Lytz_App_Master_Reference.md` only — 4 individual line edits (316, 444, 561, 591).
- **Out of scope:** `tools/remote-scanner.html` (confirmed genuinely separate tool, not touched).
- **Out of scope:** De-duplicating the twin "H/I/I" sections (300-323 vs 430-454). Both copies get the identical single-token fix; the duplication itself is a separate, larger structural cleanup not requested here.
- **Out of scope:** `assets/js/inventory-module.js` compatibility aliases (`openCycleCountManager`/`closeCycleCountManager`) — these remain as live, working, backward-compatible functions. Nothing about them is broken; only the Markdown's claim that a `cycleCountManagerModal` DOM node exists is wrong.
- **Zero security/XSS/RLS/schema/UI surface:** This is a Markdown-only edit to a documentation file that is never loaded, parsed, or rendered by the running application. No `window.safeHTML`, no DOMPurify, no Supabase table/column/RLS, no button/modal/render function is touched. 4-state UX, UI mutex, and zero-refresh concerns are inapplicable — nothing renders as a result of this change.
- Per CLAUDE.md subagent mandates, `security-scout` is skipped for this batch (no XSS/security angle). `xss-validator` in the post-task validation swarm should still run per protocol but is expected to report zero new/fixed violations (this file isn't part of its scan surface).

## Exact Edits — `tools/SK8Lytz_App_Master_Reference.md`

### Edit 1 — Line 316 (first copy of "I. WebRTC Scanner Layouts & iOS Compatibility")
**Old:**
```
* **Aspect Ratio Hardware Constraint (CRITICAL):** The actual live video feed (`#barcode-reader`) MUST be structurally restrained using `aspect-ratio: 1/1; width: 100%` within the DOM Card. Even more importantly, the instantiation script `Html5Qrcode.start()` MUST explicitly declare the configuration `{ aspectRatio: 1.0 }`. Failure to pass this specific flag into the runtime engine will result in catastrophic, un-fixable extreme zooming defects on iOS Safari devices.
```
**New:**
```
* **Aspect Ratio Hardware Constraint (CRITICAL):** The actual live video feed (`#stockzAuditLocalReader`) MUST be structurally restrained using `aspect-ratio: 1/1; width: 100%` within the DOM Card. Even more importantly, the instantiation script `Html5Qrcode.start()` MUST explicitly declare the configuration `{ aspectRatio: 1.0 }`. Failure to pass this specific flag into the runtime engine will result in catastrophic, un-fixable extreme zooming defects on iOS Safari devices.
```
Single-token change: `` `#barcode-reader` `` → `` `#stockzAuditLocalReader` ``.

### Edit 2 — Line 444 (second/duplicate copy of the same section)
**Old:** identical to Edit 1's old text.
**New:** identical to Edit 1's new text (same single-token swap).
Applied independently since this is a second physical line in the file, not a reference to Edit 1.

### Edit 3 — Line 561 (Section 6A, Global Modals directory)
**Old:**
```
- `cycleCountManagerModal`: The WebBluetooth/WebRTC scanner UI for STOCKZ. Requires physical `#barcode-reader` strictly typed with `{aspectRatio: 1.0}` to prevent iOS zoom malfunctions.
```
**New:**
```
- `stockzAuditModal`: The WebBluetooth/WebRTC scanner UI for STOCKZ (Inventory Audit & Supply Chain Planning Console). Requires physical `#stockzAuditLocalReader` strictly typed with `{aspectRatio: 1.0}` to prevent iOS zoom malfunctions. (Legacy alias: `window.openCycleCountManager()`/`window.closeCycleCountManager()` in `assets/js/inventory-module.js:2148-2154` forward to `window.openStockzAuditModal('', 'audit')`/`window.closeStockzAuditModal()` for backward-compatible call sites — no `cycleCountManagerModal` DOM element exists.)
```
Renames the bullet key from the retired id to the live id, updates the required child element, and preserves the historical alias knowledge (so a future reader who greps for `cycleCountManagerModal` in JS isn't confused by finding it there). No naming collision: grep confirms no other `stockzAuditModal` bullet exists in Section 6A.

### Edit 4 — Line 591 (Section 6B.2, STOCKPILEZ → `paneInventory` (STOCKZ))
**Old:**
```
- **`paneInventory` (STOCKZ)**:
  - The real-time interactive lifecycle module. Triggers `cycleCountManagerModal` via standard scanner hardware, integrates explicit `velocityzModal` charting, and hosts the high-fidelity `stockzAuditModal` (Inventory Audit & Supply Chain Planning Console) which secures calculated adjustments with physical-count-driven math, sliders for ROP, and WebRTC real-time phone scans.
```
**New:**
```
- **`paneInventory` (STOCKZ)**:
  - The real-time interactive lifecycle module. Integrates explicit `velocityzModal` charting and hosts the high-fidelity `stockzAuditModal` (Inventory Audit & Supply Chain Planning Console) — the live WebBluetooth/WebRTC scanner UI for STOCKZ (accessible via the compatibility aliases `window.openCycleCountManager()`/`window.closeCycleCountManager()`) — which secures calculated adjustments with physical-count-driven math, sliders for ROP, and WebRTC real-time phone scans.
```
Removes the false "Triggers `cycleCountManagerModal`... and hosts... `stockzAuditModal`" framing (which wrongly implies two separate modals) and replaces it with the accurate single-modal description, consistent with Edit 3.

## Additional Stale-Reference Findings (require explicit scope decision)

The task asked me to check whether any other file references these stale ids. `docs/nomenclature_dictionary.md` and `tools/nomenclature-registry.json` — **zero matches**, clean. However grep surfaced these additional hits, triaged below:

1. **`docs/ARCHITECTURE.md:404`** — prose: `` These pair with the in-app WebRTC scanner modal (`cycleCountManagerModal`) and the Packerz camera scanner. `` This is the same class of staleness (a currently-maintained architecture doc making a false claim about a live DOM id), not a historical snapshot. **Recommend fixing in the same task** as Boy Scout-adjacent, near-zero-risk (single prose token swap `` `cycleCountManagerModal` `` → `` `stockzAuditModal` ``), but it is technically outside the 4 line locations named in the ticket.
   - **Resolved (user-approved):** Include Edit 5 (`docs/ARCHITECTURE.md:404`, swap `` `cycleCountManagerModal` `` → `` `stockzAuditModal` ``) in this task's commit.

2. **`docs/reports/master-reference-compliance-audit.md:48`** — this is a dated point-in-time audit report (`` `modal-close-btn` is only applied to 2 modals (`cycleCountManagerModal`, the inner scanner close) ``). **Out of scope, do not edit** — this is a historical finding describing what was true when that audit ran; rewriting it would falsify the audit trail. If its `cycleCountManagerModal` reference is itself stale relative to today's DOM, that's a separate future audit's job to re-run and re-report, not this task's.

3. **`scripts/nomenclature-baseline.json`** — a machine-generated, timestamped (`"captured_at": "2026-07-17T11:56:54.586Z"`) snapshot from the nomenclature audit engine, containing a `"barcode-reader"` / `N1_GHOST_ID` fingerprint entry (line ~183-189, pointing at `assets/js/inventory-module.js` — note its own `example_line: 1673` no longer even points at a barcode-reader reference in current code, confirming these are frozen point-in-time line numbers). **Out of scope, do not hand-edit** — this file is owned/regenerated by the nomenclature audit tooling (`scripts/nomenclature-audit.js` or equivalent); manually editing a generated baseline would desync it from the tool's own diffing logic. If it needs refreshing, that's done by re-running the audit script, which is a separate task.

4. **`docs/plans/debt-nomenclature-remediation-{4,5,9}.md`, `docs/plans/docs/comprehensive-ui-audit.md`** — prior task planning docs from earlier completed work. **Out of scope** — these are historical planning artifacts for already-shipped tasks; not rewritten retroactively.

5. **Dead CSS selector discovery (not part of the 4 named lines, flagging only):** `index.html:1728` — `` #stockzAuditLocalReader video, #sopCameraReader video, #barcode-reader video { object-fit: cover !important; ... } `` — the `#barcode-reader` clause in this selector list is harmless dead weight inside `index.html` (no element with that id exists in the main app's DOM, so that branch of the selector never matches there; it's presumably a copy-paste leftover from when the Cycle Count engine used a real `#barcode-reader` id before the STOCKZ Audit Console consolidation). This is **application code**, explicitly out of scope for this docs-only task per the ticket's boundary ("zero application code"). Flagging for `tools/SK8Lytz_Bucket_List.md` §🧹 Technical Debt as a separate future micro-cleanup, not to be touched here.

## Schema / Security / UX Checklist (all N/A — confirming zero impact)
- **XSS guards:** N/A. No `.innerHTML`, `.insertAdjacentHTML`, or `document.write` touched. Markdown file is never parsed by the app runtime.
- **RLS implications:** N/A. No Supabase table/column/policy touched.
- **Print-window DOMPurify:** N/A.
- **Vanilla JS constraints:** N/A. No JS is written or edited.
- **4-state UX (Loading/Error/Empty/Success):** N/A. No render function, component, or data-fetch path is touched.
- **UI mutex (`executeWithButtonAction`):** N/A. No button or DB mutation is touched.
- **Zero-refresh / render re-invocation:** N/A. No mutation, no render function to re-invoke.
- **Schema changes:** None. No `## Database Schemas` section update required (no table/column/RLS changed).
- **Mermaid Architectural Blueprint (Topological integrity rule):** N/A — this task renames a stale doc reference to an already-existing, already-documented live modal (`stockzAuditModal`); it does not create, delete, or move any button/modal/UI element. No Blueprint diagram update required.

## Files Touched
- `tools/SK8Lytz_App_Master_Reference.md` — 4 edits (lines 316, 444, 561, 591) as specified above. **Required, in-scope.**
- `docs/ARCHITECTURE.md` — 1 edit (line 404) — **user-approved, in-scope.**

No other files are touched by this task. No code files (`.js`/`.html`), no Supabase migrations, no `tools/remote-scanner.html`, no `scripts/nomenclature-baseline.json`, no `docs/reports/master-reference-compliance-audit.md`, no prior `docs/plans/*.md` files.

### Edit 5 — `docs/ARCHITECTURE.md:404`
**Old:**
```
These pair with the in-app WebRTC scanner modal (`cycleCountManagerModal`) and the Packerz camera scanner.
```
**New:**
```
These pair with the in-app WebRTC scanner modal (`stockzAuditModal`) and the Packerz camera scanner.
```
Single-token swap, same root cause as Edits 3-4.

## Suggested Commit Message
```
docs(master-reference): retire stale cycleCountManagerModal/#barcode-reader refs

Master Reference lines 316, 444, 561, 591 described a retired DOM id
(cycleCountManagerModal) and its retired required child (#barcode-reader)
as the live STOCKZ scanner UI. Neither exists; the live modal is
stockzAuditModal (index.html:6359) and the live reader is
stockzAuditLocalReader (index.html:6626). Updated all 4 line references
(316/444 are duplicate paragraphs, both fixed identically) to cite the
live ids while preserving the iOS Safari aspect-ratio zoom-bug knowledge
and noting the still-live compatibility aliases in inventory-module.js.
Also fixed the same stale claim in docs/ARCHITECTURE.md:404.
```
