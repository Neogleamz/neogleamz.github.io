---
name: ship_it
description: "Executes the code audit, documentation check, and git merge sequence to finalize a feature branch."
trigger: "/ship_it, /ship-it, ship it, merge task, finalize branch"
---

# Ship It Workflow

// turbo-all
When the user invokes `/ship-it` (or says "ship it", "merge task", or "finalize branch"), you must act as the Release Manager and execute the following sequence:

1. **Verify Context**: Run `git branch --show-current` to ensure we are currently on a feature branch (e.g., `feature/...`, `fix/...`, or `chore/...`).
2. **Find Base**: If you remember the Epic Target from the bucket list context, use it. If unable to determine the base branch, explicitly ask the user which branch to merge into (e.g., `epic/device-registration` or `main`).
3. **Pre-Flight Code Audit (Zero-Trust Gate)**: Act as a Senior Vanilla JS Engineer. Review the critical files changed on this feature branch for:
   - Security flaws (e.g., hardcoded secrets, unhandled exceptions).
   - Performance bottlenecks (e.g., memory leaks from uncleared native event listeners, expensive DOM reflows, unoptimized loops).
   - Code cleanliness and proper modular architecture.
   - **Continuous QA Command (CRITICAL):** You MUST execute `npm test` and `npx eslint .` in the terminal to verify zero regressions and zero syntax flaws. You are strictly forbidden from executing a merge if either command throws an error.
   *If any issues or test failures are flagged, list them out and **HALT**. Wait for permission to either fix them or abort the merge.*
4. **Ledger Reconciliation**: Open `@/tools/SK8Lytz_Bucket_List.md`. Review the active queues (P0, P1, P2). Did the code changes you just made accidentally or intentionally fulfill any *other* unchecked `[ ]` tasks, even if they belong to a different Epic block? If yes, explicitly check them off (`[x]`) right now to prevent orphaned tasks.
5. **Database Sync Gate**: Check if any `.sql` files in `supabase/migrations/` were created or modified. If yes, you MUST invoke the `/supabase_sync` protocol to ensure `npx supabase db push` is executed and documentation is updated BEFORE merging.
6. **Knowledge Audit Gate**: Evaluate if this feature branch established new critical knowledge (DB tables, Bluetooth commands, global contexts). If yes, ensure it is documented in @/tools/SK8Lytz_App_Master_Reference.md using your standard editing tools before proceeding.
7. **Merge Routine & Conflict Check**:
   - Run `git checkout <base-branch>`.
   - **CRITICAL HYDRATION GATE:** Run `git pull origin <base-branch>` to absorb any concurrent merges and prevent `non-fast-forward` crashes.
   - Run `git merge --no-ff <feature-branch> -m "chore(merge): integrate <feature-branch>"`.
   - **CRITICAL:** Run `git status`. If there are merge conflicts, you must **HALT**, output the conflicted files to the chat, and wait for the user to resolve them. Do NOT proceed to step 8.
8. **Push to Remote**: If the merge was clean, run `git push origin <base-branch>` (if a remote is configured).
9. **Clean Local**: Run `git branch -d <feature-branch>`.
10. **Halt and Confirm**: Present the final SITREP using the mandatory output format below, then ask the user what the next priority is.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

> [!CAUTION]
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks (like ile.md). You MUST ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).


After the merge is complete, you MUST render a structured **Gate Results Table** and a **Boy Scout Audit** block. Do NOT output a plain text summary. The exact template is:

### Gate Results Table
Render a Markdown table with every gate from above, its result (✅ PASS, ❌ FAIL, ⏭️ SKIPPED), and a brief detail:

```
| Gate | Result | Detail |
|---|---|---|
| 🌿 Branch Verified | ✅ | `feat/xxx` → `main` |
| 🧪 Tests (`npm test`) | ✅ | 27/27 PASS |
| 🔎 ESLint (`npx eslint`) | ✅ | 0 errors (N warnings) |
| 📋 Ledger Reconciliation | ✅ | N task(s) marked `[x]` |
| 💾 Database Sync Gate | ⏭️ | No `.sql` migrations found |
| 📚 Knowledge Audit Gate | ⏭️ | No new protocols documented |
| 🔀 Merge | ✅ | Clean, no conflicts |
| 🚀 Push | ✅ | `origin/main` updated |
| 🧹 Cleanup | ✅ | Feature branch deleted locally |
```

### Boy Scout Audit
If a Boy Scout cleanup was performed during the pre-flight, render a `> [!NOTE]` block describing exactly what was fixed. If none was applicable, state why using a `> [!TIP]` block.

### Workflow Suggestions
After the table, render a `> [!TIP]` block suggesting the next most logical workflow (e.g., `/release`, `/wind_down`, `/status_update`). Briefly explain why.