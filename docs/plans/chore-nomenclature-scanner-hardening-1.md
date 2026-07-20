# chore/nomenclature-scanner-hardening — Implementation Plan (v2 / -1)

**Branch:** `chore/nomenclature-scanner-hardening` (freshly cut from `main`)
**Supersedes-in-detail:** [docs/plans/chore-nomenclature-scanner-hardening.md](chore-nomenclature-scanner-hardening.md) (the `/idea_intake` draft). That doc is not wrong, but this plan independently re-reads the live files (`scripts/nomenclature-audit.js`, `scripts/nomenclature-baseline.json`, `tools/nomenclature-registry.json`, `assets/js/system-event-delegator.js`, `.githooks/pre-commit`, `scripts/generate-nomenclature-dictionary.js`) rather than trusting the draft or the explore-mapper's map blindly, per this task's instructions. All line numbers below are cited against the current on-disk state at plan time.

## Scope

Three scanner-code fixes to `scripts/nomenclature-audit.js`:
1. **N4 registry-suppression mechanism** — design decision required, HALT before implementing (see below).
2. **N7_DICT_STALE CRLF false positive** — mechanical, code below.
3. **N2_ORPHAN_HANDLER self-match blind spot** — mechanical, code below.

This is pure Node.js dev-tooling code (`scripts/*.js`, CommonJS, run via `npm test`/`node`/git hooks — never loaded in a browser). No index.html/qa-dashboard.html/assets/js/*-module.js runtime code is touched by any of the three items.

## Security / XSS / RLS — confirmed zero relevance

Independently grepped both files in scope for any DOM-write or Supabase surface:

```
Grep 'innerHTML|insertAdjacentHTML|outerHTML|document\.write|supabase|createClient|\.rls|RLS'
  scripts/nomenclature-audit.js              -> No matches
  scripts/generate-nomenclature-dictionary.js -> No matches
```

Both files only ever call `fs.readFileSync`/`fs.writeFileSync`/`fs.existsSync`, `path.*`, and `child_process.execSync('git diff ...')`. There is no `window.safeHTML`/DOMPurify surface to guard (nothing renders to a DOM or a print window), and no Supabase client, table, or RLS policy is read or written anywhere in this scope. `node scripts/xss-audit.js` will be run post-implementation per the standard mandate, but zero violations are expected and none of the 3 items can introduce one — there is no `element.innerHTML =`/`insertAdjacentHTML`/`document.write` call site in this file to guard in the first place.

## Vanilla JS constraints / 4-state UX / UI mutex / Zero-refresh — not applicable

- **Vanilla JS constraints** (no `var`, no framework, native DOM, Web Bluetooth-only): this is Node CLI tooling, not browser SPA code, so the DOM/Bluetooth constraints don't apply structurally — but the file already exclusively uses `const`/`let` (confirmed by full read, zero `var` occurrences) and the fixes below preserve that.
- **4-state UX (Loading/Error/Empty/Success):** N/A — no data component, no DOM render function anywhere in `scripts/nomenclature-audit.js` or `scripts/generate-nomenclature-dictionary.js`.
- **UI mutex (`window.executeWithButtonAction`):** N/A — no button, no DB mutation, no `window` object at all (this runs under plain Node, not a browser `window`).
- **Zero-refresh (re-invoke render functions after mutation):** N/A — no render functions exist in this scope; the only "mutation" any of the three items performs is optionally rewriting `scripts/nomenclature-baseline.json` via the existing `--update-baseline` flag, which is an explicit CLI action, not an async UI mutation.

---

## Item 2 — N7_DICT_STALE CRLF false positive (mechanical, ready to implement)

**File:** `scripts/nomenclature-audit.js`, function `checkN7` (current lines 452-465).

Confirmed root cause: `scripts/generate-nomenclature-dictionary.js`'s `buildOutput()`/`generate()` always joins with `'\n'` (line 247: `sections.join('\n\n') + '\n'`, plus every internal `.join('\n')`) and never emits `\r\n` anywhere. There is no repo-level `.gitattributes` (confirmed — `Glob '.gitattributes'` only found node_modules copies), so line-ending normalization on checkout is governed entirely by each contributor's local `core.autocrlf` git config, which commonly rewrites tracked text files to `\r\n` on Windows checkout/stash round-trips. `checkN7` does a raw `!==` string compare between that on-disk (possibly `\r\n`) content and the generator's (`\n`-only) in-memory output, so a content-identical file trips a false `N7_DICT_STALE`.

### Before (current, lines 452-465)

```js
function checkN7(registry) {
  const { buildOutput } = require(DICT_GENERATOR); // requires the refactor in §0.7
  const expected = buildOutput(registry);
  if (!fs.existsSync(DICT_PATH)) {
    return [{ ruleId: 'N7_DICT_MISSING', severity: 'MODERATE', file: 'docs/nomenclature_dictionary.md', line: 1,
      identifier: 'docs/nomenclature_dictionary.md', message: 'Dictionary missing — run npm run generate:nomenclature-dict' }];
  }
  const actual = fs.readFileSync(DICT_PATH, 'utf8');
  if (actual !== expected) {
    return [{ ruleId: 'N7_DICT_STALE', severity: 'MODERATE', file: 'docs/nomenclature_dictionary.md', line: 1,
      identifier: 'docs/nomenclature_dictionary.md', message: 'Dictionary is stale vs. registry — run npm run generate:nomenclature-dict' }];
  }
  return [];
}
```

### After

```js
function checkN7(registry) {
  const { buildOutput } = require(DICT_GENERATOR); // requires the refactor in §0.7
  const expected = buildOutput(registry);
  if (!fs.existsSync(DICT_PATH)) {
    return [{ ruleId: 'N7_DICT_MISSING', severity: 'MODERATE', file: 'docs/nomenclature_dictionary.md', line: 1,
      identifier: 'docs/nomenclature_dictionary.md', message: 'Dictionary missing — run npm run generate:nomenclature-dict' }];
  }
  const actual = fs.readFileSync(DICT_PATH, 'utf8');
  // Normalize CRLF -> LF on both sides before comparing. Windows core.autocrlf rewrites the
  // on-disk file with \r\n on every checkout/stash round-trip; buildOutput() always emits
  // \n-only (generate-nomenclature-dictionary.js:247 and every internal .join('\n')). Without
  // this, a content-identical file trips a false N7_DICT_STALE unrelated to real drift.
  const normalizeEol = s => s.replace(/\r\n/g, '\n');
  if (normalizeEol(actual) !== normalizeEol(expected)) {
    return [{ ruleId: 'N7_DICT_STALE', severity: 'MODERATE', file: 'docs/nomenclature_dictionary.md', line: 1,
      identifier: 'docs/nomenclature_dictionary.md', message: 'Dictionary is stale vs. registry — run npm run generate:nomenclature-dict' }];
  }
  return [];
}
```

No signature change, no caller change (`main()` line 612 calls `checkN7(registry)` unchanged). Minimal, isolated diff.

---

## Item 3 — N2_ORPHAN_HANDLER can't fire on switch-case tokens (mechanical, ready to implement)

**File:** `scripts/nomenclature-audit.js`, functions `collectPass1` (current lines 221-253) and `checkN2` (current lines 318-344).

Confirmed root cause by direct read of `assets/js/system-event-delegator.js:1-100`: every delegator case is written as a bare `case 'token_name':` line (e.g. line 30 `case 'click_startAvatarMigration':`). `collectStringLiteralsLine` (line 176-180) runs on **every** file including `system-event-delegator.js` itself (loop at lines 234-249 iterates `fileRecords` with no file exclusion), so each case label's own quoted string is added to the shared `allStringLiterals` set. `checkN2`'s indirect-match exemption (line 325: `if (allStringLiterals.has(token)) continue;`) then always finds the token there — self-satisfying regardless of whether any real `data-click="${...}"` emitter exists anywhere. This is why N2 has read 0 findings in every scan since Phase 0 even though Batches 5-7 hand-confirmed and deleted several genuinely-orphaned cases (e.g. `click_updateLocalIPQRCode_cc`, `keyup_window_filterCcMngrItems`, both cited in Batch 5's ledger entry).

Grepped `assets/js/system-event-delegator.js` for any case line that also carries a second quoted string on the same line (which would need to survive the strip) — no matches found, so in practice every case-label line contains *only* that one quoted token today. The fix below handles the general case correctly regardless (it strips only the matched `case '...':` substring, not the whole line), so it's safe even if that changes later.

### Before (current, relevant excerpts)

Constants (top of file, near `RE_STRING_LITERAL`, current lines 173-180):
```js
// --- string literals (FM-6 heuristic input, §0.4). Length-bounded 2-80 to skip
// pathological long-string matches (SQL fragments, long messages) — delegator
// tokens and legacy terms are always short identifiers. ---
const RE_STRING_LITERAL = /'([\w][\w-]{1,79})'|"([\w][\w-]{1,79})"/g;
function collectStringLiteralsLine(line, allStringLiterals) {
  let m; RE_STRING_LITERAL.lastIndex = 0;
  while ((m = RE_STRING_LITERAL.exec(line))) allStringLiterals.add(m[1] || m[2]);
}
```

`collectPass1`'s per-line loop (current lines 234-249):
```js
  for (const rec of fileRecords) {
    for (let i = 0; i < rec.lines.length; i++) {
      const line = rec.lines[i];
      const loc  = { file: rec.relPath, line: i + 1 };

      collectDomIdDeclLine(line, literalIds, dynamicPrefixes);
      collectDomIdLookupLine(line, loc, domIdLookups);
      collectEmitterTokenLine(line, loc, emitterTokens, indirectEmitters);
      collectStringLiteralsLine(line, allStringLiterals);
      collectLocalStorageLine(line, loc, localStorageKeys);
      collectCssUsageLine(line, cssClassUsages);
    }
    if (rec.relPath.endsWith('.html')) {
      collectCssDefs(rec, cssClassDefs); // one extra whole-file regex per HTML file only (2 files total — negligible)
    }
  }
```

### After

Add a case-label regex + a small stripper helper next to `RE_STRING_LITERAL` (same section, current lines 173-180):
```js
// --- string literals (FM-6 heuristic input, §0.4). Length-bounded 2-80 to skip
// pathological long-string matches (SQL fragments, long messages) — delegator
// tokens and legacy terms are always short identifiers. ---
const RE_STRING_LITERAL = /'([\w][\w-]{1,79})'|"([\w][\w-]{1,79})"/g;
function collectStringLiteralsLine(line, allStringLiterals) {
  let m; RE_STRING_LITERAL.lastIndex = 0;
  while ((m = RE_STRING_LITERAL.exec(line))) allStringLiterals.add(m[1] || m[2]);
}

// N2 self-match guard: a `case 'token':` label inside system-event-delegator.js is a
// DECLARATION of that token, not proof that anything else in the codebase emits it via
// data-click="${...}". Strip only the matched case-label text (not the whole line) before
// feeding the delegator file's own lines into the shared allStringLiterals pool used by
// checkN2's FM-6 indirect-match exemption — any OTHER quoted string on the same line (or
// any other line in the file) is unaffected and still counts as legitimate evidence.
const RE_CASE_LABEL = /\bcase\s+'([^']+)'\s*:/g;
function stripDelegatorCaseLabels(line, isDelegatorFile) {
  return isDelegatorFile ? line.replace(RE_CASE_LABEL, '') : line;
}
```

`collectPass1`'s per-line loop (current lines 234-249):
```js
  for (const rec of fileRecords) {
    const isDelegatorFile = rec.absPath === DELEGATOR_FILE;
    for (let i = 0; i < rec.lines.length; i++) {
      const line = rec.lines[i];
      const loc  = { file: rec.relPath, line: i + 1 };

      collectDomIdDeclLine(line, literalIds, dynamicPrefixes);
      collectDomIdLookupLine(line, loc, domIdLookups);
      collectEmitterTokenLine(line, loc, emitterTokens, indirectEmitters);
      collectStringLiteralsLine(stripDelegatorCaseLabels(line, isDelegatorFile), allStringLiterals);
      collectLocalStorageLine(line, loc, localStorageKeys);
      collectCssUsageLine(line, cssClassUsages);
    }
    if (rec.relPath.endsWith('.html')) {
      collectCssDefs(rec, cssClassDefs); // one extra whole-file regex per HTML file only (2 files total — negligible)
    }
  }
```

Notes on why this is the minimal-blast-radius fix (vs. the draft's alternative phrasing "maintain a separate declared-tokens vs. referenced-elsewhere set"):
- Only `collectStringLiteralsLine`'s **input line** is modified for delegator-file lines; `collectDomIdDeclLine`/`collectDomIdLookupLine`/`collectEmitterTokenLine`/`collectLocalStorageLine`/`collectCssUsageLine` still receive the untouched raw `line` — none of them care about case labels, but this avoids any risk of silently changing their behavior too.
- `collectDelegatorCases` (current lines 257-289, the function that actually builds the `delegatorCases` map `checkN2` iterates in its `(a)` loop) is **not touched at all** — it still correctly extracts every declared case token; only the shared `allStringLiterals` pool used for the *exemption* check changes.
- A token that is a case label in the delegator **and** genuinely appears as a string literal somewhere else (a real emitter, or a legitimate lookup table elsewhere in the same delegator file on a different line) is still correctly exempted — only the self-referential "the only evidence is its own declaration" case is now excluded.

---

## Item 1 — N4 registry-suppression mechanism — HALT, decision required before implementation

**Do not implement either option until the user explicitly picks one.** This section presents both, plus one material discovery from re-reading the live code that should inform the decision.

### Confirmed current state

`checkN4` (current lines 404-418) and its call site (current line 609):
```js
...checkN4(fileRecords, registry.legacy_term_watchlist, lineFilter),
```
— confirmed: `checkN4` receives only `registry.legacy_term_watchlist`. It never reads `registry.rename_forbidden`, `registry.legacy_function_aliases`, `registry.legacy_token_aliases`, `registry.hubs`, or `registry.dynamic_id_allowlist`. There is no suppression path analogous to N1's `dynamic_id_allowlist`/`compilePatterns` mechanism (lines 297-316).

Per `tools/SK8Lytz_Bucket_List.md` Batch 8's entry: of the current **84** N4 findings (baseline.json's captured `N4_LEGACY_TERM: 85` is one stale — it predates Batch 5's `ccMobileBridgeStatus` deletion, which dropped the live count 85→84; this is itself an instance of the standing stale-baseline issue, see Schema Changes below), 61 are already `documented-alias-do-not-rename` entries in the registry, 21 were newly documented in Batch 8, and 2 are the deferred `cc*` cluster. So today, ~61+ of the 84 findings are for identifiers the registry already explicitly says are intentional and frozen — yet the scanner has no way to know that.

### Option (a) — teach `checkN4` to read the registry and suppress/demote documented findings

**What I found that the draft didn't fully account for:** the 4 registry containers cited (`rename_forbidden`, `legacy_function_aliases`, `legacy_token_aliases`, `hubs.*.panes`) do **not** have a uniform, machine-parseable location shape:

| Container | Location field(s) | Machine-parseable? |
|---|---|---|
| `legacy_function_aliases.*` | `lines: [1062, 1119]` (array of exact line numbers) + `file` | Yes — direct |
| `legacy_token_aliases.*` | `emitter_line`, `handler_line` (single ints) + `emitter_file`/`handler_file` | Yes — direct |
| `rename_forbidden.*` | `evidence: ["file:line", "file:line-range", "file:line (parenthetical note)", ...]` (free-text array) | Yes, but needs a tolerant regex, e.g. `/^([^\s:]+):(\d+)(?:-(\d+))?/` to strip trailing `(...)` notes — confirmed this pattern matches every evidence string currently in the registry |
| `hubs.*.panes.*` | **No structured location field at all.** Some panes have an optional free-text `note` that *sometimes* mentions a line number in prose (e.g. `paneProdBuilder`'s note: `"Selected via static lookup object index.html:4999..."`), but several panes (e.g. `paneProdControl`, `paneProdPrint`, `paneSalezAnalyticz`) have **no `note` field whatsoever** — nothing to parse |

So a uniform "does the finding's line fall within a cited range" mechanism (as the draft's step 2 describes) works cleanly for 3 of the 4 containers but **cannot** work for `hubs.*.panes` without either (i) a registry schema addition (add a structured `lines`/`evidence` array to every pane entry — a `tools/nomenclature-registry.json` schema change, itself requiring re-ratification since the registry is "frozen/ratified" per its own `compilePatterns` docstring, current line 84), or (ii) a different suppression mechanic for panes specifically.

**A cleaner alternative for the pane case, using data the registry already has:** every `hubs.*.panes.*` entry already carries `embedded_legacy_terms` (e.g. `paneProdBuilder`: `["Prod"]`) and the pane's own id string. Suppression could instead be **identifier-based** rather than line-based: *if the flagged line's text contains a pane-id string (e.g. `"paneProdBuilder"`) whose registry entry has `rename_status === 'documented-alias-do-not-rename'` AND whose `embedded_legacy_terms` array includes the specific term N4 matched on that line* → suppress. This needs no registry schema change for panes, and — as a side benefit — it is **immune to line-citation drift** (the registry's own history shows citations do go stale: Batch 8 "corrected 6 stale index.html line citations that had drifted non-uniformly (149-213 lines) since ratification"), which a purely line-range-based check would silently under- or over-suppress against. The same identifier-based approach also works cleanly for `legacy_function_aliases` (match function name string + check `embedded_legacy_terms`) and `legacy_token_aliases` (match token string + check `embedded_legacy_terms`) — but **not** for `rename_forbidden`, whose entries are keyed by wildcard *patterns* (`"statSalz*"`, `"btnSalezImport*"`) rather than an `embedded_legacy_terms` array, and would need either the line-evidence-parsing approach or a per-line identifier-tokenization step N4 doesn't currently do.

**Net effect of this discovery:** Option (a), if chosen, is realistically **two different suppression mechanisms glued together** (line-evidence-parsing for `rename_forbidden`, and either line-evidence-parsing-with-a-schema-add or identifier+`embedded_legacy_terms` matching for the other three) — not the single uniform mechanism the original draft's step 2 implied. This roughly doubles the surface area to implement and test versus the draft's framing, and is a meaningful new data point for the tradeoff below.

**Sketch only (NOT decided, NOT to be implemented until picked)** — a hybrid outline:

```js
// SKETCH — illustrative only, not a final design.

function buildN4EvidenceLines(registry) {
  // rename_forbidden + legacy_function_aliases + legacy_token_aliases: exact file:line citations.
  const lines = new Set(); // `${file}|${lineNum}`
  const addRange = (file, start, end) => { for (let l = start; l <= end; l++) lines.add(`${file}|${l}`); };
  const parseEvidence = (ev) => {
    const m = /^([^\s:]+):(\d+)(?:-(\d+))?/.exec(ev.trim());
    if (m) addRange(m[1], parseInt(m[2], 10), m[3] ? parseInt(m[3], 10) : parseInt(m[2], 10));
  };
  Object.values(registry.rename_forbidden).forEach(e => (e.evidence || []).forEach(parseEvidence));
  Object.values(registry.legacy_function_aliases).forEach(e => {
    if (e.rename_status === 'documented-alias-do-not-rename') (e.lines || []).forEach(l => lines.add(`${e.file}|${l}`));
  });
  Object.values(registry.legacy_token_aliases).forEach(e => {
    if (e.rename_status === 'documented-alias-do-not-rename') {
      lines.add(`${e.emitter_file}|${e.emitter_line}`);
      lines.add(`${e.handler_file}|${e.handler_line}`);
    }
  });
  return lines;
}

function buildN4DocumentedIdentifiers(registry) {
  // hubs.*.panes: identifier + embedded_legacy_terms based (no reliable line citations).
  const entries = []; // {idString, terms: Set<string>}
  Object.values(registry.hubs).forEach(hub => Object.entries(hub.panes).forEach(([paneId, pane]) => {
    if (pane.rename_status === 'documented-alias-do-not-rename') {
      entries.push({ idString: paneId, terms: new Set(pane.embedded_legacy_terms) });
    }
  }));
  return entries;
}

function checkN4(fileRecords, watchlist, lineFilterFn, evidenceLines, documentedIdentifiers) {
  const findings = [];
  for (const rec of fileRecords) {
    for (let i = 0; i < rec.lines.length; i++) {
      if (!lineFilterFn(rec.relPath, i + 1)) continue;
      for (const entry of watchlist) {
        if (!checkTermOnLine(entry.term, entry.match_scope, rec.lines[i])) continue;
        if (evidenceLines.has(`${rec.relPath}|${i + 1}`)) continue; // suppressed: rename_forbidden/function/token alias
        const identMatch = documentedIdentifiers.find(d => d.terms.has(entry.term) && rec.lines[i].includes(d.idString));
        if (identMatch) continue; // suppressed: documented pane alias
        findings.push({ /* ...unchanged... */ });
      }
    }
  }
  return findings;
}
```

Open sub-question even within (a): **suppress silently, or demote to a separate `N4_DOCUMENTED_LEGACY_TERM` advisory bucket** (visible in reports, but excluded from any future blocking gate — the draft's preferred framing)? Demoting preserves visibility (matches N6's existing ADVISORY precedent, current line 293-294's severity contract) at the cost of one more `ruleId`/`SEVERITY_ICON` wire-up; silent suppression is simpler but makes the 61+ already-fine identifiers invisible in every report, which could hide it if one of them is *un*-documented later (e.g. the pane is deleted but the registry entry isn't cleaned up).

### Option (b) — leave `checkN4` untouched, scope `debt/brand-sweep`'s gate instead

Do not touch scanner code at all. `debt/brand-sweep` either (i) scopes its blocking-hook-flip to a subset of rules (e.g. block on N1/N5/N6/N7, leave N4 permanently advisory), or (ii) switches from an absolute-zero gate to a delta-based "no new findings vs. baseline" gate.

**Important discovery, independent of which option is picked:** re-reading `main()` (current lines 617-624) shows the scanner's blocking exit code is **already delta-based today**, not absolute-zero:
```js
const baseline = loadBaselineIfExists();
const baselineFps = new Set((baseline?.fingerprints || []).map(f => f.fp));
const newBlocking = allFindings.filter(f => f.severity !== 'ADVISORY' && !baselineFps.has(f.fp));
...
if (newBlocking.length === 0) process.exit(0);
process.exit(WARN_MODE ? 0 : 1);
```
Dropping `--warn` from `.githooks/pre-commit` (line 40) would **not**, by itself, require every finding to reach zero — it only fails a commit that introduces a finding whose fingerprint isn't already in `scripts/nomenclature-baseline.json`. Option (b)'s sub-variant (ii) — "switch to a delta-based gate" — already describes the code as it exists, not a design change.

However, this comes with a real caveat worth surfacing before it's treated as settling the question: **N4's fingerprint is unusually coarse.** `fingerprint()` (current line 504) is `${f.file}|${f.ruleId}|${f.identifier}`, and for N4 findings, `identifier` is set to `entry.term` (current line 411 — the watchlist term itself, e.g. `"Prod"`), **not** the specific matched code identifier (e.g. not `"paneProdBuilder"`) and **not** a line number. Confirmed against `scripts/nomenclature-baseline.json`'s actual `fingerprints` array: every N4 entry is shaped like `"index.html|N4_LEGACY_TERM|Salez"` — one fingerprint per `(file, term)` pair, regardless of how many distinct lines/identifiers in that file match that term. Practical effect: once a single `Salez` occurrence in `index.html` has ever been baselined, **any future new `Salez` occurrence anywhere else in that same file** shares the same fingerprint and will **not** be flagged as new — the delta gate provides essentially no protection against fresh legacy-term drift in a file that already has one baselined hit for that term. This cuts against relying on "it's already delta-gated, so N4's floor doesn't matter" as a reason to prefer (b) without change — the delta gate is real, but weaker than the ledger's Batch 8/9 framing implied in the other direction (they assumed it would fail every commit; in fact it's more likely to under-protect against genuinely new drift). Worth an explicit call-out, not a silent assumption either way.

### Tradeoffs (side by side)

| | Option (a) — teach `checkN4` the registry | Option (b) — scope the gate instead |
|---|---|---|
| Scanner code risk | Real — touches `checkN4`, likely needs 2 sub-mechanisms (line-evidence + identifier-based), new registry-reading code paths to unit-verify | None — zero lines changed in `nomenclature-audit.js` |
| Fixes the underlying gap | Yes — documenting an alias actually clears its N4 finding, matching N1's existing UX | No — the 61+ documented findings stay in every `--warn`/report run forever; the "docs can't suppress N4" gap remains |
| Implementation size | Medium-large (new suppression fn(s), registry parsing, at least 1 new severity bucket if demoting) | Near-zero (edit `.githooks/pre-commit`'s rule list, or the `main()` exit-condition, when `debt/brand-sweep` starts) — that edit belongs to `debt/brand-sweep`, not this task |
| Where the real work lands | This task (`chore/nomenclature-scanner-hardening`) | `debt/brand-sweep` (this task would do nothing for Item 1 at all) |
| Risk of masking real drift | Low if identifier-based matching is used (immune to citation drift) — but adds a second thing that can silently go wrong (a stale registry entry over-suppressing) | The existing coarse fingerprint already has this risk today, independent of (a)/(b) |

### HALT — clarifying questions for the user

1. Option (a) or Option (b) (or (b)-with-explicit-N1/N6/N7-subset-scoping vs. (b)-with-delta-gate-as-is)?
2. If (a): suppress silently, or demote to a new `N4_DOCUMENTED_LEGACY_TERM` advisory-severity bucket (visible, non-blocking)?
3. If (a): is a `tools/nomenclature-registry.json` schema addition (structured line citations for `hubs.*.panes.*`) acceptable, or must the identifier+`embedded_legacy_terms`-substring approach be used for panes specifically to avoid a registry re-ratification?
4. Regardless of (a)/(b): should the N4 fingerprint itself be sharpened (e.g. include the matched line number or the actual code identifier instead of just `entry.term`) to close the coarse-fingerprint gap described above? That's a separate, smaller fix from either (a) or (b) and could be done independently of this decision.

**No code will be written for Item 1 until these are answered.**

---

## Schema changes

- **`scripts/nomenclature-baseline.json`:** No change required for Items 2/3 (neither fix changes what counts as a finding for N2/N7 in a way that requires re-baselining — N7 currently reads 0 in `by_rule` at capture time so a false-positive fix doesn't change a committed count, and N2 has always read 0 so item 3's fix only starts *detecting* real orphans going forward, it doesn't retroactively change today's already-captured baseline unless a real live orphan is found and needs baselining). **If Item 1 goes with Option (a),** the resulting suppression will shrink the *live* N4 count (today's un-refreshed baseline still shows the Phase-2-era `85`, itself already stale vs. the current live `84`), and `scripts/nomenclature-baseline.json` will need `node scripts/nomenclature-audit.js --update-baseline --force` (the `--force` flag is required because this is a *shrink*, but the baseline logic (current lines 525-531) only refuses on *growth* without `--force` — shrink already logs `✅ Baseline shrinking...` and proceeds without `--force`, so actually **no `--force` needed for a shrink**, only for growth. Correcting the draft here: `--force` is not required for Item 1's expected shrink case, only if a design choice somehow *added* new finding categories net-positive.). This refresh is also the standing **"consolidated baseline refresh"** flagged since Batch 4 of the sibling `debt/nomenclature-remediation` epic (ledger: *"Baseline file deliberately NOT refreshed... flag a future consolidated `chore(audit): refresh nomenclature baseline` at the next phase boundary"*) — connecting the two here, but **not performing that refresh as part of this task**; it should happen once, deliberately, capturing the true current state across all of N1/N4/N5/N6 drift from Batches 1-9, not piecemeal inside this scanner-hardening task.
- **`tools/nomenclature-registry.json`:** No change for Items 2/3. For Item 1, only touched if Option (a) is picked **and** the line-evidence-parsing sub-design (rather than identifier+`embedded_legacy_terms`) is chosen for `hubs.*.panes` — contingent, not decided.
- **`tools/SK8Lytz_App_Master_Reference.md`:** **Not touched by any of the 3 items.** CLAUDE.md's "Corporate brain sync" rule requires updating the Master Reference's `## Database Schemas` section whenever a **Supabase** schema/table/RLS rule changes — nothing in this task touches Supabase in any way (confirmed via grep above). `tools/nomenclature-registry.json` is a separate artifact governed by its own ADR (`docs/architecture/nomenclature-audit-engine.md`) and regenerates `docs/nomenclature_dictionary.md`, not the Master Reference.
- **Supabase / RLS:** Zero relevance, confirmed by grep (see Security section above). No tables, columns, or RLS policies are read, written, or implied by any of the 3 items.

---

## Verification (per item)

### Item 2 — N7 CRLF false positive
1. Check the local git config first: `git config --get core.autocrlf` (PowerShell). If `true` (common Windows default), a plain checkout round-trip will naturally reproduce CRLF; if `input`/`false`, force it manually to simulate the same condition.
2. Repro (before the fix): 
   - `git status` (confirm clean), then force a CRLF rewrite of the dictionary file, e.g. in PowerShell:
     `(Get-Content docs/nomenclature_dictionary.md -Raw) -replace "(?<!\r)\n","\`r\`n" | Set-Content -NoNewline docs/nomenclature_dictionary.md`
   - Run `node scripts/nomenclature-audit.js --warn` and confirm `N7_DICT_STALE` **does** appear (pre-fix), even though the only difference is line endings.
   - `git checkout -- docs/nomenclature_dictionary.md` to restore before continuing.
3. Apply the Item 2 fix.
4. Repeat the same CRLF-forcing step, re-run `node scripts/nomenclature-audit.js --warn`, confirm `N7_DICT_STALE` **no longer appears**.
5. Also confirm the check still correctly fires on **real** drift: hand-edit one word inside `docs/nomenclature_dictionary.md`'s content (not just line endings) and confirm `N7_DICT_STALE` still fires post-fix. Revert.
6. `git checkout -- docs/nomenclature_dictionary.md` to leave the working tree clean before committing.

### Item 3 — N2 self-match blind spot
1. Pick a token confirmed dead and already deleted in a prior batch (e.g. `click_updateLocalIPQRCode_cc` or `keyup_window_filterCcMngrItems`, both cited in Batch 5's ledger entry as zero-emitter-verified before deletion) — confirm via `git log -S'click_updateLocalIPQRCode_cc' -- assets/js/system-event-delegator.js` that it existed and was removed, and via a fresh repo-wide grep today that it has zero `data-click`/`data-keyup` emitter anywhere.
2. Temporarily re-insert that exact `case '<token>':` line (with a no-op body, e.g. `break;`) back into the appropriate `switch(action)` block in `assets/js/system-event-delegator.js`.
3. Run `node scripts/nomenclature-audit.js --warn` **before** applying the Item 3 fix — confirm N2 still reads 0 (reproducing the bug).
4. Apply the Item 3 fix.
5. Re-run — confirm `N2_ORPHAN_HANDLER` now fires for the reinserted token.
6. Revert the temporary reinsertion (`git checkout -- assets/js/system-event-delegator.js` or manual delete) — confirm `git diff` shows zero unintended changes to that file before committing the real Item 2/3 fixes.
7. Re-run once more against the clean file — confirm N2 returns to its expected count (likely still 0 if all previously-hand-found orphans are already deleted; this is a valid outcome — the temporary-reinsertion test is what proves the mechanism, not the live count).

### Item 1 — contingent on chosen option (not run until decision made)
- If (a): re-run `node scripts/nomenclature-audit.js --warn`, confirm the 61 already-documented N4 identifiers no longer appear (or appear only in the new advisory bucket, per whichever sub-decision is made), while the ~21 Batch-8-documented and any genuinely undocumented findings still show. Cross-check the specific identifiers suppressed against `tools/nomenclature-registry.json`'s current entries by name, not just by count.
- If (b): confirm no scanner code changed (`git diff scripts/nomenclature-audit.js` empty for this item), and instead verify whichever `debt/brand-sweep`-side gate change (subset scoping or delta-confirmation) is described accurately in that task's own plan — out of this task's direct verification scope.

### Standard (all items)
- `npm test` — expect 59/59 passing (no existing test references `nomenclature-audit.js` internals per repo-wide grep, so this is a regression check on the rest of the suite, not new coverage).
- `npx eslint .` — expect 0 errors/warnings.
- `node scripts/xss-audit.js` — expect 0 violations before and after (no XSS surface in scope, run per CLAUDE.md's active-scan mandate regardless).

---

## Files Touched

- `scripts/nomenclature-audit.js` — `checkN7` (Item 2, ready), `collectPass1`'s per-line loop + new `RE_CASE_LABEL`/`stripDelegatorCaseLabels` (Item 3, ready), `checkN4` + `main()`'s registry-wiring (Item 1, **blocked on user decision** — do not edit until Item 1's clarifying questions are answered).
- `scripts/nomenclature-baseline.json` — **not touched by Items 2/3.** Contingent on Item 1: only if Option (a) is chosen and shrinks the live N4 count (`--update-baseline`, no `--force` needed for a shrink). The separate standing "consolidated baseline refresh" (Batch 4 of `debt/nomenclature-remediation`) is explicitly **not** performed as part of this task.
- `tools/nomenclature-registry.json` — **not touched by Items 2/3.** Contingent on Item 1 Option (a) only if the line-evidence sub-design (vs. identifier+`embedded_legacy_terms`) is picked for `hubs.*.panes`.
- `.githooks/pre-commit` — **not touched by this task at all.** Any gate-scoping change belongs to `debt/brand-sweep`, not `chore/nomenclature-scanner-hardening`.
- `tools/SK8Lytz_App_Master_Reference.md` — **not touched.** No Supabase schema/table/RLS change anywhere in this task's scope.
- `tools/SK8Lytz_Bucket_List.md` — not part of this task's implementation commits (ledger exemption — syncs at `/wind-down` per CLAUDE.md).
