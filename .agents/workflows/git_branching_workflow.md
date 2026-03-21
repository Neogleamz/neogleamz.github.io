---
description: Formal Git Branching Strategy for all code modifications
---

# Neogleamz - Zero-Risk Branching Workflow

Any time the USER requests code changes, new features, or bug fixes, you **MUST** follow this exact branching strategy. Do not commit directly to the `main` branch unless it is an absolute catastrophic emergency that requires an immediate hotfix.

## Steps to Follow

1. **Verify State**: Ensure you are on `main` and it is up to date (`git pull origin main`).
2. **Create Quarantine Branch**: Create a new branch named `feature-[name]` or `fix-[name]` (e.g., `git checkout -b feature-new-dashboard`).
3. **Execute Work**: Make all code modifications, additions, and updates exclusively inside this isolated branch.
4. **Test Locally**: Ask the USER to open the local files via `C:\Users\Chriviper\...` to verify the UI and functionality. Remind them that the live `.com` URL will not reflect these changes yet because they are safely quarantined.
5. **Iterate**: If the USER finds bugs or requests changes, continue modifying and committing exclusively to the quarantine branch.
6. **Deploy to Production (Merge)**: ONLY when the USER formally approves the changes and confirms everything looks perfect locally:
   - Checkout main: `git checkout main`
   - Merge the branch: `git merge feature-[name]`
   - Push to production: `git push origin main`
7. **Cleanup**: Advise the USER that they can safely delete the quarantine branch from their GitHub Desktop dropdown if they wish.
