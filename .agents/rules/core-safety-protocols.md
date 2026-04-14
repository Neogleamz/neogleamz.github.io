---
name: core_safety_protocols
description: "Mission-critical constraints regarding Security, Version Control, Tooling usage, and Anti-Hallucination bounds."
trigger: always_on
---

# Core Safety Protocols (Ultra-Dense)

### 1. Mandatory Branching & Git Hooks
- **No Direct Main Pushes:** Logic/Feature code cannot be pushed directly to `main` or `master`. Must use isolated feature branches merging via `/ship_it`. 
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
- **Contradiction Halt:** If the Reference file contradicts Live Code, HALT and request human clarification.
- **Discovery Mode:** If charting undocumented protocols, explicitly declare "Discovery Mode" to authorize logical deduction sequences out-of-bounds from the Reference file.
