# 🔍 Master Reference Compliance Audit Report
**Branch:** `chore/master-reference-compliance`
**Date:** 2026-04-12
**Audited Against:** `tools/SK8Lytz_App_Master_Reference.md`

---

## ✅ PASSING — Compliance Confirmed

| Rule | Section | Status |
|------|---------|--------|
| Zero-Build Stack (No React/Node/TS) | §1 Architecture | ✅ PASS |
| `system-event-delegator.js` exists and is active | §1 Event Delegation | ✅ PASS |
| `data-click` / `data-change` tokens used in `index.html` | §1 Action Tokens | ✅ PASS |
| `localStorage` keys prefixed with `neogleamz_` | §1 Local State | ✅ PASS |
| `executeWithButtonAction()` used on all major async DB saves | §2B Button Rules | ✅ PASS |
| `<select multiple>` not used anywhere in the app | §2E Multi-Select | ✅ PASS |
| `.archive-card` accordion used for archived records | §2F Archive Explorer | ✅ PASS |
| `saveSort()`/`getSavedSort()` used for table memory | §2F Data Table Memory | ✅ PASS |
| `openSandboxModal()` gates all CSV ledger imports | §2H Sandbox Enforcer | ✅ PASS |
| `Html5Qrcode.start()` called with `{ aspectRatio: 1.0 }` | §2I WebRTC Scanner | ✅ PASS |
| `system-version.js` bumped on core changes | §2F Version Bumping | ✅ PASS |

---

## ⚠️ DIVERGENCES FOUND — Prioritized Fix List

### 🔴 P1 — Memory Leak Risk: Anonymous Resize Listeners

**Rule:** §2C — *"Inline resize listeners injected via dynamic `<script>` blocks MUST use named function declarations, never anonymous arrow functions."*

**Violations found (`3 instances`):**

| File | Line | Issue |
|------|------|-------|
| `production-module.js` | L1205 | `document.addEventListener('mousemove', (e) => {` — anonymous arrow function |
| `index.html` | L3516 | `document.addEventListener('mousemove', (e) => {` — anonymous arrow function |
| `index.html` | L3588 | `document.addEventListener('mousemove', (e) => {` — anonymous arrow function |

**Risk:** These anonymous functions cannot be passed to `removeEventListener`. On every re-render of the associated pane, a new listener accumulates, causing unbounded memory growth and phantom resize behavior.

---

### 🟠 P2 — Modal Close Button: Incomplete Adoption

**Rule:** §2G — *"All modal headers MUST use `class='modal-close-btn'` with explicit text `✕ CLOSE`."*

**Finding:** `modal-close-btn` is only applied to 2 modals (`cycleCountManagerModal`, the inner scanner close). The vast majority of modals across `index.html` use either raw `onclick="closeXModal()"` buttons with ad-hoc inline styling or `data-click` tokens but **not** the `modal-close-btn` class.

**Examples of non-compliant close buttons (sample):**
- `sopMasterModal` close button — does not use `modal-close-btn`
- `sandboxDataModal` close button — does not use `modal-close-btn`  
- `archiveExplorerModal` close button — does not use `modal-close-btn`
- `skater-modal` close button — does not use `modal-close-btn`

**Risk:** Inconsistent visual design and touch target sizing across modals. Minor but creates premium feel degradation.

---

### 🟠 P2 — Inline `onclick=` in Dynamically Injected HTML

**Rule:** §1 Event Delegation — *"All interactive elements MUST be tagged with `data-click`/`data-change` tokens. NEVER use inline `onclick=`."*

**Finding:** Large volumes of dynamically generated HTML strings (inside JS template literals across all modules) still use inline `onclick=`. This is a **systemic pattern** across:

| Module | Count (approx) | Nature |
|--------|---------------|--------|
| `production-module.js` | ~40+ instances | SOP step controls, WO actions, report table headers |
| `socialz-module.js` | ~6 instances | Favorite toggle, edit buttons, sort headers |
| `sales-module.js` | ~4 instances | Alias map triggers, sort headers |
| `system-tools-module.js` | ~5 instances | Paper profile inline actions, preset buttons |

> **Note:** This is a nuanced architectural tension. The `system-event-delegator.js` model works perfectly for **static HTML** in `index.html`. However, for dynamically injected HTML inside JS template literals, binding `data-click` tokens is harder because the delegator must know the correct switch case. Inline `onclick` in dynamic HTML is a pragmatic workaround that exists intentionally in most large Vanilla JS apps.
>
> **Recommendation:** These are **not critical bugs** — the app is stable. But the rule is violated. Recommend creating a formal addendum to the Master Reference documenting this **"Dynamic HTML Exception"** pattern rather than refactoring 50+ instances.

---

### 🟡 P3 — `pane-header-bar` Height Not Universally Enforced

**Rule:** §2C — *"Executive headers must be `height: 26px; padding: 0 10px`."*

**Finding:** Several dynamically injected pane headers in `production-module.js` and `packerz-module.js` use inline `style=` overrides on headers that deviate slightly from the 26px spec (some use `padding: 4px`, some have height unset).

**Risk:** Minor visual inconsistency in header alignment. Not a crash risk.

---

## 📋 Recommended Action Plan

| Priority | Action | Effort |
|---------|--------|--------|
| 🔴 **P1** | Fix 3 anonymous `mousemove` listeners → convert to named function pattern | Low (surgical) |
| 🟠 **P2a** | Apply `modal-close-btn` class universally to all modal close buttons | Medium |
| 🟠 **P2b** | Document the "Dynamic HTML onclick Exception" in Master Reference | Low |
| 🟡 **P3** | Standardize `pane-header-bar` heights in dynamically injected headers | Low |

---

## 🧹 Boy Scout Cleanup (Discovered During Audit)
- Removed `refactor_events.js` and `scan_events.js` scratch files from root directory (leftover from previous session).
- These are now permanently excluded via `.gitignore` (`scratch/` entry).
