# Implementation Plan: `feat/nomenclature-audit-engine` (Phase 2 — Scanner Engine)

**ADR:** [docs/architecture/nomenclature-audit-engine.md](../architecture/nomenclature-audit-engine.md) (§2 Scanner checks table, §3 validator findings, §4 D1–D9)
**Superseded draft:** [docs/plans/nomenclature-audit-engine.md](nomenclature-audit-engine.md) lines 148–190 — that draft's registry schema sketch (nested `dom_ids`/`css_classes`/`delegator_tokens` per pane) is **stale**. This plan is written against the real shipped [tools/nomenclature-registry.json](../../tools/nomenclature-registry.json) schema (`hubs{}` → `panes{canonical_label, embedded_legacy_terms[], rename_status}`, `rename_forbidden{}`, `dynamic_id_allowlist[]`, `legacy_term_watchlist[]`, `localstorage_policy{}`).
**Branch:** `feat/nomenclature-audit-engine` (already checked out off `main`)
**Mirrors:** [scripts/xss-audit.js](../../scripts/xss-audit.js) conventions (CLI flags, rule-object shape, exit codes, report format) — CLAUDE.md doctrine: "canonical scanner beats grep."

---

## 0. Explicit design decisions made during planning

These resolve ambiguities in the task brief and the ADR draft using grounded evidence (cited below) rather than guesses. None require the user's unique authority to proceed — they're implementation-detail calls consistent with the ADR's own stated philosophy (D4 regex-first, D6 no-over-engineering, "cheaply checkable" scoping). Flagged here for visibility/override, not as blocking questions.

1. **Baseline ratchet direction resolved in favor of standard ratchet semantics.** The task brief's wording ("fail if it's missing any fingerprint present in the committed baseline") is internally inconsistent with its own "i.e. only removals allowed" gloss. Implemented per the ADR's own industry-pattern citation (§3: ESLint bulk suppressions / Betterer / ShellCheck baselines) and this repo's own XSS-gate precedent: **`--update-baseline` refuses (exits 1) if the freshly-scanned findings contain any fingerprint NOT present in the old committed baseline (growth), unless `--force` is passed. Fingerprints present in the old baseline but absent from the new scan (shrinkage — fixes) are always accepted silently.** This is the only direction that makes "monotonic-shrink" mean anything (shrink = the baseline gets smaller over time as Phase 3 remediates) and the only direction compatible with a first-ever baseline capture (see §5).
2. **`qa-dashboard.html` is included in the scanned file set**, deviating from xss-audit.js's exact `collectFiles()` (which only walks `index.html` + `assets/js/*.js`). Justification: the ADR's own §1 "Scope" line explicitly lists `qa-dashboard.html` as in-scope for the epic, and it's cheap (9 `getElementById` calls, confirmed via grep — negligible perf cost).
3. **N2 covers all 10 delegated event types**, not just `click`. Confirmed via `assets/js/system-event-delegator.js:13-2121`: there are 10 `document.body.addEventListener(...)` registrations — `click`(15), `keyup`(1661), `mousedown`(1718), `change`(1771), `input`(1971), `mouseover`(2036), `mouseout`(2058), `submit`(2080), `focus`(2099), `blur`(2121) — each wrapping its own `switch(action)` block. The task brief's examples are click-centric but the ADR's own N2 description says "(and `data-change` etc.)". Scanning is generic over `DELEGATED_EVENT_TYPES` (§1.4).
4. **FM-6 indirection heuristic: "string-literal existence" check**, not name-pattern matching. Rather than matching identifier names like `*ClickAction`/`*Action` (brittle — misses any variable not following that convention) or unconditionally skipping all indirect emitters (which would silently stop catching real orphans on the indirect side), Pass 1 collects `allStringLiterals: Set<string>` — every quoted string literal token found anywhere in the scanned codebase. A delegator `case` is only flagged `N2_ORPHAN_HANDLER` if its token string is **not** found by direct emitter match **and not found anywhere else in `allStringLiterals`**. This generalizes past the one known FM-6 instance (`const cameraClickAction = 'click_openSOPSnapshotCamera_production'`, system-tools-module.js:2709, consumed via `data-click="${cameraClickAction}"` at line 2713) without any naming-convention assumption, and it can only ever *reduce* false ORPHAN findings (never introduce a false DEAD_EMITTER), matching D7's "no auto-delete, manual triage" posture.
5. **N7's "Master Reference ↔ registry sync" half is scoped out of the v1 automated check.** Only the dictionary-regeneration-staleness half is automated (deterministic, machine-diffable). Master Reference prose has no stable machine-parseable table format to diff against registry keys without a fragile markdown-table parser — same "don't over-engineer" logic the ADR applies to N6 (D6). CLAUDE.md's existing "Corporate brain sync" mandate remains the enforcement mechanism for Master Reference accuracy. Noted as a documented v1 limitation, not silently dropped.
6. **`--changed-only` scope, precisely:** N1/N2/N3/N6/N7 always resolve against the **full current codebase** every run (required for correctness — a ghost lookup can't be resolved without the complete set of id-producers, regardless of which lines changed). `--changed-only` only narrows *console reporting* for these five to findings whose own file is among the currently staged files (keeps hook output focused). N4/N5 get real git-hunk line-range filtering per the task's explicit ask (§1.5/§1.6 below) since they are true "did-this-line-just-get-added" checks. Baseline-diffing (new vs. known) always operates on the full finding set regardless of `--changed-only`.
7. **A required small, additive, non-breaking refactor to `scripts/generate-nomenclature-dictionary.js`**: export a pure `buildOutput(registry)` function (the string-assembly logic already exists inside `generate()`, sections 249–261; just stop it short of the `fs.writeFileSync` call and export both). This is what makes N7's dictionary-staleness check read-only (§1.7).

---

## 1. `scripts/nomenclature-audit.js` — architecture

### 1.0 Header, constants, CLI contract

```js
#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT             = path.resolve(__dirname, '..');
const REGISTRY_PATH     = path.join(ROOT, 'tools', 'nomenclature-registry.json');
const BASELINE_PATH     = path.join(ROOT, 'scripts', 'nomenclature-baseline.json');
const DICT_PATH         = path.join(ROOT, 'docs', 'nomenclature_dictionary.md');
const DICT_GENERATOR    = path.join(ROOT, 'scripts', 'generate-nomenclature-dictionary.js');
const DELEGATOR_FILE    = path.join(ROOT, 'assets', 'js', 'system-event-delegator.js');

const WARN_MODE      = process.argv.includes('--warn');
const UPDATE_BASELINE = process.argv.includes('--update-baseline');
const FORCE          = process.argv.includes('--force');
const CHANGED_ONLY   = process.argv.includes('--changed-only');

const DELEGATED_EVENT_TYPES = [
  'click', 'keyup', 'mousedown', 'change', 'input',
  'mouseover', 'mouseout', 'submit', 'focus', 'blur'
]; // confirmed via document.body.addEventListener(...) calls in system-event-delegator.js:13-2121
```

CLI contract (mirrors xss-audit.js's `WARN_MODE` exit-code guarantee exactly):

| Flag | Effect |
|---|---|
| *(none)* | Full scan. Exit `1` if any **NEW** (not-in-baseline) non-`ADVISORY` finding exists; else exit `0`. |
| `--warn` | Same scan, **always** exits `0` (`process.exit(WARN_MODE ? 0 : 1)` — identical pattern to xss-audit.js). This is the only mode the pre-commit hook invokes in Phase 2. |
| `--changed-only` | Narrows reporting per decision §0.6. Combinable with `--warn`. |
| `--update-baseline` | Regenerates `scripts/nomenclature-baseline.json` from a full scan. Short-circuits before the exit-code logic. Refuses growth without `--force` (§2). The **only** code path that calls `fs.writeFileSync`. |
| `--force` | Only meaningful with `--update-baseline`; permits baseline growth. |

**Top-level hardening beyond xss-audit.js:** wrap the entire `main()` body in try/catch. In `WARN_MODE`, catch *any* exception (bad registry JSON, missing file, regex crash) and `process.exit(0)` after logging to stderr — this is a deliberate strengthening over xss-audit.js (which has no such wrapper) because this script is materially more complex (multi-collector, cross-file resolution) and CLAUDE.md's explicit Phase 2 requirement is "must never block a commit." Without this wrapper, an uncaught exception in a future edit could turn "advisory" into "accidentally blocking."

### 1.1 File collection

```js
function collectFiles() {
  const files = [path.join(ROOT, 'index.html'), path.join(ROOT, 'qa-dashboard.html')]; // decision §0.2
  const jsDir = path.join(ROOT, 'assets', 'js');
  fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).forEach(f => files.push(path.join(jsDir, f)));
  return files.filter(fs.existsSync);
}

function readAllFiles(absPaths) {
  // One fs.readFileSync per file. Returns records reused by every collector — no re-reading.
  return absPaths.map(absPath => ({
    absPath,
    relPath: path.relative(ROOT, absPath).replace(/\\/g, '/'),
    lines: fs.readFileSync(absPath, 'utf8').split('\n'),
  }));
}
```

### 1.2 Registry loading + pattern compilation

```js
function loadRegistry() {
  let raw;
  try { raw = fs.readFileSync(REGISTRY_PATH, 'utf8'); }
  catch (err) { throw new Error(`Cannot read ${path.relative(ROOT, REGISTRY_PATH)}: ${err.message}`); }
  try { return JSON.parse(raw); }
  catch (err) { throw new Error(`Invalid JSON in ${path.relative(ROOT, REGISTRY_PATH)}: ${err.message}`); }
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/**
 * Compiles a list of {pattern, ...} entries (dynamic_id_allowlist entries, or
 * rename_forbidden persistence-coupled entries) into prefix-matchers.
 * Bifurcation required because the ratified registry already mixes two styles
 * (7 of 8 dynamic_id_allowlist entries end in "*"; one — "ldProp[A-Z]" — is a
 * hand-authored regex fragment). Registry is frozen/ratified (Phase 1 shipped);
 * do not require a registry edit to accommodate the compiler.
 */
function compilePatterns(entries, patternKeyFn) {
  return entries.map(entry => {
    const pattern = patternKeyFn(entry);
    if (pattern.endsWith('*')) {
      // literal-prefix match: ^ + escaped literal text (no trailing .*, no $ —
      // RegExp#test with only a leading ^ already means "string starts with").
      return { entry, regex: new RegExp('^' + escapeRegex(pattern.slice(0, -1))) };
    }
    // hand-authored regex fragment (e.g. "ldProp[A-Z]") — full match, author already
    // encoded exact suffix semantics via bracket-class syntax.
    return { entry, regex: new RegExp('^' + pattern + '$') };
  });
}
```

Two call sites:
- `compilePatterns(registry.dynamic_id_allowlist, e => e.pattern)` → used by N1.
- `compilePatterns(Object.entries(registry.rename_forbidden).filter(([,v]) => v.coupling_type === 'persistence').map(([k]) => k), p => p)` → used by N5 to recognize already-documented legacy localStorage prefixes (`neoSelect_*`, `neoResizer_*`, `neogleamz_*`, `batchezSopSort_*`, `batchezSopExpanded_*`, `layerzSopExpanded_*`).

### 1.3 Pass 1 — single combined collector (performance-critical, see §7)

**Hard requirement:** the multi-file, many-line traversal (index.html + qa-dashboard.html + assets/js/*.js) MUST be **one** combined per-line loop, not N separate full-file passes, to stay inside the ADR's §3 performance budget (~0.3s two-pass regex estimate). All per-line regex testers below run inside the same `for (const rec of fileRecords) { for (let i = 0; i < rec.lines.length; i++) { const line = rec.lines[i]; ... } }` loop, writing into shared accumulators.

```js
function collectPass1(fileRecords) {
  const literalIds        = new Set();               // every static id="..." / .id = '...'
  const dynamicPrefixes    = new Set();               // static prefix before ${ in id="prefix${...}" / .id = `prefix${...}`
  const domIdLookups      = [];                       // {file, line, classification}
  const emitterTokens     = new Map();                // eventType -> Map<token, [{file,line}]>
  const indirectEmitters  = [];                        // {file, line, eventType, rawExpr} — data-X="${identifier}"
  const allStringLiterals = new Set();                 // every quoted string token (FM-6 heuristic input, §0.4)
  const localStorageKeys  = [];                        // {file, line, method, key, isTemplate}
  const cssClassUsages    = new Set();                 // class="..." tokens + classList.*('x') + className assignments
  const cssClassDefs      = new Map();                 // relPath(html only) -> Set<className> defined inside <style> blocks

  DELEGATED_EVENT_TYPES.forEach(t => emitterTokens.set(t, new Map()));

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

  return { literalIds, dynamicPrefixes, domIdLookups, emitterTokens, indirectEmitters,
           allStringLiterals, localStorageKeys, cssClassUsages, cssClassDefs };
}
```

Per-line helper regexes (each a small, single-purpose function called once per line from the loop above):

```js
// --- id declarations ---
const RE_ID_ATTR_LITERAL   = /\bid=["']([^"'`$]+)["']/g;
const RE_ID_ATTR_TEMPLATE  = /\bid=["']([^"'`]*?)\$\{/g;   // capture = static prefix
const RE_ID_PROP_LITERAL   = /\.id\s*=\s*['"]([^'"$]+)['"]/g;
const RE_ID_PROP_TEMPLATE  = /\.id\s*=\s*`([^`$]*)\$\{/g;

function collectDomIdDeclLine(line, literalIds, dynamicPrefixes) {
  for (const re of [RE_ID_ATTR_LITERAL, RE_ID_PROP_LITERAL]) {
    let m; re.lastIndex = 0;
    while ((m = re.exec(line))) literalIds.add(m[1]);
  }
  for (const re of [RE_ID_ATTR_TEMPLATE, RE_ID_PROP_TEMPLATE]) {
    let m; re.lastIndex = 0;
    while ((m = re.exec(line))) if (m[1]) dynamicPrefixes.add(m[1]);
  }
}
```

```js
// --- getElementById lookups: manual balanced-paren scan (regex on nested-paren
// args like getElementById(x.substring(0,3)) would break with a naive /\(([^)]*)\)/) ---
function extractBalancedArg(line, openIdx) {
  // openIdx = index of the '(' immediately after "getElementById"
  let depth = 0, i = openIdx;
  for (; i < line.length; i++) {
    if (line[i] === '(') depth++;
    else if (line[i] === ')') { depth--; if (depth === 0) return line.slice(openIdx + 1, i); }
  }
  return null; // unbalanced on this line => multi-line call, skip (v1 regex limitation, see D4)
}

function classifyLookupArg(raw) {
  if (raw == null) return { kind: 'unresolvable-multiline' };
  const trimmed = raw.trim();
  let m;
  if ((m = /^'([^']*)'$/.exec(trimmed)) || (m = /^"([^"]*)"$/.exec(trimmed)))
    return { kind: 'literal', id: m[1] };
  if ((m = /^`([^`]*)`$/.exec(trimmed)) && !trimmed.includes('${'))
    return { kind: 'literal', id: m[1] };
  if ((m = /^`([^`]*)\$\{/.exec(trimmed)))
    return { kind: 'prefix', prefix: m[1] };
  if ((m = /^'([^']*)'\s*\+/.exec(trimmed)) || (m = /^"([^"]*)"\s*\+/.exec(trimmed)))
    return { kind: 'prefix', prefix: m[1] }; // e.g. 'pipe-P-' + job.status
  return { kind: 'dynamic-unresolvable' }; // bare variable / function call — not scanned, no finding (avoid false positives)
}

function collectDomIdLookupLine(line, loc, domIdLookups) {
  const marker = 'getElementById(';
  let idx = line.indexOf(marker);
  while (idx !== -1) {
    const arg = extractBalancedArg(line, idx + marker.length - 1);
    domIdLookups.push({ ...loc, classification: classifyLookupArg(arg) });
    idx = line.indexOf(marker, idx + marker.length);
  }
}
```

```js
// --- delegator emitters: data-<eventType>="TOKEN" (literal) or data-<eventType>="${identifier}" (indirect) ---
function collectEmitterTokenLine(line, loc, emitterTokens, indirectEmitters) {
  for (const type of DELEGATED_EVENT_TYPES) {
    const reLiteral  = new RegExp(`data-${type}=["']([^"'\`$]+)["']`, 'g');
    const reIndirect = new RegExp(`data-${type}=["']\\$\\{([a-zA-Z_$][\\w$]*)\\}["']`, 'g');
    let m;
    while ((m = reLiteral.exec(line))) {
      const map = emitterTokens.get(type);
      if (!map.has(m[1])) map.set(m[1], []);
      map.get(m[1]).push(loc);
    }
    while ((m = reIndirect.exec(line))) {
      indirectEmitters.push({ ...loc, eventType: type, identifier: m[1] });
    }
  }
}
```

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

```js
// --- localStorage keys ---
const RE_LS_LITERAL  = /localStorage\.(setItem|getItem|removeItem)\(\s*['"]([^'"$]+)['"]/g;
const RE_LS_TEMPLATE = /localStorage\.(setItem|getItem|removeItem)\(\s*`([^`]*?)\$\{/g;
function collectLocalStorageLine(line, loc, localStorageKeys) {
  let m;
  RE_LS_LITERAL.lastIndex = 0;
  while ((m = RE_LS_LITERAL.exec(line))) localStorageKeys.push({ ...loc, method: m[1], key: m[2], isTemplate: false });
  RE_LS_TEMPLATE.lastIndex = 0;
  while ((m = RE_LS_TEMPLATE.exec(line))) localStorageKeys.push({ ...loc, method: m[1], key: m[2], isTemplate: true });
}
```

```js
// --- CSS usage (best-effort, N6 advisory-forever per D6 — no need for perfection) ---
function collectCssUsageLine(line, cssClassUsages) {
  let m;
  const reClassAttr = /\bclass=["']([^"']*)["']/g;
  while ((m = reClassAttr.exec(line)))
    m[1].split(/\s+/).forEach(tok => { const c = tok.replace(/\$\{.*\}/g, '').trim(); if (c) cssClassUsages.add(c); });
  const reClassList = /classList\.(add|remove|toggle|contains)\(([^)]*)\)/g;
  while ((m = reClassList.exec(line)))
    (m[2].match(/'([^']+)'|"([^"]+)"/g) || []).forEach(q => cssClassUsages.add(q.slice(1, -1)));
  const reClassName = /\.className\s*=\s*['"`]([^'"`]*)['"`]/g;
  while ((m = reClassName.exec(line)))
    m[1].split(/\s+/).forEach(tok => { if (tok) cssClassUsages.add(tok); });
}

// --- CSS definitions: whole-file (not per-line) regex, HTML files only, 2 files total ---
function collectCssDefs(rec, cssClassDefs) {
  const content = rec.lines.join('\n');
  const defs = new Set();
  const styleBlockRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let sm;
  while ((sm = styleBlockRe.exec(content))) {
    const classSelRe = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)\s*[,\s]*[{:]/g;
    let cm;
    while ((cm = classSelRe.exec(sm[1]))) defs.add(cm[1]);
  }
  cssClassDefs.set(rec.relPath, defs);
}
```

### 1.4 Delegator case extraction (single-file, targeted pass)

```js
function collectDelegatorCases(fileRecords) {
  const rec = fileRecords.find(r => r.absPath === DELEGATOR_FILE);
  const result = new Map(); // eventType -> Map<token, {line}>
  DELEGATED_EVENT_TYPES.forEach(t => result.set(t, new Map()));
  if (!rec) return result;

  for (let i = 0; i < rec.lines.length; i++) {
    const m = /addEventListener\('(\w+)'/.exec(rec.lines[i]);
    if (!m || !DELEGATED_EVENT_TYPES.includes(m[1])) continue;
    const eventType = m[1];
    // find the switch(action) { line within the next 30 lines
    let switchLine = -1;
    for (let j = i; j < Math.min(i + 30, rec.lines.length); j++) {
      if (/switch\s*\(\s*action\s*\)\s*\{/.test(rec.lines[j])) { switchLine = j; break; }
    }
    if (switchLine === -1) continue;
    // bracket-depth scan from switchLine's own '{' to its matching '}'
    let depth = 0, end = -1;
    for (let j = switchLine; j < rec.lines.length; j++) {
      for (const ch of rec.lines[j]) {
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) { end = j; break; } }
      }
      if (end !== -1) break;
    }
    if (end === -1) continue;
    for (let j = switchLine; j <= end; j++) {
      const cm = /case\s+'([^']+)'\s*:/.exec(rec.lines[j]);
      if (cm) result.get(eventType).set(cm[1], { line: j + 1 });
    }
  }
  return result;
}
```

### 1.5 Pass 2 — N1–N7 checks

Every finding has shape `{ ruleId, severity, file, line, identifier, message }`. `severity ∈ {CRITICAL, MODERATE, ADVISORY}` — `ADVISORY` (N6 only) never contributes to exit-code/blocking logic regardless of mode (hard-codes D6).

**N1 — Ghost DOM lookups**
```js
function checkN1(collected, allowlistCompiled) {
  const findings = [];
  for (const lk of collected.domIdLookups) {
    const c = lk.classification;
    if (c.kind === 'dynamic-unresolvable' || c.kind === 'unresolvable-multiline') continue; // not scanned
    if (c.kind === 'literal') {
      if (collected.literalIds.has(c.id)) continue; // RESOLVED
      if ([...collected.dynamicPrefixes].some(p => c.id.startsWith(p))) continue; // PREFIX-MATCHED (internal producer)
      if (allowlistCompiled.some(({ regex }) => regex.test(c.id))) continue; // PREFIX-MATCHED (registry)
      findings.push({ ruleId: 'N1_GHOST_ID', severity: 'CRITICAL', file: lk.file, line: lk.line,
        identifier: c.id, message: `getElementById('${c.id}') has no id="${c.id}" producer and is not in dynamic_id_allowlist` });
    } else if (c.kind === 'prefix') {
      const known = [...collected.dynamicPrefixes].some(p => p.startsWith(c.prefix) || c.prefix.startsWith(p))
        || allowlistCompiled.some(({ entry }) => entry.pattern.startsWith(c.prefix) || c.prefix.startsWith(entry.pattern.replace(/\*$/, '')));
      if (!known) findings.push({ ruleId: 'N1_GHOST_ID_PREFIX', severity: 'MODERATE', file: lk.file, line: lk.line,
        identifier: `PREFIX:${c.prefix}`, message: `getElementById template/concat prefix '${c.prefix}' not found in dynamic_id_allowlist` });
    }
  }
  return findings;
}
```

**N2 — Orphan delegator tokens (both directions)**
```js
function checkN2(delegatorCases, emitterTokens, allStringLiterals) {
  const findings = [];
  // (a) case with no emitter (direct or indirect — §0.4)
  for (const [eventType, tokenMap] of delegatorCases) {
    for (const [token, loc] of tokenMap) {
      if (emitterTokens.get(eventType).has(token)) continue;             // RESOLVED direct
      if (allStringLiterals.has(token)) continue;                        // RESOLVED-INDIRECT (FM-6 heuristic)
      findings.push({ ruleId: 'N2_ORPHAN_HANDLER', severity: 'MODERATE',
        file: 'assets/js/system-event-delegator.js', line: loc.line,
        identifier: `${eventType}:${token}`,
        message: `case '${token}': (${eventType}) has no data-${eventType} emitter anywhere in the codebase (direct or indirect)` });
    }
  }
  // (b) emitter with no case — dead button (should be ~0 post-Phase-0; re-verify every run)
  for (const [eventType, tokenMap] of emitterTokens) {
    for (const [token, locs] of tokenMap) {
      if (delegatorCases.get(eventType).has(token)) continue;
      for (const loc of locs) {
        findings.push({ ruleId: 'N2_DEAD_EMITTER', severity: 'CRITICAL', file: loc.file, line: loc.line,
          identifier: `${eventType}:${token}`,
          message: `data-${eventType}="${token}" has no matching case '${token}': in system-event-delegator.js — dead control` });
      }
    }
  }
  return findings;
}
```

**N3 — L1 label drift (hub tabs + registry panes only, per ADR's "cheaply checkable" scoping)**
```js
function checkN3(registry, indexHtmlRec) {
  const findings = [];
  const lines = indexHtmlRec.lines;

  for (const [hubName, hub] of Object.entries(registry.hubs)) {
    const idx = lines.findIndex(l => l.includes(`data-click="${hub.tab_button_token}"`));
    if (idx === -1 || !lines[idx].includes(hubName)) {
      findings.push({ ruleId: 'N3_LABEL_DRIFT', severity: 'MODERATE', file: 'index.html',
        line: idx === -1 ? 1 : idx + 1, identifier: hubName,
        message: `Hub tab button for '${hub.tab_button_token}' does not visibly display canonical label '${hubName}'` });
    }
    for (const [paneId, pane] of Object.entries(hub.panes)) {
      const pIdx = lines.findIndex(l => l.includes(`id="${paneId}"`));
      if (pIdx === -1) continue; // covered by N1-style ghost-ness elsewhere, not this rule's job
      const windowLines = lines.slice(pIdx, pIdx + 10).join('\n'); // pane header is within ~2 lines in practice (verified: index.html:2045-2047)
      if (!windowLines.includes(`>${pane.canonical_label}<`)) {
        findings.push({ ruleId: 'N3_LABEL_DRIFT', severity: 'MODERATE', file: 'index.html', line: pIdx + 1,
          identifier: `${hubName}:${paneId}`,
          message: `Pane '${paneId}' does not show canonical label '${pane.canonical_label}' in <h2>/pane-header-title within 10 lines of its id declaration` });
      }
    }
  }
  return findings;
}
```
Grounded example (verified, PASSES): `index.html:1956` hub tab `<button ... data-click="click_switchTab_stockpilez">📊 STOCKPILEZ</button>` — hub key `STOCKPILEZ` found on the token's own line. `index.html:2045-2047`: `<div id="paneInventory" ...><div class="pane-header-bar"><span class="pane-header-title">STOCKZ</span>` — registry's `paneInventory.canonical_label = "STOCKZ"` found within window. NEXUZ hub (`index.html:1931`, token `click_switchTab_nexl` — a documented legacy-token-alias) still correctly shows `⚡ NEXUZ` text, confirming this check is independent of token-name staleness (ADR line 89: "L1 labels are already consistent").

**N4 — Legacy-term occurrences** (scans only index.html/qa-dashboard.html/assets/js/*.js — **never** `docs/` or `tools/*.md`, because the registry/dictionary/Master Reference alias tables *intentionally* contain these terms as documentation; scanning them would produce permanent, unfixable false positives that break the ratchet.)
```js
const RE_PROD_BOUNDARY = /(?<![a-zA-Z])Prod(?=[A-Z])/g;
// verified: matches ProdBuilder, ProdControl, ProdPrint (registry pane ids) —
// does NOT match Production, product, produce, productive (case-sensitive + lookahead-guard)

function checkTermOnLine(term, matchScope, line) {
  switch (matchScope) {
    case 'identifier-safe substring':                 // Salez, Nexl, Salz
      return line.includes(term);
    case 'identifier-context only': {                 // Bridge
      const re = /\b[A-Za-z0-9_]*[Bb]ridge[A-Za-z0-9_]*\b/g;
      let m;
      while ((m = re.exec(line))) if (m[0].length > 6) return true; // longer than bare "bridge"/"Bridge" => part of a compound identifier
      return false;
    }
    case 'identifier-boundary only':                  // Prod
      return RE_PROD_BOUNDARY.test(line) && (RE_PROD_BOUNDARY.lastIndex = 0, true);
    default:
      return false;
  }
}

function checkN4(fileRecords, watchlist, lineFilterFn /* (relPath, lineNum) => boolean, from §1.6 */) {
  const findings = [];
  for (const rec of fileRecords) {
    for (let i = 0; i < rec.lines.length; i++) {
      if (!lineFilterFn(rec.relPath, i + 1)) continue;
      for (const entry of watchlist) {
        if (checkTermOnLine(entry.term, entry.match_scope, rec.lines[i])) {
          findings.push({ ruleId: 'N4_LEGACY_TERM', severity: 'MODERATE', file: rec.relPath, line: i + 1,
            identifier: entry.term, message: `Legacy term '${entry.term}' found (scope: ${entry.match_scope})` });
        }
      }
    }
  }
  return findings;
}
```

**N5 — localStorage key conformance** (new keys only; existing legacy prefixes are frozen per D8)
```js
function checkN5(localStorageKeys, persistenceForbiddenCompiled, lineFilterFn) {
  const findings = [];
  for (const k of localStorageKeys) {
    if (!lineFilterFn(k.file, k.line)) continue;
    const probe = k.isTemplate ? k.key : k.key; // key or static prefix, same field either way
    if (probe.startsWith('sk8lytz_')) continue; // conformant new key
    if (persistenceForbiddenCompiled.some(({ regex }) => regex.test(probe))) continue; // documented legacy family, frozen (D8) — OK
    findings.push({ ruleId: 'N5_NEW_NONCONFORMANT_KEY', severity: 'CRITICAL', file: k.file, line: k.line,
      identifier: probe, message: `localStorage ${k.method}('${probe}...') does not use sk8lytz_ prefix and is not a documented legacy family` });
  }
  return findings;
}
```

**N6 — Unused CSS (advisory forever, D6)**
```js
function checkN6(cssClassDefs, cssClassUsages) {
  const findings = [];
  for (const [file, defs] of cssClassDefs) {
    for (const cls of defs) {
      if (!cssClassUsages.has(cls)) {
        findings.push({ ruleId: 'N6_UNUSED_CSS', severity: 'ADVISORY', file, line: 1, identifier: cls,
          message: `.${cls} defined in <style> block, no class="..."/classList usage found anywhere scanned` });
      }
    }
  }
  return findings;
}
```
Line is fixed at `1` (not tracked precisely — acceptable per D6's "zero false-positive-freedom is structurally impossible, don't over-engineer"; fingerprint uses `(file, ruleId, className)` so line-inaccuracy doesn't affect identity).

**N7 — Registry ↔ dictionary sync (dictionary half only, per §0.5)**
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

**Required companion edit — `scripts/generate-nomenclature-dictionary.js`:** change lines 249–264 so the section-assembly logic is exported separately from the write:
```js
function buildOutput(registry) {
  const sections = [ buildHeaderSection(registry.meta), buildHubPaneDirectory(registry.hubs), /* ...unchanged... */ ];
  return sections.join('\n\n') + '\n';
}
function generate() {
  const registry = /* ...unchanged read+parse... */;
  const output = buildOutput(registry);
  fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
  return OUTPUT_PATH;
}
module.exports = { generate, buildOutput };
```
Non-breaking: `generate()`'s external behavior/signature is unchanged; only `buildOutput` is newly exported.

### 1.6 Changed-line-range filtering (N4/N5, `--changed-only` mode)

```js
function getStagedFilesSet() {
  const out = execSync('git diff --cached --name-only', { cwd: ROOT, encoding: 'utf8' }); // same call already used in .githooks/pre-commit:13
  return new Set(out.split('\n').map(f => f.trim().replace(/\\/g, '/')).filter(Boolean));
}

function getChangedLineRanges(relFilePath) {
  const out = execSync(`git diff --cached -U0 -- "${relFilePath}"`, { cwd: ROOT, encoding: 'utf8' });
  const ranges = [];
  const hunkRe = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm;
  let m;
  while ((m = hunkRe.exec(out))) {
    const start = parseInt(m[1], 10);
    const count = m[2] !== undefined ? parseInt(m[2], 10) : 1;
    if (count === 0) continue; // pure deletion hunk, no new-file lines to check
    ranges.push([start, start + count - 1]);
  }
  return ranges;
}

function buildLineFilter() {
  if (!CHANGED_ONLY) return () => true; // full-file scan (baseline / manual runs)
  const staged = getStagedFilesSet();
  const rangeCache = new Map();
  return (relPath, lineNum) => {
    if (!staged.has(relPath)) return false;
    if (!rangeCache.has(relPath)) rangeCache.set(relPath, getChangedLineRanges(relPath));
    return rangeCache.get(relPath).some(([s, e]) => lineNum >= s && lineNum <= e);
  };
}
```
A newly-added (untracked-then-staged) file shows one hunk `@@ -0,0 +1,N @@`, which naturally covers its entire content as "changed" — correct: a wholly new file's legacy terms/keys are new introductions and should be checked in full.

### 1.7 Fingerprinting, reporting, `main()`

```js
function fingerprint(f) { return `${f.file}|${f.ruleId}|${f.identifier}`; }

function main() {
  const registry = loadRegistry();
  const absFiles = collectFiles();
  const fileRecords = readAllFiles(absFiles);

  const collected = collectPass1(fileRecords);
  const delegatorCases = collectDelegatorCases(fileRecords);
  const allowlistCompiled = compilePatterns(registry.dynamic_id_allowlist, e => e.pattern);
  const persistenceForbiddenCompiled = compilePatterns(
    Object.entries(registry.rename_forbidden).filter(([, v]) => v.coupling_type === 'persistence').map(([k]) => k),
    p => p
  );
  const lineFilter = buildLineFilter();

  const allFindings = [
    ...checkN1(collected, allowlistCompiled),
    ...checkN2(delegatorCases, collected.emitterTokens, collected.allStringLiterals),
    ...checkN3(registry, fileRecords.find(r => r.relPath === 'index.html')),
    ...checkN4(fileRecords, registry.legacy_term_watchlist, lineFilter),
    ...checkN5(collected.localStorageKeys, persistenceForbiddenCompiled, lineFilter),
    ...checkN6(collected.cssClassDefs, collected.cssClassUsages),
    ...checkN7(registry),
  ].map(f => ({ ...f, fp: fingerprint(f) }));

  if (UPDATE_BASELINE) { updateBaseline(allFindings); return; }

  const baseline = loadBaselineIfExists();
  const baselineFps = new Set((baseline?.fingerprints || []).map(f => f.fp));
  const newBlocking = allFindings.filter(f => f.severity !== 'ADVISORY' && !baselineFps.has(f.fp));

  printReport(allFindings, newBlocking, baselineFps.size, CHANGED_ONLY);

  if (newBlocking.length === 0) process.exit(0);
  process.exit(WARN_MODE ? 0 : 1);
}

if (require.main === module) {
  try { main(); }
  catch (err) {
    console.error(`nomenclature-audit.js crashed: ${err.stack || err.message}`);
    process.exit(WARN_MODE ? 0 : 1); // never block a commit on a scanner bug while --warn is passed
  }
}
module.exports = { main }; // for future test-lint-runner unit tests
```

`printReport` mirrors xss-audit.js's banner/footer style (`─` rules, `🔴`/`🟠`/`⚪` icons for CRITICAL/MODERATE/ADVISORY, grouped by ruleId, footer pointing at `tools/SK8Lytz_Bucket_List.md → 🧹 Technical Debt`), plus one added line: `X of Y total findings are NEW (not in baseline)` — the number actually gated on.

---

## 2. `scripts/nomenclature-baseline.json` — format & ratchet mechanics

```json
{
  "$schema_version": "1.0.0",
  "captured_at": "2026-07-17T00:00:00.000Z",
  "total_findings": 0,
  "by_rule": { "N1_GHOST_ID": 0, "N1_GHOST_ID_PREFIX": 0, "N2_ORPHAN_HANDLER": 0, "N2_DEAD_EMITTER": 0,
               "N3_LABEL_DRIFT": 0, "N4_LEGACY_TERM": 0, "N5_NEW_NONCONFORMANT_KEY": 0,
               "N6_UNUSED_CSS": 0, "N7_DICT_STALE": 0, "N7_DICT_MISSING": 0 },
  "fingerprints": [
    { "fp": "assets/js/inventory-module.js|N1_GHOST_ID|batchProductSelect",
      "file": "assets/js/inventory-module.js", "ruleId": "N1_GHOST_ID", "identifier": "batchProductSelect",
      "severity": "CRITICAL", "example_line": 417 }
  ]
}
```
- **Fingerprint = `${file}|${ruleId}|${identifier}`, line-independent.** One entry per distinct tuple — repeated occurrences of the same ghost id / legacy term / dead token in the *same file* collapse to a single baseline entry (per-spec requirement). The same identifier appearing in a *different* file produces a *separate* fingerprint (file is part of the key).
- **`example_line` is informational only** (first-seen line at capture time, for human debugging) — never used for identity/matching. Comment this loudly in code to stop a future maintainer from keying off it and silently breaking line-independence.
- **`captured_at` uses a real timestamp** (`new Date().toISOString()`), unlike `generate-nomenclature-dictionary.js`'s deliberately-deterministic output — the baseline is inherently a mutable snapshot artifact (its whole purpose is to change over time as debt shrinks), not a pure function of registry content, so timestamp churn on regeneration is expected/desired.

```js
function updateBaseline(allFindings) {
  const newFps = new Set(allFindings.map(f => f.fp));
  const old = loadBaselineIfExists();

  if (old) {
    const oldFps = new Set(old.fingerprints.map(f => f.fp));
    const added = [...newFps].filter(fp => !oldFps.has(fp));
    const removed = [...oldFps].filter(fp => !newFps.has(fp));

    if (added.length > 0 && !FORCE) {
      console.error(`❌ Refusing to update baseline: ${added.length} finding(s) not in the committed baseline (growth).`);
      console.error(`   This likely means new nomenclature drift was introduced since the last capture.`);
      console.error(`   Fix it, or if intentional (e.g. scanner coverage improved), re-run with --force.`);
      added.slice(0, 20).forEach(fp => console.error(`   + ${fp}`));
      process.exit(1);
    }
    if (removed.length > 0) console.log(`✅ Baseline shrinking: ${removed.length} finding(s) resolved since last capture.`);
  }

  const byRule = {};
  allFindings.forEach(f => { byRule[f.ruleId] = (byRule[f.ruleId] || 0) + 1; });
  const baseline = {
    $schema_version: '1.0.0',
    captured_at: new Date().toISOString(),
    total_findings: allFindings.length,
    by_rule: byRule,
    fingerprints: dedupeByFp(allFindings).map(f => ({
      fp: f.fp, file: f.file, ruleId: f.ruleId, identifier: f.identifier, severity: f.severity, example_line: f.line,
    })),
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${baseline.fingerprints.length} fingerprint(s) to ${path.relative(ROOT, BASELINE_PATH)}`);
}

function dedupeByFp(findings) {
  const seen = new Map();
  findings.forEach(f => { if (!seen.has(f.fp)) seen.set(f.fp, f); });
  return [...seen.values()];
}

function loadBaselineIfExists() {
  return fs.existsSync(BASELINE_PATH) ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) : null;
}
```
This is the resolved-ambiguity direction from §0.1: growth (new fingerprints) is refused without `--force`; shrinkage (fixed findings) is always accepted silently. First-ever capture (no `old` baseline on disk) always succeeds regardless of `--force` — nothing to compare against (this is exactly the Phase 2 initial-capture case, §5).

---

## 3. `.githooks/pre-commit` wiring

Insert between the existing xss-audit line (33) and the version-bump line (36):

```diff
   // 2. XSS audit — scans index.html + assets/js/ for forbidden DOM injection patterns.
   // Blocking mode: all known violations in the Bucket List § 🧹 Technical Debt have
   // been resolved (0 violations as of 2026-07-01). Any new violation aborts the commit.
   execSync('node scripts/xss-audit.js', { stdio: 'inherit' });
 
+  // 2b. Nomenclature audit — advisory only (Phase 2 of docs/architecture/nomenclature-audit-engine.md).
+  // --warn guarantees exit 0 even on a scanner bug (see top-level try/catch in the script);
+  // --changed-only scopes N4/N5 reporting to staged diff hunks. Full backlog lives in
+  // scripts/nomenclature-baseline.json. Flip to blocking (drop --warn) is Phase 4's one-line change,
+  // same lifecycle the XSS gate already went through.
+  execSync('node scripts/nomenclature-audit.js --warn --changed-only', { stdio: 'inherit' });
+
   // 3. Automated version bump
   execSync('npm run version:bump', { stdio: 'inherit' });
```
No additional try/catch needed at the hook level: `--warn` is a hard contract (`process.exit(WARN_MODE ? 0 : 1)` plus the top-level crash-swallowing wrapper in §1.0) that `execSync` will never see as non-zero, exactly matching how the existing xss-audit line already behaves inside this hook's outer try/catch.

---

## 4. `package.json`

Add to `scripts`:
```json
"audit:nomenclature": "node scripts/nomenclature-audit.js"
```
(Optional convenience, not required by the hook or by CLAUDE.md, but useful for Phase 3 batches: `"audit:nomenclature:baseline": "node scripts/nomenclature-audit.js --update-baseline"`.)
No `devDependencies`/`dependencies` changes — D4 confirms v1 is regex-only, no new deps; `scripts/**` is already eslint-excluded (`eslint.config.mjs:10`).

---

## 5. Initial baseline capture

Build step, executed **once**, after the scanner is implemented and manually validated (not fabricated/empty):
```
node scripts/nomenclature-audit.js --update-baseline
```
This is the *first-ever* capture (`old` baseline absent on disk), so the growth-refusal check in §2 doesn't fire regardless of `--force` — it will always succeed and write the real current LARGE backlog (ADR estimate: 150+ findings pre-Phase-0; exact post-Phase-0 count is whatever the scanner actually finds — do not pre-guess a number). Commit `scripts/nomenclature-baseline.json` as its own `chore(audit):` commit, separate from the scanner-code commit, per CLAUDE.md's micro-commit cadence.

Validation before capture (do these against a scratch/manual run, not committed):
1. `node scripts/nomenclature-audit.js` (no flags) on current `main`-merged state → should print the full LARGE finding set with no crash.
2. Introduce a throwaway ghost `getElementById('doesNotExist123')` in a scratch copy → confirm N1 catches it. Revert.
3. Confirm the FM-6 camera example (`system-tools-module.js:2709/2713`) does **not** appear as `N2_ORPHAN_HANDLER` (validates §0.4's heuristic).
4. Confirm `click_switchTab_nexl` does **not** appear as `N3_LABEL_DRIFT` (validates §1.5's N3 grounding against the legacy-token/correct-label split).
5. `node scripts/nomenclature-audit.js --update-baseline` → real capture, commit.

---

## 6. Security

- **Read-only by default.** The only `fs.writeFileSync` call in the entire script is inside `updateBaseline()`, itself gated behind the explicit `--update-baseline` flag — identical posture to xss-audit.js's "no write path at all," extended by exactly one intentional, flag-gated exception, matching the ADR §3 Security & Performance Validator's stated requirement.
- **Zero `eval`, zero network.** The one subprocess dependency is `execSync('git diff --cached ...')` for `--changed-only` mode (§1.6) — local, read-only (git-diff mutates nothing), and not a new pattern for this repo: `.githooks/pre-commit:13` already shells out to `git diff --cached --name-only` for the root-whitelist check.
- **No new exposure.** Findings and the registry only ever reference identifiers already shipped in public JS/HTML (GitHub Pages-served); no secrets, keys, or URLs are read or emitted by design (mirrors ADR §3's own conclusion about the registry itself).
- **Crash containment.** The top-level try/catch (§1.0) ensures a bug in this new, more complex scanner can never escalate into a *blocking* commit failure while `--warn` is passed — this is a deliberate strengthening beyond xss-audit.js's current (simpler, already-stable) script, justified by this script's materially higher complexity.

---

## 7. Performance budget

ADR §3 baseline: xss-audit.js measured **0.115s / 2.37MB**; two-pass regex estimated **~0.3s**; no full AST parse in v1 (D4). This design's biggest perf risk is doing *N separate* full-codebase passes (one per collector) instead of one combined pass — at ~20 files this could multiply the 0.115s baseline 6-8×, blowing past budget. **Mitigated by §1.3's hard requirement**: all multi-file, per-line collectors (id decls, id lookups, emitter tokens, string literals, localStorage keys, CSS usage) run inside **one** shared `for (file) for (line)` loop. Only two intentional exceptions, both cheap and justified:
1. `collectDelegatorCases` (§1.4) — single-file (`system-event-delegator.js`, 564 cases, confirmed), single small pass.
2. `collectCssDefs` (§1.3) — whole-file regex on `<style>` blocks, HTML files only (2 files total).

Registry resolution (Pass 2, N1–N7) is pure in-memory Set/Map lookups against Pass 1's output — no additional file I/O, negligible cost relative to Pass 1's regex scanning. `--changed-only` does **not** reduce Pass 1/Pass 2 work (§0.6) — it only narrows the final report — so the "full-codebase re-resolution happens every run regardless of diff scope" cost the task brief calls out (~1,230 `getElementById` calls + 564 delegator cases) is a fixed per-commit cost, budgeted at well under 1s given it's Set-membership arithmetic, not additional regex scanning. The added `git diff --cached` subprocess calls in `--changed-only` mode are bounded by the number of *staged* files per commit (typically single digits), not codebase size.

---

## 8. Vanilla JS constraints

- CommonJS (`'use strict'`, `require`/`module.exports`), matching `package.json`'s `"type": "commonjs"` and xss-audit.js's own style.
- No `var` anywhere in the new file — `const`/`let` only, per CLAUDE.md.
- `scripts/**` is already excluded from eslint (`eslint.config.mjs:10`) — no config changes needed.
- No framework, no browser DOM APIs used (this is a pure Node build/CI tool, not runtime app code) — N/A for Web Bluetooth / native-DOM-only rules, which govern `assets/js/*.js` app code, not `scripts/*.js` tooling.

---

## 9. Not applicable to this task

- **4-state UX (Loading/Error/Empty/Success):** N/A — no UI component; this is a CLI/CI tool.
- **UI mutex (`window.executeWithButtonAction`):** N/A — no buttons, no DB mutation.
- **Zero-refresh (re-invoke render functions):** N/A — no render functions involved.
- **Supabase schema/RLS changes:** N/A — no table/column/RLS touched. `tools/nomenclature-registry.json` is read-only input this phase (frozen/ratified in Phase 1); if scanner development surfaces a registry gap or typo, log it as a **follow-up note**, do not silently edit the ratified file mid-Phase-2.

---

## Files Touched

| File | Change | Notes |
|---|---|---|
| `scripts/nomenclature-audit.js` | **NEW** | Two-pass scanner, N1–N7, §1 |
| `scripts/nomenclature-baseline.json` | **NEW** | Initial LARGE-backlog capture, §5 — commit as its own `chore(audit):` |
| `scripts/generate-nomenclature-dictionary.js` | **MODIFIED** | Export `buildOutput(registry)` alongside existing `generate()`, non-breaking, §0.7/§1.5 (N7) |
| `.githooks/pre-commit` | **MODIFIED** | Insert advisory `--warn --changed-only` call between xss-audit and version-bump, §3 |
| `package.json` | **MODIFIED** | Add `"audit:nomenclature"` script entry, §4 |
| `docs/nomenclature_dictionary.md` | **VERIFY ONLY** | Re-run `npm run generate:nomenclature-dict` once during implementation as a sanity check that N7 reports clean against current disk state; expect no diff since registry is unchanged this phase |
| `tools/nomenclature-registry.json` | **READ-ONLY** | Consumed, not modified (Phase 1 output, ratified) |

No changes to: `index.html`, `qa-dashboard.html`, any `assets/js/*.js` app module, any Supabase-facing code, `tools/SK8Lytz_App_Master_Reference.md` (no schema/RLS change to sync per CLAUDE.md's Corporate-brain-sync rule).

---

## Implementation sequence (for the implementer)

1. `scripts/generate-nomenclature-dictionary.js` — extract/export `buildOutput()` (§0.7). Commit: `refactor(nomenclature-dict): export pure buildOutput() for scanner reuse`.
2. `scripts/nomenclature-audit.js` — build in this order (each independently testable via ad-hoc `console.log` before wiring into `main()`): file collection (§1.1) → registry load + pattern compiler (§1.2) → Pass 1 combined collector (§1.3) → delegator case extraction (§1.4) → N1 → N2 → N3 → N4/N5 + line-filter (§1.6) → N6 → N7 → fingerprinting/report/`main()` (§1.7). Commit: `feat(nomenclature-audit): build two-pass scanner (N1-N7)`.
3. Manual validation per §5 steps 1–4 (scratch runs, not committed).
4. `--update-baseline` real capture (§5 step 5). Commit: `chore(audit): baseline initial nomenclature findings`.
5. `.githooks/pre-commit` wiring (§3) + `package.json` script entry (§4). Commit: `feat(nomenclature-audit): wire advisory pre-commit gate`.
6. Run the standard post-task validation swarm (xss-validator, test-lint-runner, test-guide-generator) before considering Phase 2 done — even though this task has no browser-facing surface, `test-lint-runner` (`npm test`, `npx eslint .`) still applies to confirm nothing else regressed.

### Manual verification (no browser UI — CLI-only; still required per CLAUDE.md's testing-guide mandate, adapted for a non-UI task)
1. `node scripts/nomenclature-audit.js` — confirm it runs to completion, prints a report, exits 0 or 1 sensibly (no crash).
2. `node scripts/nomenclature-audit.js --warn` — confirm exit code is `0` even when findings exist.
3. Stage an unrelated single-line change to any `assets/js/*.js` file, run `node scripts/nomenclature-audit.js --warn --changed-only` — confirm N4/N5 output is scoped to that file's changed lines only, not the whole codebase.
4. `git commit` a trivial change — confirm the hook runs xss-audit then nomenclature-audit then version-bump, in that order, and the commit succeeds regardless of nomenclature findings.
5. `node scripts/nomenclature-audit.js --update-baseline` twice in a row with no code changes between runs — second run should report "0 new, 0 removed" and succeed without `--force`.
