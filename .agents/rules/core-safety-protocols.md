---
name: core_safety_protocols
description: "Mission-critical constraints regarding Security, Version Control, Tooling usage, and Anti-Hallucination bounds."
---

# Core Safety Protocols (Ultra-Dense)

### 1. Mandatory Branching & Git Hooks
- **No Direct Main Pushes:** Logic/Feature code cannot be pushed directly to `main` or `master`. Must use isolated feature branches merging via `/ship_it`. 
- **Lightweight Bug Branching (Interrupt Constraint):** If the user reports an ad-hoc bug, stack trace, or error mid-session, you are STRICTLY FORBIDDEN from writing fix code directly to `main`. You must quietly run `git checkout -b fix/...` in the background, write the code, await user testing, and run `[/ship_it]` to merge cleanly.
- **Exemption:** Administrative `chore:` commits (e.g. tagging, doc syncs via `/release` or `/wind_down`) are authorized directly to `main`.
- **Git Hook Protection:** Absolutely forbidden from reading, editing, or deleting files in `.git/hooks/`.

### 2. Secret Management & Tool Isolation
- **Passphrase Amnesia:** Never cache API keys or passwords across boundaries. Valid only for immediate transaction.
- **Environment Strictness:** Never read/edit the local `.env` file directly. Use `.env.example` placeholders. Never hardcode credentials into JS/HTML (use `import.meta.env`).
- **Native Tools Only:** Globally blocked from using destructive bash operations (`sed`, `awk`, `echo >`). Must use explicit internal APIs (`write_to_file`, `replace_file_content`).

### 3. Execution & Precision Editing
- **Surgical Edits:** No overwriting entire files. Use precision line bindings (`StartLine`/`EndLine`).
- **Look Before Leap:** Mandatory `view_file` to verify text structure/indentation before applying replacements.
- **Audit Requirement:** Constantly execute `git diff HEAD` post-edit; if unrelated logic is damaged, instantly rollback via `git checkout -- <file>`.

### 4. Anti-Hallucination Guardrails
- **The Ground Truth:** Assume zero generic context. Always verify payloads, architectures, and DB Schemas against `@/tools/SK8Lytz_App_Master_Reference.md`.
- **Provide Proof:** When tracing bugs, mathematically show hex arrays, or cite explicit line numbers from the Reference/Source files.
- **Topological Integrity:** You are strictly forbidden from creating, deleting, or moving any buttons, modals, or UI elements without simultaneously updating the Mermaid Architectural Blueprint in `@/tools/SK8Lytz_App_Master_Reference.md`.
- **Contradiction Halt:** If the Reference file contradicts Live Code, HALT and request human clarification.
- **Discovery Mode:** If charting undocumented protocols, explicitly declare "Discovery Mode" to authorize logical deduction sequences out-of-bounds from the Reference file.
- **Nomenclature & Testing Fidelity:** You are STRICTLY FORBIDDEN from guessing or hallucinating UI tab labels, panel names, button texts, or workflow locations. Any time you generate manual testing guides or describe the application layout, you MUST explicitly map them to the exact canonical labels and DOM targets defined in Section 0 of [SK8Lytz_App_Master_Reference.md](file:///d:/GitHub/neogleamz.github.io/tools/SK8Lytz_App_Master_Reference.md):
  - **STOCKPILEZ Hub**: `STOCKZ` Pane (`paneInventory`), `DATAZ` Pane (`panePipeline`), `EDITZ` Pane (`paneSimple`).
  - **MAKERZ Hub**: `RECIPEZ` Pane (`paneProdBuilder`), `BATCHEZ` Pane (`paneProdControl`), `LAYERZ` Pane (`paneProdPrint`).
  - **FULFILLZ Hub**: `PACKERZ` Pane (`paneFulfillzPackerz`), `BARCODZ` Pane (`paneFulfillzBarcodz`), `LABELZ` Pane (`paneFulfillzLabelz`).
  - **REVENUEZ Hub**: `ORDERZ` Pane (`paneSalezBridge`), `STATZ` Pane (`paneSalezAnalyticz`), `SIMULATORZ` Pane (`paneSalezCommandz`).
  - **SOCIALZ Hub**: `ROSTER` Pane (`paneSocialzRoster`).
  - **NEXUZ Hub**: `IMPORTZ` Pane (`paneNexlImportz`), `SALEZ` Pane (`paneNexlSalez`), `BRAINZ` Pane (`paneNexlBrainz`).
  - **Actionable Buttons & Modals**: You MUST explicitly consult and map all click targets, modals, and workflow actions to the **Architectural Hierarchy Blueprint (Mermaid Topology)** and buttons list in [SK8Lytz_App_Master_Reference.md](file:///d:/GitHub/neogleamz.github.io/tools/SK8Lytz_App_Master_Reference.md) before writing manual verification steps.

### 5. Continuous Trunk Hydration (The Concurrency Lock)
- **Frequent Merging:** When operating on long-running feature or epic branches (`feat/*`, `epic/*`), you must frequently execute `git merge main` to absorb parallel completed tasks.
- **Ledger Hydration:** Before altering the `@/tools/SK8Lytz_Bucket_List.md` file at the conclusion of any task, you must explicitly fetch and hydrate the latest version from `main` to prevent overwriting other sessions' release tags (`[🚀]`).

### 6. Root Directory Isolation & Directory Sanitization Standard (CRITICAL)
- **Immutable Root Whitelist:** You are STRICTLY FORBIDDEN from creating, writing, or outputting any loose diagnostic files, one-shot diagnostic scripts, text dumps, or scratchpads directly into the repository root. All temporary or development files MUST be written directly to `C:\Users\Chriviper\.gemini\antigravity-ide\brain\<conversation-id>/scratch/` or inside standard subfolders like `/scripts/` or `/diagnostics/`.
- **Whitelisted Root Files:** The only files authorized to live in the root directory are:
  - Configuration & Config Specs: `.gitignore`, `.env.example`, `.env.local`, `.eslintrc.json`, `eslint.config.mjs`, `.hintrc`, `.htmlhintrc`, `.prettierignore`, `.prettierrc`, `jest.config.js`, `package.json`, `package-lock.json`
  - Core Markup & Styling: `index.html`, `qa-dashboard.html`, `test_print.html`
  - Documentation Assets: `README.md`, `CHANGELOG.md`, `nomenclature_dictionary.md`, `test_shared.md`, `diagram-1.svg`
- **Hygiene Enforcement:** Every time you execute `/health_check` or `/wind_down`, you must scan the root directory. If any un-whitelisted file is detected, you must instantly queue a task to clean it up.

