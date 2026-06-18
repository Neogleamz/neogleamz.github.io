---
description: Audit, QA-gate, and merge the current feature branch into its base (Release Manager sequence).
argument-hint: "[base-branch] (optional; otherwise inferred or asked)"
allowed-tools: Bash(git*), Bash(npm test), Bash(npm run*), Bash(npx eslint*), Read, Edit, Grep, Glob
---

# Ship It

Act as the Release Manager and execute this sequence. Base branch (if provided): $1

1. **Verify context** — `git branch --show-current`; confirm we're on a feature branch (`feat/*`, `fix/*`, `chore/*`).
2. **Find base** — use the Epic target from the Bucket List if known; otherwise ask which branch to merge into (e.g. `main`).
3. **Pre-flight code audit (zero-trust gate)** — review changed files for security flaws (hardcoded secrets, unhandled exceptions), performance (uncleared native listeners, DOM reflows, unoptimized loops), and modular cleanliness. **You MUST run `npm test` and `npx eslint .`** and are forbidden from merging if either errors. If anything fails, list it and **HALT** for permission to fix or abort.
4. **Ledger reconciliation** — open [tools/SK8Lytz_Bucket_List.md](tools/SK8Lytz_Bucket_List.md); check off (`[x]`) any tasks these changes fulfilled, even across Epics.
5. **Database sync gate** — if any `supabase/migrations/*.sql` changed, invoke `/supabase-sync` before merging. (Note: remote migration history is empty — apply DDL via the Supabase SQL Editor, not `db push`.)
6. **Knowledge audit gate** — if new DB tables / BLE commands / global contexts were introduced, document them in [tools/SK8Lytz_App_Master_Reference.md](tools/SK8Lytz_App_Master_Reference.md).
7. **Merge & conflict check** — `git checkout <base>`; **`git pull origin <base>`** (hydration gate); `git merge --no-ff <feature> -m "chore(merge): integrate <feature>"`; then `git status` — if conflicts, **HALT**, list them, wait for the user. Do not proceed.
8. **Push** — if clean, `git push origin <base>`.
9. **Clean local** — `git branch -d <feature>`.
10. **SITREP** — render the output format below, then ask for the next priority.

## Output format
Render a **Gate Results Table** (do not summarize as prose):

| Gate | Result | Detail |
|---|---|---|
| 🌿 Branch verified | ✅/❌ | `feat/xxx` → `main` |
| 🧪 Tests (`npm test`) | ✅/❌ | N/N pass |
| 🔎 ESLint | ✅/❌ | 0 errors (N warnings) |
| 📋 Ledger | ✅/⏭️ | N task(s) `[x]` |
| 💾 DB sync | ✅/⏭️ | migrations? |
| 📚 Knowledge audit | ✅/⏭️ | new protocols? |
| 🔀 Merge | ✅/❌ | clean / conflicts |
| 🚀 Push | ✅/⏭️ | `origin/<base>` |
| 🧹 Cleanup | ✅ | branch deleted |

Then a short **Boy Scout** note (what debt you cleaned, or why none applied) and a **next-workflow tip** — after shipping to `main`, suggest `/release` (version bump) or `/silent-release` (changelog only).
