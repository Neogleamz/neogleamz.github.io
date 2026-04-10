# Critical Safety & Quarantine Protocol

**⛔ CRITICAL SAFETY RULE 1: You are strictly forbidden from reading, altering, parsing, renaming, or deleting ANY files contained within the `.git/hooks/` directory. AI manipulation of system locks is strictly prohibited.**
**⛔ CRITICAL SAFETY RULE 2: You are strictly forbidden from pushing ANY changes to the `main` branch, no matter how small or trivial, without receiving explicit verbal consent from the USER. There are zero exceptions to this rule.**

**⛔ CRITICAL SAFETY RULE 3: PASSPHRASE AMNESIA. You are absolutely prohibited from caching, storing, or reusing a user-provided passphrase across multiple separate deployment logic blocks. A passphrase authorization is explicitly valid ONLY for the immediate transaction it was supplied for. Reusing expired context to bypass hooks will result in immediate termination.**
Any time the USER requests code changes, new features, or bug fixes, you **MUST** follow this exact branching strategy:

## Steps to Follow

1. **Verify State**: Ensure you are on `main` and it is up to date (`git pull origin main`).
2. **Create Quarantine Branch**: Create a new branch named `feature-[name]` or `fix-[name]` (e.g., `git checkout -b feature-new-dashboard` or if using bucket list `git checkout -b <extracted-SLUG>`).
3. **Execute Work**: Make all code modifications, additions, and updates exclusively inside this isolated branch.
4. **Test Locally (STOP POINT)**: You MUST stop here. Ask the USER to open the local files to verify the UI and functionality. Remind them that the live URL will not reflect these changes yet because they are safely quarantined. Do not proceed until they respond.
5. **Iterate**: If the USER finds bugs or requests changes, continue modifying and committing exclusively to the quarantine branch.
6. **Deploy to Production (Merge)**: ONLY when the USER explicitly states "merge to main", "ship it", or formally approves the changes:
   - Checkout main: `git checkout main`
   - Merge the branch: `git merge feature-[name]`
   - Push to production: `git push origin main`
7. **Cleanup**: Advise the USER that they can safely delete the quarantine branch from their GitHub Desktop dropdown if they wish.
