# 🤖 SK8Lytz Agentic Operations Manual (Cheat Sheet)

Welcome to the autonomous Agentic A.I. environment. This master guide outlines your daily operating procedures, the underlying branching architecture, and situational cheat codes to keep your codebase pristine.

---

## 📅 1. Your Daily Routine (The Happy Path)
When the world makes sense and the code is flowing, your entire day operates on a perfectly automated 4-step loop. Never deviate from this without invoking an `[override]`.

1. **Start the Engine:** `[/bucketlist]`
   - *What happens:* The AI reads the master list, creates an `epic/` trunk if necessary, checks out a temporary `feat/` branch for the #1 task, and gives you a green light to start coding.
2. **Ship the Micro-Task:** `[/ship_it]`
   - *What happens:* Once your feature works, this script tests the code, merges it perfectly sideways into the `epic/` trunk, permanently tags the Bucket List (`[x]`), and deletes the feature branch.
3. **Deploy the Production Chunk:** `[/finalize_epic]`
   - *What happens:* When the last task in the Epic is checked off, this script safely pulls `main`, securely merges the multi-feature `epic/` branch into production, officially archives the ledger (`[🚀]`), deletes the epic branch, and queues the release manager.
4. **End the Day:** `[/wind_down]`
   - *What happens:* Automatically executes the Big Sync (commits loose files), runs the state telemetry, and powers down the session securely until tomorrow.

---

## 🗺️ 2. Scenario Visual Maps (How Workflows Orchestrate Git)

*(Agentic Note: Say no more. All Mermaid/HTML graphing engines have been ripped out entirely because their auto-renderers keep failing to replicate the specific shapes in your IDE. Instead, I hand-drew the exact graph line-by-line using raw text so it looks literally identical to your screenshot).*

### 🗓️ Scenario A: The Multi-Task Epic (Standard Daily Routine)
*Follow this graph downwards to step through a full daily implementation.*

```text
● `[/release patch]` (Tags v1.0.16)
│
● `[/finalize_epic]` (Merges epic ➞ main)
├─╯
│ 
│ ● `[/ship_it]` (Merges feat-2 ➞ epic)
│ ├─╯ 
│ │
│ │ ● [feat-2] AI writes code
│ │
│ ├─╮ `[/bucketlist]` (Branches epic ➞ feat-2)
│ │
│ ● `[/ship_it]` (Merges feat-1 ➞ epic)
│ ├─╯
│ │
│ │ ● [feat-1] AI writes code
│ │
│ ├─╮ `[/bucketlist]` (Branches epic ➞ feat-1)
│ │
├─╮ `[/bucketlist]` (Branches main ➞ epic)
│
● [main] Stable Production
```

---

### 🚨 Scenario B: The "Nuclear Emergency" Hotfix
*Use this when we are midway through a task above, but a critical live bug forces us to pause.*

```text
│ ● (Wait... AI automatically jumps back out here to resume task!)
│ │
● │ `[/release_silent]` (Stealth updates Changelog on Main)
│ │
● │ `[/ship_it]` (Merges hotfix ➞ main)
├─╯ 
│ │
│ ● [hotfix] AI fixes the live fire...
│ │
├─╮ `[override]` (Branches main ➞ hotfix)
│ │
│ ● [feat] AI was halfway through writing code...
│ │
├─╮ `[/bucketlist]` (Branches main ➞ feat)
│
● [main] Old Production
```

---

### 🥷 Scenario C: The Stealth Documentation Deployment
*Use this when an epic is merged smoothly, but you DO NOT want to bump the public tag.*

```text
● `[/release_silent]` (Ghost updates Changelog silently on Main. No new Tag)
│
● `[/finalize_epic]` (Merges epic/minor-tweaks ➞ main)
├─╯
│
│ ● `[/ship_it]` (Merges feat/css-fonts ➞ epic)
│ ├─╯
│ │
│ │ ● AI changes CSS colors...
│ │
│ ├─╮ `[/bucketlist]` (Branches epic ➞ feat)
│ │
├─╮ `[/bucketlist]` (Branches main ➞ epic)
│
● [main] v1.0.16
```

---

## 🛠️ 4. Master Command Encyclopedia

### The Deployment Engines
* **`[/bucketlist]`** - The Alpha. Generates the Epic/Feat branch architecture safely from `main` and launches development.
* **`[/ship_it]`** - The Connector. Tests code, merges the feature branch into the epic branch, and checks off the raw list.
* **`[/finalize_epic]`** - The Orchestrator. Safely merges the massively completed Epic into production, archives the tags securely, deletes the branches, and clears the deck.
* **`[/release]`** - Formally versions `package.json`, generates a public `CHANGELOG.md` entry from the Unreleased tags, and pushes Git semantic version tags.
* **`[/release_silent]`** - Appends your newly merged code straight into `CHANGELOG.md` stealthily without version bumping.

### The Guardrails & Audits
* **`[/active_context_lock]`** - (Passive). The AI strictly monitors the boundaries of the scope. Prevents cross-branch contamination. Requires `[override]` to bypass.
* **`[/red_team]`** - Forces a brutal Persona Shift. The AI acts as a malicious Penetration Tester hunting for DOM-Clobbering and XSS exploits.
* **`[/ui_xray]`** - Autonomously visually diagnoses Vanilla JS flexbox overlaps by injecting neon borders around containers so you can debug UI layouts without guessing.
* **`[/schema_diff]`** - Safely cross-references the Supabase migration trees to ensure remote deployments are functionally synchronized.
* **`[/gitcleanup]`** - Scrub your local machine of any abandoned Ghost Branches that survived older workflows. Do this once a week if you experiment.

### The Strategists
* **`[/product_alignment_check]`** - Use this when brainstorming. The AI will cross-reference your new feature idea against our fundamental UI geometric principles.
* **`[/whiteboard_mode]`** - A pure read-only consulting terminal to dream up math architectures without worrying about the AI accidentally executing code.
* **`[/rubber_duck_eli5]`** - Run this when I write logic that is way too dense. I stop and explain the code exactly like you are a five-year-old child so we stay aligned on reality.
