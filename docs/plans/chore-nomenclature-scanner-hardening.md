# chore/nomenclature-scanner-hardening — Implementation Plan

## Origin

Three independent scanner defects in `scripts/nomenclature-audit.js`, discovered across `debt/nomenclature-remediation` Batches 5, 5, and 8, each documented at the time and deliberately deferred rather than fixed mid-batch. Bundling them here because they're small, related (all `nomenclature-audit.js` internals), and — per Batch 8's discovery — at least one of them is a genuine **blocker for Phase 4** (`debt/brand-sweep`'s planned pre-commit hook flip from advisory to blocking).

## Item 1 — N4 has zero registry-suppression mechanism (Batch 8, load-bearing for Phase 4)

`checkN4` (the N4_LEGACY_TERM check) consults exactly one registry field — `legacy_term_watchlist`'s `term`/`match_scope` — to decide *how* a term might match a line. It never reads `rename_forbidden`, `legacy_function_aliases`, `legacy_token_aliases`, `hubs.*.panes`, or `dynamic_id_allowlist`. Unlike N1 (which has `dynamic_id_allowlist` as a genuine per-identifier suppression mechanism), **N4 cannot be cleared by documentation** — only by literally renaming the flagged text or by teaching the scanner to skip documented aliases.

Confirmed empirically in Batch 8: 61 of 84 N4_LEGACY_TERM findings are identifiers already fully documented in the registry as `documented-alias-do-not-rename` (e.g. `showSalezPane`, `paneNexlImportz`, `paneProdBuilder`) — yet the raw N4 count stayed at exactly 84 before and after that batch's registry edits, byte-for-byte identical finding list.

**Why this matters now:** `debt/brand-sweep`'s ledger entry states its goal as "scanner now enforces zero baseline findings on every commit" once `.githooks/pre-commit` flips from `--warn` (advisory) to blocking. As things stand, that flip would fail on every future commit — the 61+ documented-alias N4 findings (plus the ~19-finding `cc*` in-function-surgery N1 cluster, similarly resistant to full closure — see Item 3 below is unrelated but adjacent) form a permanent floor the scanner has no way to zero out.

**Proposed fix — add a `checkN4` suppression path mirroring N1's `dynamic_id_allowlist`:**
1. Read `registry.rename_forbidden` (already the source of truth for "this identifier is known and intentional").
2. For each N4 finding, check if the finding's line falls within a range cited in any `rename_forbidden`/`legacy_function_aliases`/`legacy_token_aliases`/`hubs.*.panes.*` entry's `evidence`/`lines`/`note` citations for the matching file.
3. If yes, suppress the finding (or demote it to a separate `N4_DOCUMENTED_LEGACY_TERM` advisory bucket that doesn't count toward a blocking gate, rather than silently dropping it — preserves visibility while unblocking Phase 4).

**Alternative (simpler, lower-risk) fix, worth considering instead:** don't touch `checkN4` at all. Instead, scope `debt/brand-sweep`'s blocking-hook-flip to a subset of rules (e.g. block on N1/N6/N7 only, leave N4 advisory permanently) or switch the gate from "absolute zero" to "no new findings vs. the committed baseline" (delta-based, which `scripts/nomenclature-baseline.json`'s existing monotonic-shrink logic already partially supports for growth detection). This avoids scanner-code risk entirely. **Recommend deciding between these two approaches before implementation** — this plan doc covers the investigation and options, not a locked-in design.

## Item 2 — N7_DICT_STALE recurring CRLF false positive (Batch 5)

`checkN7` compares `docs/nomenclature_dictionary.md`'s on-disk content against the generator's in-memory output via a raw string `!==` comparison. On Windows, `core.autocrlf` rewrites the file with `\r\n` line endings on every `git checkout`/`git stash` round-trip, while the generator always produces `\n`-only output — tripping a false "stale" finding that has nothing to do with actual content drift. Confirmed content-identical after normalizing both sides' line endings (Batch 5's investigation, reconfirmed independently during Batch 6/8's own stash-based before/after scanner runs).

**Fix:** in `checkN7`, normalize both the on-disk content and the generator's output to `\n` before comparing (e.g. `.replace(/\r\n/g, '\n')` on both sides).

## Item 3 — N2_ORPHAN_HANDLER structurally cannot fire on switch-case tokens (Batch 5)

`checkN2`'s indirect-match exemption checks whether a delegator token string appears anywhere in `allStringLiterals` — but that set is built by scanning every file *including* `system-event-delegator.js` itself. A `case 'some_token':` label's own string literal self-satisfies the exemption check, so the rule can never flag an orphaned switch-case token, regardless of whether it has a real emitter anywhere. Confirmed: N2 has read 0 findings in every scan since Phase 0, even across multiple batches (5, 6, 7) that independently confirmed specific delegator cases had zero real emitters and deleted them as dead code by hand — the scanner never caught any of them.

**Fix:** build `allStringLiterals` excluding `system-event-delegator.js`'s own `case '...'` label strings, or maintain a separate "declared tokens" set vs. "referenced-elsewhere" set and only exempt on a match against the latter.

## Verification (per item)

- Item 1: after implementing, re-run `node scripts/nomenclature-audit.js --warn` and confirm the 61 already-documented N4 identifiers no longer appear (or appear in a separate non-blocking bucket, depending on which design is chosen) while the 21 Batch-8-documented + any genuinely undocumented legacy-term findings still show. Cross-check against `tools/nomenclature-registry.json`'s current `rename_forbidden`/`legacy_function_aliases`/`legacy_token_aliases`/`hubs.*.panes` entries (all already correct as of Batch 8 — no registry changes needed for this item, only scanner code).
- Item 2: checkout/stash-round-trip the repo (the exact reproduction steps from Batch 5) and confirm N7 no longer flags a false positive.
- Item 3: temporarily reintroduce a known-dead delegator case (or use a git stash of a pre-Batch-5 commit that still had one) and confirm N2 now correctly flags it; revert the temporary reintroduction.
- Standard: `npm test` 59/59, `npx eslint .` 0/0, `node scripts/xss-audit.js` 0 violations (this is scanner-tooling code, not application code — no XSS surface, but run per CLAUDE.md's active-scan mandate regardless).

## Security / XSS

None — all three items are edits to `scripts/nomenclature-audit.js`, a Node.js dev-tooling script that never runs in the browser and has no DOM-write surface.

## Files Touched

- `scripts/nomenclature-audit.js` — `checkN4` (Item 1, design decision needed first), `checkN7` (Item 2), `checkN2`/`allStringLiterals` construction (Item 3).
- Possibly `scripts/nomenclature-baseline.json` — if Item 1's fix changes what counts as a "finding," the baseline may need a `--force` refresh (this is also the standing "consolidated baseline refresh" flagged since Batch 4 — bundle together).
- Possibly `.githooks/pre-commit` — only if/when `debt/brand-sweep` actually flips the gate; this task's own scope is scanner-hardening, not the hook flip itself.
