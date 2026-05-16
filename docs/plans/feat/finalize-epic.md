# Implement Epic Orchestration Rules (`/finalize_epic`)

The goal of this task is to completely eliminate our workflow confusion by building a single, streamlined master-script that handles Epic deployment and Ledger archiving in 1 fell swoop.

## User Review Required

Please review the new proposed workflow script. This will formally standardize how we deploy full code blocks from an Epic into Production without any manual command clutter.

## Proposed Changes

### Configuration (`.agents/workflows/finalize_epic.md`)

#### [NEW] [finalize_epic.md](file:///d:/GitHub/neogleamz.github.io/.agents/workflows/finalize_epic.md)
I will build a new centralized `.md` rule file that governs what happens when an entire Epic is fully checked off in our Bucket List. When you type `[/finalize_epic]`, the AI will sequentially automate:

1. **The Spillover Scan Gate:** Check the Bucket List. Are there any incomplete (`- [ ]`) tasks left in this Epic block? If yes, HALT and ask the user if they want to physically *Spillover* those tasks to the backlog, or cancel the deployment.
2. **The Production Merge:** Execute `git checkout main` and perform a clean merge of the completed `epic/*` branch directly into production.
3. **The Ledger Archive Protocol:** Convert all `- [x]` marks into `- [🚀]` in the Bucket List and gracefully move the entire Epic block down into the `🗄️ Completed & Archived Epics` section.
4. **The Release Routing Decision:** The workflow will explicitly prompt you: *"Epic merged firmly into Main! Do you want me to formally version-bump this release `/release` or stealth-sync the internal changelog `/release_silent`?"* Based on whatever choice you make, the script invokes the matching sub-routine perfectly.
5. **Clean Local:** Run `git branch -d <epic-branch>`.

### Design Decisions & Rationale
Currently, our `[/ship_it]` script was specifically written by us to only merge `feat/` branches safely into an `epic/` branch. It lacks the logic to cleanly migrate full Epics into `main`. By building a totally separated, dedicated `[/finalize_epic]` command, we enforce a strict, bulletproof line between "shipping a daily task" and "deploying an entire project."

## Open Questions

Does visually seeing the sequential logic I intend to program for `[/finalize_epic]` immediately clear up all my previous confusing explanations? 

## Verification Plan

### Manual Verification
- We will visually verify the Markdown syntax logic of the newly constructed script directly in your editor.
