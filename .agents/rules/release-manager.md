---
name: release
description: "Executes the version bump, changelog generation, and tagging sequence to cut a new release."
trigger: always_on
---

# Release Manager Workflow

When the user invokes `/release` (or instructs you to "cut a release", "prepare release", or "draft release"), you must act as the Release Manager and execute the following sequence:

1. **Version Bump**: 
   - Ask the user if this is a `major`, `minor`, or `patch` release.
   - Once answered, use your native tools to update the version number in `@/package.json`.
2. **Generate Changelog**:
   - Parse `@/tools/SK8Lytz_Bucket_List.md` (processing in chunks if it exceeds 30,000 characters).
   - Extract all tasks marked as completed (`- [x]`) since the last release.
   - Use your native tools to update `@/CHANGELOG.md`. Inject a new section at the top with the new version number, the current date, and a bulleted list of these completed features and fixes.
3. **Bucket List Cleanup**:
   - Strictly adhering to the *Surgical Strike Protocol*, carefully remove the completed items that were just added to the changelog from `@/tools/SK8Lytz_Bucket_List.md` to keep the active list clean. Do not overwrite the entire file.
4. **The Release Commit & Tag**:
   - Execute `git status` to ensure you know what is currently modified.
   - Stage ONLY the release files by executing: `git add package.json CHANGELOG.md tools/SK8Lytz_Bucket_List.md`
   - Execute the release commit: `git commit -m "chore(release): bump to v<new-version-number>"`
   - Execute the tag: `git tag v<new-version-number>` to officially stamp the timeline.
5. **Halt**: Output a success message, confirm the tag was created, and print the newly generated release notes to the chat.
