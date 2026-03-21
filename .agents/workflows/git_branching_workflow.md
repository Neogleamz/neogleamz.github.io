---
description: Formal Git Branching Strategy for all code modifications
---

# Neogleamz - Zero-Risk Branching Workflow

**⛔ CRITICAL SAFETY RULE: You are strictly forbidden from pushing ANY changes to the `main` branch, no matter how small or trivial, without receiving explicit verbal consent from the USER. There are zero exceptions to this rule.**

Any time the USER requests code changes, new features, or bug fixes, you **MUST** follow this exact branching strategy:

## Steps to Follow

1. **Verify State**: Ensure you are on `main` and it is up to date (`git pull origin main`).
2. **Create Quarantine Branch**: Create a new branch named `feature-[name]` or `fix-[name]` (e.g., `git checkout -b feature-new-dashboard`).
3. **Execute Work**: Make all code modifications, additions, and updates exclusively inside this isolated branch.
4. **Test Locally (STOP POINT)**: You MUST stop here. Ask the USER to open the local files via `C:\Users\Chriviper\...` to verify the UI and functionality. Remind them that the live `.com` URL will not reflect these changes yet because they are safely quarantined. Do not proceed until they respond.
5. **Iterate**: If the USER finds bugs or requests changes, continue modifying and committing exclusively to the quarantine branch.
6. **Deploy to Production (Merge)**: ONLY when the USER explicitly states "merge to main" or formally approves the changes:
   - Checkout main: `git checkout main`
   - Merge the branch: `git merge feature-[name]`
   - Push to production: `git push origin main`
7. **Cleanup**: Advise the USER that they can safely delete the quarantine branch from their GitHub Desktop dropdown if they wish.