---
description: Audit, QA-gate, and merge the current feature branch into its base (Release Manager sequence).
argument-hint: "[base-branch] (optional; otherwise inferred or asked)"
allowed-tools: Bash(git*), Bash(npm test), Bash(npm run*), Bash(npx eslint*), Read, Edit, Grep, Glob
---

# Ship It

Act as the Release Manager and execute this sequence. Base branch (if provided): $1

1. **Verify context** — `git branch --show-current`; confirm we're on a feature branch (`feat/*`, `fix/*`, `chore/*`).
2. **Find base** — use the Epic target from the Bucket List if known; otherwise ask which branch to merge into (e.g. `main`).
3. **Pre-flight validation swarm (zero-trust gate)** — spawn the following three agents in parallel before touching the merge:
   - **XSS Gate:** Run `node scripts/xss-audit.js` (no `--warn` — this is blocking mode). If any violations are reported, **HALT** and list them. Forbidden from merging until zero violations exist in changed files.
   - **Test + Lint Gate:** Run `npm test` and `npx eslint .`. **HALT** if either errors.
   - **Diff Reviewer:** Read the full `git diff <base>...<feature>` and review for: hardcoded secrets, unhandled exceptions, missing `try/catch` on async calls, uncleared DOM listeners, missing `window.executeWithButtonAction` on mutation buttons, any `var` declarations, any inline `onclick=` / `onchange=` attributes.
   
   Synthesize all three into a Gate Results Table. If anything fails: list it and **HALT** for permission to fix or abort.
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
| 🔒 XSS audit | ✅/❌ | N violations (0 = pass) |
| 🧪 Tests (`npm test`) | ✅/❌ | N/N pass |
| 🔎 ESLint | ✅/❌ | 0 errors (N warnings) |
| 🕵️ Diff review | ✅/❌ | secrets / listeners / patterns |
| 📋 Ledger | ✅/⏭️ | N task(s) `[x]` |
| 💾 DB sync | ✅/⏭️ | migrations? |
| 📚 Knowledge audit | ✅/⏭️ | new protocols? |
| 🔀 Merge | ✅/❌ | clean / conflicts |
| 🚀 Push | ✅/⏭️ | `origin/<base>` |
| 🧹 Cleanup | ✅ | branch deleted |

Then a short **Boy Scout** note (what debt you cleaned, or why none applied) and a **next-workflow tip** — after shipping to `main`, suggest `/release` (version bump) or `/silent-release` (changelog only).
