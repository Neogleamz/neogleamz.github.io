# Implementation Plan — Make XSS Audit Gate Blocking in Pre-Commit Hook

**Branch slug:** `debt/tooling-1`
**Task type:** `chore` (tooling hardening, no app runtime code touched)
**Scope:** `.githooks/pre-commit` ONLY. Do not touch CLAUDE.md, `.claude/*`, `scripts/xss-audit.js`, or any `docs/plans/` historical file.

## 1. Summary

The codebase has reached 0 XSS violations (per `scripts/xss-audit.js`). The git pre-commit hook currently runs the audit in `--warn` (advisory, always-exit-0) mode. This task removes `--warn` from the pre-commit invocation so the hook actually blocks commits if a future violation is introduced, and updates the stale explanatory comment above it.

`scripts/xss-audit.js` already has correct exit-code branching (`process.exit(WARN_MODE ? 0 : 1)` at line 217, plus an earlier unconditional `process.exit(0)` at line 195 for the true zero-findings case). No changes to that script are required — removing `--warn` from the caller is sufficient.

## 2. Exact Diff — `.githooks/pre-commit`

Confirmed by direct `Read` of the live file (not assumed from the mapper report).

**Current (lines 30-33):**
```js
  // 2. XSS audit — scans index.html + assets/js/ for forbidden DOM injection patterns.
  // Running in --warn (advisory) mode until all known violations in the Bucket List
  // § 🧹 Technical Debt are resolved. After that, remove --warn to make this blocking.
  execSync('node scripts/xss-audit.js --warn', { stdio: 'inherit' });
```

**New (lines 30-33):**
```js
  // 2. XSS audit — scans index.html + assets/js/ for forbidden DOM injection patterns.
  // Blocking mode: all known violations in the Bucket List § 🧹 Technical Debt have
  // been resolved (0 violations as of 2026-07-01). Any new violation aborts the commit.
  execSync('node scripts/xss-audit.js', { stdio: 'inherit' });
```

Everything else in the file (root-whitelist check at lines 11-28, version-bump block at lines 35-37, and the `try/catch` error handling at lines 38-44) is unchanged. The existing `catch` block already correctly propagates a non-zero exit from `execSync` (line 39: `if (err.status === 1 || process.exitCode === 1) { process.exit(1); }`), so no changes are needed there — blocking behavior will now actually engage instead of being unreachable dead logic.

This is a **2-line functional change** (1 line of code, replace 3 lines of comment with 3 updated lines) — no other edits in scope.

## 3. Security Considerations

- **Net-positive hardening, not a new attack surface.** This change makes an existing security gate *stricter* (advisory → blocking). It closes the gap where a real XSS violation could be committed silently because the hook always exited 0 regardless of findings.
- **No XSS/RLS surface touched.** `.githooks/pre-commit` is a local tooling/CI script, not app runtime code — it is never shipped to `index.html` or `assets/js/*`, never served to end users, and has no DOM/Supabase interaction. The "DOM security (XSS)" allowed/forbidden patterns in CLAUDE.md govern `element.innerHTML`/`insertAdjacentHTML`/etc. in app code; none of that applies here.
- **No RLS implication.** No Supabase table, column, policy, or query is touched by this change.
- **Scope discipline confirmed:** per the mapper's findings, `CLAUDE.md`, `tech-debt-janitor.md`, `bucketlist.md`, `xss-validator.md`, `security-scout.md`, and `.claude/settings.json` all reference `xss-audit.js --warn` for *subagent* mid-task validation workflows — those are intentionally advisory (a swarm agent shouldn't hard-fail while other agents are still mid-edit on a shared file) and are explicitly OUT of scope for this task. Only the git pre-commit hook's own invocation changes.

## 4. Vanilla JS Constraints

N/A for runtime — `.githooks/pre-commit` is a Node CLI script (already uses `const`/`require`/`execSync`, no `var`, no framework), consistent with existing style. The edit preserves this; no new syntax patterns introduced.

## 5. 4-State UX / UI Mutex / Zero-Refresh

**Not applicable.** This is a tooling file with no UI, DOM, or user-facing component. No Loading/Error/Empty/Success states, no `window.executeWithButtonAction`, no render function to re-invoke.

## 6. Schema Changes

**None.** No Supabase table/column/RLS change. No Master Reference update required.

## 7. Verification Steps

Per task instructions, do **not** make a real test commit (that would trigger the full hook chain including `npm run version:bump`, which mutates `assets/js/system-version.js` / `index.html` and is undesirable for a verification-only step). Instead, verify the script's exit behavior directly:

1. After editing `.githooks/pre-commit`, run the audit script directly, with no `--warn` flag, exactly as the new hook line will invoke it:
   ```
   node scripts/xss-audit.js
   ```
2. Confirm console output ends with `✅  XSS audit passed — 0 violations found.` (script line 194) and the process exit code is `0`. In PowerShell, check via `$LASTEXITCODE` immediately after the command; in Bash, `echo $?`.
3. Optionally re-run with `--warn` to confirm behavior is unchanged for the advisory-mode consumers listed in §3 (subagents, CI) — this is a read-only sanity check, not a required step, since that code path is untouched.
4. Do NOT run `git commit` as a live test. Do NOT run `npm run version:bump` manually as a side effect of testing.
5. `git diff .githooks/pre-commit` — confirm the diff is exactly the 1 code line + 3 comment lines described in §2, nothing else.

## 8. Files Touched

- `.githooks/pre-commit` — remove `--warn` from the `xss-audit.js` `execSync` call (line 33); update the explanatory comment above it (lines 31-32) to reflect blocking status.

No other files are touched by this task.
