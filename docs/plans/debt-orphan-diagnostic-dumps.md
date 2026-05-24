# Implementation Plan — Relocate Loose Root Diagnostics (debt/orphan-diagnostic-dumps)

### Design Decisions & Rationale
To guarantee absolute repository hygiene and strictly adhere to our newly established **Root Directory Isolation & Whitelisting Standard** (Core Safety Protocol 6), all loose diagnostic text files residing in the project root (`all_buttons.txt`, `modals_trace.txt`, and `pane_orders.txt`) will be consolidated into a dedicated `diagnostics/` folder. We will utilize standard Git move operations (`git mv`) to preserve the forensic history and rename logs. Furthermore, the active diagnostic generation scripts (`scripts/dump_buttons.py` and `scripts/trace3.py`) will be updated to output their files directly to the consolidated path to prevent future root pollution during runs.

---

## Proposed Changes

### Diagnostics Directory

#### [NEW] [diagnostics/all_buttons.txt](file:///d:/GitHub/neogleamz.github.io/diagnostics/all_buttons.txt)
- Relocated from repository root via `git mv` to maintain perfect historical tracking.

#### [NEW] [diagnostics/modals_trace.txt](file:///d:/GitHub/neogleamz.github.io/diagnostics/modals_trace.txt)
- Relocated from repository root via `git mv`.

#### [NEW] [diagnostics/pane_orders.txt](file:///d:/GitHub/neogleamz.github.io/diagnostics/pane_orders.txt)
- Relocated from repository root via `git mv`.

### Generator Scripts

#### [MODIFY] [dump_buttons.py](file:///d:/GitHub/neogleamz.github.io/scripts/dump_buttons.py)
- Update output file pointer from `'all_buttons.txt'` to `'diagnostics/all_buttons.txt'`.

#### [MODIFY] [trace3.py](file:///d:/GitHub/neogleamz.github.io/scripts/trace3.py)
- Update output file pointer from `'modals_trace.txt'` to `'diagnostics/modals_trace.txt'`.

---

## Verification Plan

### Automated Tests
- Run `git status` to verify Git recognizes the file moves as 100% rename operations rather than independent creations/deletions.
- Execute generator scripts locally to verify they run flawlessly and output to the correct `/diagnostics/` directory:
  ```bash
  python scripts/dump_buttons.py
  python scripts/trace3.py
  ```
- Run linter check and Jest test suites to ensure no syntax/runtime regression:
  ```bash
  npm test
  npx eslint .
  ```

### Manual Verification
- N/A (Verified purely via filesystem output logs and Git status rename confirmation).
