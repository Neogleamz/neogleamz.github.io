# ⚡ SK8Lytz A.I. Command & Rules Cheat Sheet

Welcome to your customized Neogleamz / SK8Lytz Autonomous Agent protocol directory! This document systematically outlines every single Slash Command workflow, AI Persona prompt, and Core Directive the A.I. uses to maintain the integrity of your codebase.

---

## 🛠️ Direct Workflow Commands (Categorized)
You can directly type these exact `/slash-commands` into the chat to force the A.I. to execute specific Standard Operating Procedures.

### 🚀 1. Project Management & Execution workflows
* **`/next_task_auto_branch`** — **(The Project Engine)** Automates branching, planning, execution, and documentation for the highest priority item on the Bucket List.
* **`/idea_intake`** — **(Brainstorm Catcher)** Captures your raw, natural language ideas and formats them into the project bucket list with structured git execution slugs.
* **`/status_update`** — **(Project SITREP)** Generates a highly detailed Situation Report based on current Git context, modified files, and the active Bucket List target.
* **`/cut_release`** — **(Release Manager)** Executes the semantic version bump, automates the `CHANGELOG.md` generation based on completed bucket list items, and pushes an official Git Tag to GitHub.

### 🛡️ 2. Diagnostics, QA & Emergency Workflows
* **`/isolated_test_and_verify`** — **(Strict QA Flow)** Executes a rigorous QA checklist. Forces the AI to verify recent changes utilizing manual browser steps for UI/Bluetooth logic or isolated sandbox testing for Database queries.
* **`/emergency_debug_drill`** — **(Root-Cause Analyzer)** A strict diagnostic workflow that explicitly blocks the AI from guess-fixing. Forces it to deeply instrument the DOM with console logs and form theories before writing solutions.
* **`/panic_button`** — **(Lockdown)** Triggers a strict read-only diagnostic mode for when the application is catastrophically broken but the source is unknown.
* **`/legacy_audit`** — **(Code Refactoring)** Executes a strict code audit to modernize old files up to current Vanilla JS standards.
* **`/health_check`** — **(Technical Debt Janitor)** Scans the broader codebase for vulnerabilities, leaks, and technical debt, triaging the findings cleanly into the backlog.

### 📁 3. System State & Safe-Keeping Checkpoints
* **`/wind_down`** — **(End of Session Protocol)** Executes the end-of-session synchronization, workspace sanitization, bucket list grooming, and state saving sequence.
* **`/version_control_escape_hatches`** — **(Timeline Protection)** Executes safety checkpoints, temporary stash saves, or destructive rollbacks to protect the codebase from rabbit holes and broken states.
* **`/repo_cleanup`** — **(Local Storage Maintenance)** Safely parses and prunes local Git branches (`feat/`, `fix/`) that have already been securely merged.
* **`/context_memory_compiler`** — **(Documentation Sync)** Forces the AI to scan its own recent memory of the codebase and systematically update the architectural blueprint within the Master Reference.

### 🧠 4. Specialized A.I. Persona Prompts
* **`/simulate_ux`** — Triggers a persona shift to a **Novice Quad Skater** to critically evaluate mobile web UI logic based on physical rink constraints (e.g., using a phone with wrist guards).
* **`/bug-hunter`** — Engages a hyper-critical analysis sequence solely designed to identify edge cases in the current active logic.
* **`/devils-advocate`** — Engages a contrarian logic sequence to challenge and poke holes in your proposed architectural database or feature decisions.

---

## 🚀 The "Ship It" Action
**"Ship it"** is an Architectural Security Key. The A.I. is explicitly forbidden from pushing code directly to the `main` branch. Typing this exact phrase grants the AI verbal permission to sequence a fast-forward merge and push the live code to the GitHub master branch.

---

## 📜 Core A.I. Governance Directives (Categorized)
Every single time the A.I. types a response, it is secretly subjected to the following deep-dive structural rules.

### 🛡️ 1. Complete Safety & Security Enforcements
* **Critical Safety Protocol:** The `main` branch is hyper-protected. The A.I. is permanently locked out of reading or modifying `.git/hooks/`. Furthermore, it must possess "Passphrase Amnesia" — never caching or reusing your authentication keys across boundaries.
* **Security & Secrets Standard:** The A.I. must use strict `.env.example` placeholders. It is strictly forbidden from hardcoding API keys, passwords, Database URIs, or hardware MAC addresses directly into the JS codebase or reading your actual local `.env` keys.
* **Local Tool Enforcement Rule:** The A.I. is globally blocked from using destructive Native Terminal commands like `sed`, `awk`, or `cat >>`. It must utilize its specialized contextual API tools (`write_to_file`, `replace_file_content`) to prevent silent bash errors from overwriting source code.
* **Anti-Hallucination Protocol:** Whenever diagnosing a complex defect, the A.I. cannot execute generic assumptions. It MUST use First-Principle tracing (cross-referencing the `SK8Lytz_App_Master_Reference.md`), explicitly cite findings, show byte-matrix math visibly in chat, and explicitly state when it enters "Discovery Mode".

### ⚙️ 2. Pure Browser DOM Engineering Constraints
* **Web Native Exclusivity Rule:** Absolutely no Mobile, Desktop, or Node.js logic is permitted. Everything runs natively in Vanilla standard browsers. Storage is isolated to Local/Session Storage or Supabase. Hardware must use `navigator.bluetooth` explicitly.
* **Vanilla DOM Mastery:** React hooks (`useState`), Vue abstractions, and jQuery are strictly banned. It must attach interactions exclusively using native `element.addEventListener` and efficiently build HTML string injection fragments to update views.
* **Coding Standards & Clean Code:** Strict Single Responsibility pattern enforcement. If a function is > 50 lines, it must be modularized. Enforces strict Async/Await try/catch block error handling that actively bubbles errors to the visual UI rather than silently swallowing them in the console.

### 🎨 3. Flawless UI/UX Architecture
* **Modern UI/UX Protocol:** The A.I. must adhere to a rigorous 4-State Matrix (`Loading`, `Error`, `Empty`, `Success`) for every element, toggled via Vanilla class injection. Must use strict CSS 8-point typographic grids and 48px tap targets for mobile usability.
* **Context-Aware Responsive UI Framework:** The A.I. executes dual strategies: Data-dense `Desktop-First` layouts for internal Executive views, and high-contrast, bottom-anchored `Mobile-First` logic for customer hardware remotes. 
* **Chart.js Rendering Rule:** The A.I. must explicitly enforce a Destruction Mandate (`chart.destroy()`) before attempting to render any new graphic context, preventing the "ghosting" memory-leak collision bug.

### 📝 4. Continuous Execution & Cleanup Standards
* **Semantic Commits Enforcer (24/7):** The A.I. executes mandatory micro-commits following any logic change to protect states. It natively structures the commit (`feat:`, `fix:`, `perf:`, `chore:`) to ensure downstream operations like `cut_release` parse beautifully.
* **Boy Scout Protocol:** When targeting standard functions, the A.I. is ordered to find and isolate *exactly one* piece of messy technical debt (e.g. an orphaned `var` namespace or dangling event listener) and eradicate it.
* **Surgical Strike Protocol (Anti-Collision):** To avoid erasing critical code in monolithic documents, the A.I. executes highly-targeted micro-edits. It is fundamentally required to execute a `git diff HEAD` immediately after touching a document to self-audit whether it accidentally erased unrelated elements.
* **Local State Caching Rule:** The A.I. must exclusively serialize UI data using the explicit `sk8lytz_` namespace string to prevent collision, and maintain synchronous localized preferences.
* **Corporate Memory Synchronization:** When injecting facts into the Master Reference file, it must be contextually chunked, and the AI must actively prune older, incorrect architectural assumptions down natively rather than continually appending lines at the bottom of the list.
