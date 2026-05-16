# Sitewide Code Quality Audit — Implementation Plan

### Design Decisions & Rationale

This audit is a **read-and-report** task, not a refactor task. Rather than touching production code and risking regressions, the deliverable is a **prioritized Audit Report** committed to `docs/` that becomes the source-of-truth for follow-up legacy audit branches (`chore/audit-*`). This preserves a clean Git history and gives the user a full picture before any scalpel touches the codebase.

---

## Scope

All root-level JS modules + `index.html`.

| File | Size |
|---|---|
| `production-module.js` | 164 KB |
| `system-tools-module.js` | 100 KB |
| `inventory-module.js` | 85 KB |
| `packerz-module.js` | 119 KB |
| `socialz-module.js` | 59 KB |
| `labelz-module.js` | 44 KB |
| `print-module.js` | 44 KB |
| `sales-module.js` | 51 KB |
| `bom-module.js` | 29 KB |
| `ceo-module.js` | 35 KB |
| `neogleamz-engine.js` | 33 KB |
| `analytics-module.js` | 15 KB |
| `barcodz-module.js` | 26 KB |
| `orders-module.js` | 2 KB |
| `system-version.js` | <1 KB |
| `index.html` | 413 KB |

---

## Audit Checklist (Per File)

For each file, I will scan and report on the following violation categories:

### 🔴 P0 — Zero-Tolerance Violations
- **Inline `onclick=` callbacks in dynamically-generated HTML**: Per `vanilla-dom-mastery.md`, all event binding must use `addEventListener`. Inline `onclick=` in dynamically injected HTML strings is an architectural violation creating memory leak risk and poor testability.

### 🟠 P1 — High Debt
- **`var` declarations**: Must be upgraded to `const`/`let` per ES6+ mandate.
- **Monolithic functions (>50 lines)**: Functions exceeding 50 lines must be flagged for extraction into named helper functions.
- **Missing `try/catch` in async operations**: Any `async` function or Supabase fetch without a wrapping `try/catch` is a silent failure risk.

### 🟡 P2 — Medium Debt
- **DOM query caching**: Repeated `document.getElementById()` calls inside loops or re-render functions that could be hoisted to a single cached reference.
- **Named function extractability for event listeners**: Anonymous arrow functions inside `addEventListener` calls that should be named functions to enable `removeEventListener` cleanup.
- **Poor variable naming**: Single-character or cryptic variable names (e.g., `h`, `d`, `c`) in complex logic.

### 🟢 P3 — Low / Cosmetic
- **Dead code / commented-out blocks**: Any `//` commented-out code blocks that should be deleted.
- **Magic numbers**: Raw numeric literals used in layout or business logic with no named constant.

---

## Deliverable

A committed audit report at `docs/code-quality-audit-report.md` containing:
1. A per-module violation table (columns: File | Category | Line Ref | Violation Description)
2. A **Top 10 prioritized refactor targets** list ranked by risk × frequency
3. A mapping of each finding to the relevant follow-up `chore/audit-*` branch from the bucket list

---

## Execution Steps

1. **Scan each JS file** using `grep_search` and `view_file` (30K character chunks) against every checklist category above.
2. **Compile findings** into `docs/code-quality-audit-report.md`.
3. **Commit report** to `chore/code-quality-audit` branch.
4. **Mark `[x]`** in Bucket List and notify user for follow-up.

> ⚠️ **NO PRODUCTION CODE WILL BE MODIFIED** on this branch. This is a pure audit and documentation pass only.

---

## Verification

- Confirm `git diff --stat` shows ONLY new docs files committed — zero changes to any `.js` or `.html` source files.
- User reviews the audit report and selects the first `chore/audit-*` sub-item to execute next.
