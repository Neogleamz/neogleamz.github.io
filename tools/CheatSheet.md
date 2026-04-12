# ⚡ SK8Lytz A.I. Command & Rules Cheat Sheet

Welcome to your customized Neogleamz / SK8Lytz Autonomous Agent protocol directory! Because we've locked down your project with strict architectural constraints and custom A.I. modules, the A.I. is bound by a massive rulebook behind the scenes.

Use this document to understand **exactly** what commands you can trigger via chat, what "buzzwords" unlock specific actions, and the underlying fundamental rules the A.I. is actively obeying to protect your application.

---

## 🛠️ Direct Chat Commands (Workflows)
You can directly type these exact `/slash-commands` into the chat to force the A.I. to abandon its current context and strictly execute the associated standard operating procedure:

* **`/next_task_auto_branch`** — The main engine. Forces the AI to read the Bucket List, checkout a new branch (e.g., `feat/new-thing`), and begin an implementation plan safely.
* **`/wind_down`** — The midnight protocol. Triggers the AI to safely stop servers, commit Work-In-Progress syncs, and groom the Bucket List for tomorrow prior to ending the chat session.
* **`/cut_release`** — Formal Release Manager. Scans your recently completed bucket list tasks, bumps the `<version>`, builds a continuous markdown `CHANGELOG.md`, tags the codebase as an official Release, and pushes to git.
* **`/health_check`** — Code Janitor. Scans the codebase for silent bugs, memory leaks, and technical debt. Generates a hit-list of refactor recommendations into your bucket list.
* **`/emergency_debug_drill`** — Strict Diagnostic Drill. Disables the AI's ability to "guess-fix" code. Forces it to add deep telemetry `console.log()` tracing lines into the DOM and run tests until exactly isolating a bug via proof.
* **`/panic_button`** — Destructive lock. Reverts the AI to pure Read-Only mode. Good for situations where the app breaks and you want the AI to survey the wreckage without making it worse.
* **`/version_control_escape_hatches`** — Rollback mechanism. Uses strict Git features to instantly undo an A.I.'s mistaken commit or broken feature without corrupting the main branch.
* **`/repo_cleanup`** — Local pruning. Automatically hunts down and safely deletes old, unused `feat/` and `fix/` branches from your local drive that have already been shipped to Github to keep things tidy.
* **`/context_memory_compiler`** — Forces the A.I. to analyze its currently learned architecture and push its findings officially into your `SK8Lytz_App_Master_Reference.md` file.
* **`/idea_intake`** — If you get a random thought mid-session, say this and rant. The AI will gracefully convert your unstructured rant into a proper Bucket List `Epic` and target.
* **`/isolated_test_and_verify`** — Triggers the AI to rigorously verify its work utilizing manual browser interactions or Sandbox testing modes before asking for approval.
* **`/status_update`** — Generates a military-grade SITREP on exactly what branch we are on, what lines have changed, and the primary objective.
* **`/legacy_audit`** — Explicitly targets old, inherited `.js` files and refactors them aggressively to comply with modern standards.
* **`/devils-advocate`** & **`/bug-hunter`** — Specialized AI logic personas designed to actively attempt to break the code you just wrote.
* **`/simulate_ux`** — Triggers a persona shift! The A.I. stops acting as a developer and acts as a "novice quad skater" to critique mobile UI from the physical context of wearing wrist-guards holding a phone.

---

## 🚀 The "Ship It" Action
**"Ship it"** is not a slash command, it is an **Architectural Security Key**. 
The A.I. is physically forbidden from pushing directly to the `main` branch. Saying the magic phrase `"Ship it"` gives the AI explicit verbal permission to merge the branch it is working on into the live `main` production environment and push it to GitHub.

---

## 📜 Core A.I. Governance Directives
Every single time you type a prompt, the A.I. secretly evaluates it against the following deep-dive Rules. These are the laws protecting the integrity of SK8Lytz:

### 1. Web Native Exclusivity Rule
* **The Rule:** No Node.js libraries, no Python scripts, no mobile secure enclaves. Your app must run directly in a standard Vanilla Browser. 
* **The Impact:** The A.I. is banned from suggesting Node-based packages like `serialport` for hardware connectivity or `sqlite` for native databases. All hardware is forced through `navigator.bluetooth` and all data persistence strictly routes to the `Supabase Client`.

### 2. The Anti-Hallucination & First-Principles Rule
* **The Rule:** The A.I. is legally forbidden from guessing.
* **The Impact:** Before fixing complex bugs (especially regarding Bluetooth hex math or the Database schema), the A.I. MUST physically open `SK8Lytz_App_Master_Reference.md` and read the specs. If you ask a question it doesn't definitively know, it must enter "Discovery Mode" and admit it doesn't know, rather than making up fake code logic.

### 3. The Boy Scout Protocol
* **The Rule:** Leave code cleaner than you found it.
* **The Impact:** When you ask the A.I. to edit a file, it is commanded to identify at least one piece of localized technical debt inside that file (e.g., swapping a legacy `var` to `let`, removing a dead import, erasing an old `console.log`) before closing the file.

### 4. Chart.js & Vanilla DOM Mastery
* **The Rule:** Native element manipulation above all else.
* **The Impact:** The A.I. is actively blocked from importing React (`useState`, `useEffect`) or jQuery. It must use pure `document.getElementById` logic to keep the app highly performant. Furthermore, when drawing charts, it must `.destroy()` any existing canvas contexts prior to drawing new ones to prevent "ghosting" memory leaks.

### 5. Critical Safety Branching
* **The Rule:** The `main` branch is treated as sacred ground.
* **The Impact:** The A.I. will physically refuse to modify `.git/hooks`. It forces you to construct experimental features on isolated `feat/` branches. It will not memorize your private keys, forcing strict `.env` usage.

### 6. Semantic Commits (The 24/7 Committer)
* **The Rule:** Continuous, categorized integration tracking.
* **The Impact:** Every tiny change made by the AI automatically triggers a hidden `git commit` to protect the project from accidental Undo loss. Every commit is pre-fixed correctly (e.g. `feat:`, `fix:`, `style:`, `chore:`) to ensure your `git log` looks incredible for the `/cut_release` changelog generator.

### 7. Modern UI/UX Architect Protocol
* **The Rule:** All UI must be perfectly pristine. Zero "dead" interfaces.
* **The Impact:** The A.I. evaluates all UI requests against a strict 4-State Matrix: *Loading, Error, Empty, and Success*. It utilizes a strict spatial 8-point pixel grid framework and completely rejects "ugly" default magic numbers. It favors smooth micro-animations.

### 8. Context-Aware Responsiveness
* **The Rule:** Adapting dynamically to the user.
* **The Impact:** If the A.I. is building an internal Executive view for you (like the Master Terminal), it forces a **Desktop-First** layout with dense data tables. If modifying the Customer Hardware remote, it enforces **Mobile-First** logic where buttons are minimum 48px wide for skaters wearing wrist-guards.

### 9. Surgical Strikes (Anti-Collision Protocol)
* **The Rule:** Stop deleting unrelated code by accident!
* **The Impact:** Large files easily confuse AI context logic. This rule forces the A.I. to take "micro-edits", reading lines 100-110 before changing line 105, preventing it from hallucinating massive blocks of code that wipe out sibling functions outside of its immediate viewpoint.

### 10. Local State Caching & Security
* **The Rule:** Optimize the experience and protect the data.
* **The Impact:** Ensures UI toggles are immediately persisted in localized Browser `localStorage` (via the `sk8lytz_` namespace), preventing annoying page-reload resets, while absolutely rejecting hardcoded passwords or API keys from ever being written into standard `.js` files.
