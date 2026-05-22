---
name: release_silent
description: "Gracefully updates the Bucket List ledger and internal CHANGELOG.md directly after a /ship_it without triggering formal version bumps or tags."
trigger: "/release_silent, silent release, silent sync"
---

# Silent Release Workflow

// turbo-all
When the user invokes `/release_silent` (or instructs you to do a "silent release"), you must act as the Ledger Arbitrator and execute a stealth documentation sync.

### Purpose
To be used immediately after running `/ship_it` on an Epic merging to `main`, when the user does **not** want to increment the public `package.json` version but still wants to preserve the release notes internally in the ledger and changelog.

### Execution Protocol

1. **Scan the Ledger**:
   - Parse `@/tools/SK8Lytz_Bucket_List.md`.
   - Identify all completed items (`- [x]`) that have been verified as shipped.
   - **CRITICAL:** Ensure you scan the entire document globally. Pay special attention to the `## 🧹 Technical Debt` section to catch standalone orphan tasks that were not part of the active Epic block.
   - **Network Sync Bypass:** If zero `- [x]` tasks are found, you must explicitly declare a Network Sync Bypass. You will skip Steps 2 and 3 entirely.
2. **Commit Archival Tags (`[🚀]`)**:
   - Use your file editing tools to surgically replace the `- [x]` checkboxes for those completed tasks with the `- [🚀]` tag.
   - **CRITICAL:** Do NOT delete the tasks. They must remain exactly where they are in the *🗄️ Completed & Archived Epics* section. 
3. **Silent Changelog Update**:
   - Open `@/CHANGELOG.md`.
   - If an `## [Unreleased]` heading does not exist at the top of the file (below the main title), inject it.
   - Append the completed tasks as bullet points under the `## [Unreleased]` block.
   - Note: Do **NOT** touch `package.json`. Do **NOT** apply any standard `git tag`.
4. **Ghost Commit & Network Sync**:
   - If tasks were found: Stage the changes (`git add tools/SK8Lytz_Bucket_List.md CHANGELOG.md`) and execute the silent commit (`git commit -m "chore(ledger): silent agentic tag transition to [🚀] and unreleased log"`).
   - If **Network Sync Bypass** is active: You are strictly forbidden from executing `git add` or `git commit`. 
   - Execute the Remote Sync: `git push` (If a remote tracking branch is upstream).
5. **Halt and Confirm**: Present the results using the mandatory output format below.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

You MUST render the confirmation using the following exact Markdown structure. Do NOT output a plain text confirmation. Every model (Claude, Gemini, GPT) must produce this exact structure:

### 🔇 Silent Release Confirmation

Render a **Gate Results Table**:
*(If a Network Sync Bypass was executed, mark Ledger Scan, Archival Tags, Changelog Update, and Ghost Commit as `⏭️ SKIPPED`, and Remote Push as `✅ PASS`.)*
```
| Gate | Result | Detail |
|---|---|---|
| 📋 Ledger Scan | ✅ | N task(s) found with `[x]` (or 0 found) |
| 🚀 Archival Tags | ✅ | N task(s) transitioned to `[🚀]` |
| 📝 Changelog Update | ✅ | Appended to `## [Unreleased]` block |
| 💾 Ghost Commit | ✅ | `abc1234` — silent sync |
| 📡 Remote Push | ✅ | `origin/main` updated |
```

### 📋 Tasks Archived
Render a bulleted list of every task that was transitioned from `[x]` to `[🚀]`, including its branch slug. If a Network Sync Bypass was executed, output: *"None. Executed Network Sync Bypass."*

### 🎯 Next Steps
Render a `> [!TIP]` block suggesting `/wind_down` to end the session or `/status_update` to check the queue.
