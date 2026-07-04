# Implementation Plan — Prune One-Shot Bash Grants from `.claude/settings.json`

**Plan doc slug:** `debt/hygiene-2` (this file) — task 2 of 2 in the `Hygiene Micro-Batch` epic. Task 1 (`debt/hygiene-1` — delete the seven orphaned section-header comments at `index.html:6353–6359`) is tracked in its own sibling plan and is **out of scope** here.
**Git branch:** `debt/hygiene` (shared with hygiene-1 per the ledger's epic grouping). If the branch doesn't exist yet: `git status` clean-check → `git checkout -b debt/hygiene` off an up-to-date `main`. If hygiene-1 already created it: `git checkout debt/hygiene`.
**Task type:** `chore` — Claude Code tool-permission hygiene. Zero application runtime behavior change; no file under `assets/js/`, `index.html`, or `supabase/` is touched.
**Scope:** `.claude/settings.json` ONLY.
**Explicitly out of scope:** `.claude/settings.local.json` (the gitignored sibling file). It already holds a large, separate set of one-shot diagnostic/security-probe grants (`git grep *`, `npm audit *`, several `node scratch/*.mjs` one-offs, raw Supabase API probe commands, etc.) — confirmed by direct read during planning. None of those are part of this ledger item, and this plan makes no recommendation to prune or relocate anything in that file. It is the *correct future home* for new one-shot grants (per the task framing) but requires no edit today.
**Bucket List source (verbatim):** `tools/SK8Lytz_Bucket_List.md:39` — *"`debt/hygiene` : **[.claude/settings.json](../.claude/settings.json)** — committed permission allowlist contains one-shot session grants (awk commands pinned to now-stale line numbers of packerz-module.js, a one-off grep, an echo). Prune to the durable entries only (`git checkout *`, `git pull *`, xss-audit) so the shared settings file stays curated. [Files: .claude/settings.json]"*

---

## 1. Summary

`.claude/settings.json` is the **committed, shared** (not gitignored) Claude Code permission allowlist — every session on this repo inherits it. It currently carries 9 entries under `permissions.allow`. Only 3 are durable/general-purpose; the other 6 are one-shot debugging fragments left over from the now-closed `findDynamicShopifyVariant()` dead-code investigation (deleted from `assets/js/packerz-module.js` in commit `1ed0399`, per `tools/SK8Lytz_Bucket_List.md:55` archived-epic notes). This task deletes those 6 stale entries and leaves the 3 durable ones untouched, in their existing order. This is a pure subtraction on a single JSON file — no new entries are added, no entry is relocated to `settings.local.json` (confirmed: none of the 6 have any future utility to relocate).

## 2. Verified Current State

Read fresh at planning time (`d:\GitHub\neogleamz.github.io\.claude\settings.json`), matches the explore-mapper's report byte-for-byte:

```
 1  {
 2    "permissions": {
 3      "allow": [
 4        "Bash(node scripts/xss-audit.js --warn)",
 5        "Bash(git checkout *)",
 6        "Bash(git pull *)",
 7        "Bash(node -e ' *)",
 8        "Bash(awk 'NR==229{print length\\($0\\); print}' \"d:/GitHub/neogleamz.github.io/assets/js/packerz-module.js\")",
 9        "Bash(awk 'NR==229{gsub\\(/[^ ]/,\"\",$0\\); print length\\($0\\)}' \"d:/GitHub/neogleamz.github.io/assets/js/packerz-module.js\")",
10        "Bash(awk 'NR==241{print length\\($0\\); print}' \"d:/GitHub/neogleamz.github.io/assets/js/packerz-module.js\")",
11        "Bash(grep -rn \"findDynamicShopifyVariant\" . --include=\"*.js\" --include=\"*.html\" --include=\"*.md\")",
12        "Bash(echo \"ESLINT EXIT CODE: $?\")"
13      ]
14    }
15  }
16
```
(16 lines total; line 16 is the trailing newline after the closing `}` — file ends `}\n`.)

**Classification (KEEP vs DELETE), confirmed against git history:**

| Line | Entry | Verdict | Why |
|---|---|---|---|
| 4 | `Bash(node scripts/xss-audit.js --warn)` | **KEEP** | General-purpose, explicitly mandated by CLAUDE.md's "Canonical scanner" section and the `security-scout` subagent's own runbook. Reusable forever. |
| 5 | `Bash(git checkout *)` | **KEEP** | General-purpose branch ops; sanctioned by CLAUDE.md's branching workflow (`git checkout -b fix/...`). |
| 6 | `Bash(git pull *)` | **KEEP** | General-purpose; sanctioned by CLAUDE.md's "Trunk hydration" and "Ledger hydration gate" rules (pull `main` before merging/editing the ledger). |
| 7 | `Bash(node -e ' *)` | **DELETE** | Malformed/truncated fragment — no discoverable purpose, and its own shape is a standing risk (see §4). |
| 8 | `awk 'NR==229{print length...}' packerz-module.js` | **DELETE** | Hardcoded line 229 of a file whose target function was deleted in commit `1ed0399`. Zero future utility. |
| 9 | `awk 'NR==229{gsub...}' packerz-module.js` | **DELETE** | Same as above — companion diagnostic for the same now-deleted debugging session. |
| 10 | `awk 'NR==241{print length...}' packerz-module.js` | **DELETE** | Same — hardcoded line 241, also stale post-deletion (function occupied roughly lines 211–251 before removal, per `docs/plans/debt/tooling-3.md`). |
| 11 | `grep -rn "findDynamicShopifyVariant" ...` | **DELETE** | Searches for a function that no longer exists anywhere in the repo (confirmed zero hits already, per `docs/plans/debt/tooling-3.md` §7 verification). |
| 12 | `Bash(echo "ESLINT EXIT CODE: $?")` | **DELETE** | Bare diagnostic one-liner tied to an ad hoc debugging session, no reusable value. |

## 3. Exact Edit — Before / After

### 3a. Precise `Edit` tool instruction

Re-`Read` the file immediately before editing (per CLAUDE.md's Surgical Edits rule), then apply one contiguous replacement. Because lines 4–6 (the 3 KEEP entries) are already first and already in the desired final order, the only change needed is: drop lines 7–12 in full, and drop the trailing comma that currently follows line 6 (since `"Bash(git pull *)"` becomes the last array element).

**`old_string`** (captures from the end of the `git pull *` entry through the closing `]`, so the comma-removal and the deletions happen as one atomic, unambiguous match):
```
      "Bash(git pull *)",
      "Bash(node -e ' *)",
      "Bash(awk 'NR==229{print length\\($0\\); print}' \"d:/GitHub/neogleamz.github.io/assets/js/packerz-module.js\")",
      "Bash(awk 'NR==229{gsub\\(/[^ ]/,\"\",$0\\); print length\\($0\\)}' \"d:/GitHub/neogleamz.github.io/assets/js/packerz-module.js\")",
      "Bash(awk 'NR==241{print length\\($0\\); print}' \"d:/GitHub/neogleamz.github.io/assets/js/packerz-module.js\")",
      "Bash(grep -rn \"findDynamicShopifyVariant\" . --include=\"*.js\" --include=\"*.html\" --include=\"*.md\")",
      "Bash(echo \"ESLINT EXIT CODE: $?\")"
    ]
```

**`new_string`:**
```
      "Bash(git pull *)"
    ]
```

This is a single, unique match in the file (the block only occurs once) and requires no reordering, no touching of lines 1–6, and no touching of lines 13–16 (`  }` / `}` / trailing newline) beyond the closing `]` already captured.

### 3b. Full resulting file (for review — this is what the file must look like after the edit)

```json
{
  "permissions": {
    "allow": [
      "Bash(node scripts/xss-audit.js --warn)",
      "Bash(git checkout *)",
      "Bash(git pull *)"
    ]
  }
}
```
(6 lines of content + trailing newline, matching the original's 2-space indentation style exactly: 4-space indent for array elements, 2-space for `"permissions"`, no indent for the outer braces.)

## 4. Security Considerations

**Net effect: security-positive.** Removing narrow, stale `Bash(...)` allow-rules shrinks the standing permission surface of a file that every future session on this repo inherits without prompting. None of the 6 removed entries retain any legitimate future use (their target — `findDynamicShopifyVariant()` in `packerz-module.js` — no longer exists anywhere in the codebase), so their removal has zero functional cost and a small but real reduction in blast radius.

**Notable finding — line 7 deserves the most weight of the 6:** `Bash(node -e ' *)` is not just stale, it is the *broadest* of the six removed patterns. Read literally, this allow-rule's prefix is `node -e '` (an opening single quote with nothing closing it in the stored pattern) followed by a wildcard — i.e., it is shaped to match essentially *any* `node -e '...'` inline-script invocation, not a single pinned diagnostic like the awk/grep/echo entries. `node -e` can execute arbitrary JavaScript, including `require('fs')`, `require('child_process')`, and outbound network calls. Whatever specific one-off command this was originally meant to scope has been lost to the malformed quoting, so today it functions as a standing, unscoped-looking grant for an interpreter escape hatch. Its removal is the single highest-value line item in this prune, independent of the "stale/dead-code" justification that applies to the other 5.

**Confirming the 3 KEPT entries are not dangerous, per the task's own framing:**
- `Bash(node scripts/xss-audit.js --warn)` — read-only static scanner; per CLAUDE.md's "Canonical scanner" section it reads every line of every file and reports violations, it does not mutate any file. `--warn` mode is advisory-output only. Zero write/exec risk.
- `Bash(git checkout *)` — branch switch / new-branch creation (`-b`) is the sanctioned everyday use per CLAUDE.md's branching workflow. Note for completeness: the wildcard also technically matches `git checkout -- <path>` (discards *uncommitted working-tree* edits to a file) — this does not rewrite history or delete commits, and the environment's own auto-mode safety reminder already requires a `git status` + stash-if-dirty check before any command that could discard uncommitted work. No `--force`, `-f`, `reset --hard`, or `push` capability is granted by this pattern.
- `Bash(git pull *)` — fetch + merge from the remote; worst case on conflict is a merge-conflict state requiring manual resolution, not data loss. Explicitly required by CLAUDE.md's "Trunk hydration" and "Ledger hydration gate" rules. No destructive/force flags are implied by the bare wildcard.

None of the 3 KEPT entries grant credential access, destructive history rewriting, or arbitrary code execution beyond git's own well-understood scope against the repo's own (already-trusted) origin remote.

**RLS implications:** Not applicable. This file has no relationship to Supabase, Row-Level Security, or any database table/policy — it is a Claude Code CLI tool-permission config, entirely local to the developer/agent tooling layer.

**Print-window DOMPurify:** Not applicable. No HTML is rendered, assembled, or printed by this change.

**XSS / `window.safeHTML`:** Not applicable. `.claude/settings.json` is not JS or HTML and is not a DOM-injection sink; `node scripts/xss-audit.js` (the canonical scanner) targets `.js`/`.html` source files and would not scan or flag this file. Confirmed no `overrides`/`ignorePatterns` in the repo's `.eslintrc.json` reference JSON files either way — moot, since ESLint's default resolution only parses `.js`/`.mjs`/`.cjs`, so this file was never in scope for the lint gate to begin with.

## 5. Vanilla JS / Web Bluetooth Constraints

Not applicable. This is a JSON configuration file, not application runtime code. No `var`/`let`/`const`, no DOM API, no `navigator.bluetooth` call, no framework dependency is introduced, removed, or affected. The edit cannot violate the vanilla-JS or Web-Bluetooth-only constraints because no JavaScript is being written.

## 6. 4-State UX / UI Mutex / Zero-Refresh

Not applicable — there is no data component, no button, and no render function anywhere in this change:
- **4-state UX (Loading/Error/Empty/Success):** N/A — no UI component reads this file at runtime; it is consumed only by the Claude Code CLI tool itself, outside the SPA.
- **UI mutex (`window.executeWithButtonAction`):** N/A — no button, no DB mutation.
- **Zero-refresh:** N/A — no render function (`renderInventoryTable()`, etc.) depends on or is affected by this file.

## 7. Schema Changes / Master Reference / Topological Integrity

**None.** No Supabase table, column, or RLS policy is touched — confirmed by construction (this file never communicates with Supabase). A grep of `tools/SK8Lytz_App_Master_Reference.md` for `settings.json` and `.claude/` returns zero hits, so there is no existing documentation entry to update and no "Corporate brain sync" obligation under CLAUDE.md (that rule triggers only on Supabase schema/table/RLS changes). No button, modal, or UI element is created, deleted, or moved, so the Mermaid Architectural Blueprint requires no edit either.

## 8. Verification Steps

1. **JSON validity** (run from repo root):
   ```
   node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json'))"
   ```
   Expected: no output, no thrown exception (silent success = valid JSON). For a stronger visual check, also run:
   ```
   node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')), null, 2))"
   ```
   Expected printed output is byte-equivalent (modulo `JSON.stringify`'s own formatting) to §3b above, and:
   ```
   node -e "console.log(JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')).permissions.allow.length)"
   ```
   Expected: `3`.

2. **Presence check — the 3 durable entries survived:**
   ```
   grep -F "xss-audit.js --warn" .claude/settings.json
   grep -F "git checkout *" .claude/settings.json
   grep -F "git pull *" .claude/settings.json
   ```
   Expected: one match each.

3. **Absence check — all 6 one-shot entries are gone:**
   ```
   grep -c "packerz-module.js" .claude/settings.json
   grep -c "findDynamicShopifyVariant" .claude/settings.json
   grep -c "ESLINT EXIT CODE" .claude/settings.json
   grep -c "node -e '" .claude/settings.json
   ```
   Expected: `0` for all four.

4. **Diff scope check:**
   ```
   git status
   git diff .claude/settings.json
   ```
   Expected: exactly one file changed (`.claude/settings.json`); the diff shows only the trailing-comma fix on the `git pull *` line and the removal of the 6 stale lines plus one closing-bracket line — nothing else in the file (and no other file) is touched. `.claude/settings.local.json` must show no diff at all (untouched, out of scope).

5. **Pre-commit hook sanity note:** `.githooks/pre-commit` now runs the XSS gate in blocking mode (per the archived `debt/tooling` epic). Since no `.js`/`.html` file is part of this commit, `node scripts/xss-audit.js` will scan an unchanged set of source files and report the same violation count as the pre-existing baseline (expected: 0) — this commit cannot introduce or fix an XSS finding either way.

6. **Lint/test no-op confirmation:** `npx eslint .` and `npm test` are expected to report identical results to the pre-edit baseline — no source file is touched, so neither tool has anything new to evaluate. Running them is optional here but harmless as a general regression sanity check.

## 9. Commit & Ledger Guidance

- Suggested micro-commit message: `chore(hygiene): prune stale one-shot Bash grants from .claude/settings.json`.
- Per CLAUDE.md's **Ledger exemption**, `tools/SK8Lytz_Bucket_List.md` line 39 is checked off (`[ ]` → `[🚀]` at release time, or `[x]` at completion) during the normal `/bucketlist`/`/wind-down` flow — it must **not** be micro-committed as part of this edit.
- If `/bucketlist` batches this task together with sibling task `debt/hygiene-1` (index.html orphaned-comment deletion) into a single commit on the shared `debt/hygiene` branch — mirroring how the archived `debt/tooling` epic batched 3 separate task-plans into one commit (`1ed0399`) — that is consistent with precedent and acceptable. Either a standalone commit for this file or a combined batch commit with hygiene-1 satisfies this plan; the two changes touch entirely disjoint files (`.claude/settings.json` vs. `index.html`) so there is no merge/ordering risk either way.

## Files Touched

- `.claude/settings.json` — remove 6 stale one-shot `Bash(...)` allow-rules (lines 7–12 of the current file: the malformed `node -e ' *` fragment, three `awk 'NR==229/241...'` line-pinned diagnostics against `packerz-module.js`, the `findDynamicShopifyVariant` grep, and the bare ESLint-exit-code echo); keep the 3 durable entries (`xss-audit.js --warn`, `git checkout *`, `git pull *`) verbatim and in their existing order; fix the now-dangling trailing comma on the `git pull *` line so the result is valid JSON.

No other file is touched by this implementation task. `.claude/settings.local.json` and `tools/SK8Lytz_App_Master_Reference.md` are explicitly out of scope (confirmed via grep — no reference to this file exists there, so no Master Reference sync is triggered). `tools/SK8Lytz_Bucket_List.md` is updated separately per the Ledger Exemption rule, not as part of this task's commit.
