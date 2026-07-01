---
model: sonnet
description: Executes the version bump, changelog generation, and tagging sequence to cut a new release. (triggers: /release, cut a release, prepare release, draft release)
allowed-tools: Bash(git*), Bash(npm*), Bash(npx*), Read, Edit, Write, Grep, Glob
---

# Release Manager Workflow

When the user invokes `/release` (or instructs you to "cut a release", "prepare release", or "draft release"), you must act as the Release Manager and execute the following sequence:

1. **Version Bump**: 
   - Ask the user if this is a `major`, `minor`, or `patch` release.
   - Once answered, use your native tools to update the version number in `@package.json`.
2. **Generate Changelog**:
   - Parse `@tools/SK8Lytz_Bucket_List.md` (processing in chunks if it exceeds 30,000 characters).
   - Extract all tasks marked as completed (`- [x]`) since the last release.
   - **CRITICAL:** Ensure you scan the entire document globally. Pay special attention to the `## 🧹 Technical Debt` section to catch standalone orphan tasks that were not part of an active Epic.
   - Use your native tools to update `@CHANGELOG.md`. 
   - **Crucial Unreleased Merge**: Check if there is an `## [Unreleased]` block at the top of the changelog from previous silent releases. If so, merge its contents into your new bulleted list. Rename the section or create a new header at the top with the new version number (`## [vX.Y.Z]`), the current date, and the combined bulleted list.
3. **Bucket Ledger Integration**:
   - To maintain the Bucket List as a permanent, immutable ledger, **DO NOT delete** the completed tasks from `@tools/SK8Lytz_Bucket_List.md`. 
   - Instead, use your code tools to safely replace the checkboxes of the items you just added to the changelog from `- [x]` to `- [🚀]` (Shipped). This permanently preserves the history in the file while preventing those tasks from being duplicated in future release logs.
4. **The Release Commit & Tag**:
   - Execute `git status` to ensure you know what is currently modified.
   - Stage ONLY the release files by executing: `git add package.json CHANGELOG.md tools/SK8Lytz_Bucket_List.md`
   - Execute the release commit: `git commit -m "chore(release): bump to v<new-version-number>"`
   - Execute the tag: `git tag v<new-version-number>` to officially stamp the timeline.
5. **Halt**: Present the final release summary using the mandatory output format below.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

> [!CAUTION]
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks (like ile.md). You MUST ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).

After the tag is created, you MUST render the following structured output. Do NOT output a plain text summary. Every model (Claude, Gemini, GPT) must produce this exact structure:

### 1. Release Confirmation Block
Render a `> [!NOTE]` block confirming the tag was created, including the tag name, commit hash, and system version:
```
> [!NOTE]
> 🏷️ **Tag `vX.Y.Z` confirmed** on `origin/main` at commit `abc1234` — `v.YYYY.MM.DD.HHMM`
```

### 2. Release Notes
Render a formatted Markdown release notes block with the version number as a header (`## 📋 Release Notes — vX.Y.Z (YYYY-MM-DD)`), followed by subsections for each changelog category (`### ✨ Features & Bug Fixes`, `### 🧹 Chores & Cleanup`, etc.). Each item should be a bold-titled bullet.

### 3. Next Steps Prompt
Render a `> [!TIP]` block suggesting logical next actions (e.g., `/wind_down`, `/status_update`, or picking the next Bucket List item). Briefly explain the state of the active task queue.
