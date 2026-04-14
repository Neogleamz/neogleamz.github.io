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
2. **Commit Archival Tags (`[🚀]`)**:
   - Use your file editing tools to surgically replace the `- [x]` checkboxes for those completed tasks with the `- [🚀]` tag.
   - **CRITICAL:** Do NOT delete the tasks. They must remain exactly where they are in the *🗄️ Completed & Archived Epics* section. 
3. **Silent Changelog Update**:
   - Open `@/CHANGELOG.md`.
   - If an `## [Unreleased]` heading does not exist at the top of the file (below the main title), inject it.
   - Append the completed tasks as bullet points under the `## [Unreleased]` block.
   - Note: Do **NOT** touch `package.json`. Do **NOT** apply any standard `git tag`.
4. **Ghost Commit**:
   - Stage the changes: `git add tools/SK8Lytz_Bucket_List.md CHANGELOG.md`
   - Execute the silent commit: `git commit -m "chore(ledger): silent agentic tag transition to [🚀] and unreleased log"`
   - If a remote tracking branch is upstream, push it: `git push`
4. **Halt and Confirm**:
   - Output a success message confirming the Ledger and repository are fully synced locally and remote without triggering a public Semantic Release.
   - You may now prompt the user to use `/wind_down`.
