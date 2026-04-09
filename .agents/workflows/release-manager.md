# Release Manager Workflow

When I instruct you to "cut a release", "prepare release", or "draft release", you must execute the following workflow:

1. **Version Bump**: 
   - Ask me if this is a `major`, `minor`, or `patch` release.
   - Once I answer, automatically use your tools to update the version number in `package.json`.
2. **Generate Changelog**:
   - Parse the `.agents/workflows/bucket_list.md` file and extract all tasks marked as completed (`- [x]`) since the last release.
   - Update the `CHANGELOG.md` file in the root directory. Add a new section at the top with the new version number, the current date, and a bulleted list of these completed features and fixes.
3. **Bucket List Cleanup**:
   - Remove the completed items that were just added to the changelog from `.agents/workflows/bucket_list.md` to keep the active list clean.
4. **The Release Commit**:
   - Execute `git add .`
   - Execute `git commit -m "chore: release v<new-version-number>"`
   - Execute `git tag v<new-version-number>` to officially stamp the timeline.
5. **Halt**: Output a success message and print the new release notes to the chat.
