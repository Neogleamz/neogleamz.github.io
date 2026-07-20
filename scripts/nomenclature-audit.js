#!/usr/bin/env node
/**
 * nomenclature-audit.js — Deterministic nomenclature-drift scanner for Neogleamz OS.
 *
 * Two-pass regex scanner over index.html + qa-dashboard.html + assets/js/*.js,
 * cross-referenced against the ratified tools/nomenclature-registry.json, that
 * surfaces N1-N7 findings (ghost DOM lookups, orphan delegator tokens, label
 * drift, legacy-term occurrences, nonconformant localStorage keys, unused CSS,
 * dictionary staleness). Mirrors scripts/xss-audit.js conventions (CLI flags,
 * rule-object shape, exit codes, report format).
 *
 * ADR: docs/architecture/nomenclature-audit-engine.md
 * Plan: docs/plans/feat-nomenclature-audit-engine-1.md
 *
 * Usage:
 *   node scripts/nomenclature-audit.js                     — full scan, exit 1 if new blocking findings
 *   node scripts/nomenclature-audit.js --warn               — same scan, always exit 0 (advisory / pre-commit)
 *   node scripts/nomenclature-audit.js --changed-only        — narrow N4/N5 reporting to staged diff hunks
 *   node scripts/nomenclature-audit.js --update-baseline     — recapture scripts/nomenclature-baseline.json
 *   node scripts/nomenclature-audit.js --update-baseline --force — allow baseline growth
 *
 * Pre-commit wiring: .githooks/pre-commit runs `--warn --changed-only` (advisory, Phase 2).
 */

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

const WARN_MODE       = process.argv.includes('--warn');
const UPDATE_BASELINE = process.argv.includes('--update-baseline');
const FORCE           = process.argv.includes('--force');
const CHANGED_ONLY    = process.argv.includes('--changed-only');

const DELEGATED_EVENT_TYPES = [
  'click', 'keyup', 'mousedown', 'change', 'input',
  'mouseover', 'mouseout', 'submit', 'focus', 'blur'
]; // confirmed via document.body.addEventListener(...) calls in system-event-delegator.js:13-2121

// ── 1.1 File collection ─────────────────────────────────────────────────────

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

// ── 1.2 Registry loading + pattern compilation ──────────────────────────────

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

// ── 1.3 Pass 1 — single combined collector ──────────────────────────────────

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

  return { literalIds, dynamicPrefixes, domIdLookups, emitterTokens, indirectEmitters,
           allStringLiterals, localStorageKeys, cssClassUsages, cssClassDefs };
}

// ── 1.4 Delegator case extraction (single-file, targeted pass) ─────────────

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

// ── 1.5 Pass 2 — N1-N7 checks ───────────────────────────────────────────────
// Every finding has shape { ruleId, severity, file, line, identifier, message }.
// severity ∈ {CRITICAL, MODERATE, ADVISORY} — ADVISORY (N6 only) never
// contributes to exit-code/blocking logic regardless of mode (hard-codes D6).

// N1 — Ghost DOM lookups
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

// N2 — Orphan delegator tokens (both directions)
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

// N3 — L1 label drift (hub tabs + registry panes only, per ADR's "cheaply checkable" scoping)
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

// N4 — Legacy-term occurrences (scans only index.html/qa-dashboard.html/assets/js/*.js —
// never docs/ or tools/*.md, because the registry/dictionary/Master Reference alias
// tables intentionally contain these terms as documentation)
// No negative lookbehind: legacy instances are camelCase segments (paneProdBuilder,
// paneProdControl, paneProdPrint) where 'Prod' is preceded by a lowercase letter, not
// a word start. The positive lookahead alone already excludes all false-positive
// English words (Production, product, produce, productive all have a lowercase letter
// immediately after "Prod", never uppercase).
const RE_PROD_BOUNDARY = /Prod(?=[A-Z])/g;
// verified: matches paneProdBuilder, paneProdControl, paneProdPrint, bare ProdBuilder —
// does NOT match Production, product, produce, productive (case-sensitive + lookahead-guard)

function checkTermOnLine(term, matchScope, line) {
  // NOTE: registry match_scope strings carry explanatory parentheticals
  // (e.g. "identifier-boundary only (e.g. paneProd*, ProdBuilder, ...)") — match
  // on prefix, not exact equality, so the full registry string still routes to
  // the correct heuristic. Verified against tools/nomenclature-registry.json:161-165.
  if (matchScope.startsWith('identifier-safe substring')) {                 // Salez, Nexl, Salz
    return line.includes(term);
  }
  if (matchScope.startsWith('identifier-context only')) {                   // Bridge
    const re = /\b[A-Za-z0-9_]*[Bb]ridge[A-Za-z0-9_]*\b/g;
    let m;
    while ((m = re.exec(line))) if (m[0].length > 6) return true; // longer than bare "bridge"/"Bridge" => part of a compound identifier
    return false;
  }
  if (matchScope.startsWith('identifier-boundary only')) {                  // Prod
    return RE_PROD_BOUNDARY.test(line) && (RE_PROD_BOUNDARY.lastIndex = 0, true);
  }
  return false;
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

// N5 — localStorage key conformance (new keys only; existing legacy prefixes are frozen per D8)
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

// N6 — Unused CSS (advisory forever, D6)
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
// Line is fixed at 1 (not tracked precisely — acceptable per D6's "zero false-positive-freedom
// is structurally impossible, don't over-engineer"; fingerprint uses (file, ruleId, className)
// so line-inaccuracy doesn't affect identity).

// N7 — Registry <-> dictionary sync (dictionary half only, per §0.5)
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

// ── 1.6 Changed-line-range filtering (N4/N5, --changed-only mode) ──────────

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
// A newly-added (untracked-then-staged) file shows one hunk `@@ -0,0 +1,N @@`, which naturally
// covers its entire content as "changed" — correct: a wholly new file's legacy terms/keys are
// new introductions and should be checked in full.

// ── 1.7 Fingerprinting, baseline, reporting, main() ─────────────────────────

function fingerprint(f) { return `${f.file}|${f.ruleId}|${f.identifier}`; }

function dedupeByFp(findings) {
  const seen = new Map();
  findings.forEach(f => { if (!seen.has(f.fp)) seen.set(f.fp, f); });
  return [...seen.values()];
}

function loadBaselineIfExists() {
  return fs.existsSync(BASELINE_PATH) ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) : null;
}

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

const SEVERITY_ICON = { CRITICAL: '🔴', MODERATE: '🟠', ADVISORY: '⚪' };

function printReport(allFindings, newBlocking, baselineCount, changedOnly) {
  const critical = allFindings.filter(f => f.severity === 'CRITICAL');
  const moderate = allFindings.filter(f => f.severity === 'MODERATE');
  const advisory = allFindings.filter(f => f.severity === 'ADVISORY');

  if (allFindings.length === 0) {
    console.log('✅  Nomenclature audit passed — 0 findings.');
    return;
  }

  console.error(`\n${'─'.repeat(72)}`);
  console.error(`🧭  NOMENCLATURE AUDIT — ${allFindings.length} finding(s)  ` +
    `[${critical.length} CRITICAL  ${moderate.length} MODERATE  ${advisory.length} ADVISORY]` +
    (changedOnly ? '  (--changed-only)' : ''));
  console.error(`${'─'.repeat(72)}\n`);

  const byRule = new Map();
  for (const f of allFindings) {
    if (!byRule.has(f.ruleId)) byRule.set(f.ruleId, []);
    byRule.get(f.ruleId).push(f);
  }

  for (const [ruleId, findings] of byRule) {
    console.error(`── ${ruleId} (${findings.length}) ${'─'.repeat(Math.max(0, 60 - ruleId.length))}`);
    for (const f of findings) {
      const icon = SEVERITY_ICON[f.severity] || '⚪';
      console.error(`${icon}  ${f.file}:${f.line}  [${f.ruleId}]`);
      console.error(`   ${f.message}`);
    }
    console.error('');
  }

  console.error(`${'─'.repeat(72)}`);
  console.error(`${newBlocking.length} of ${allFindings.length} total findings are NEW (not in baseline of ${baselineCount}).`);
  console.error(`Full backlog tracked in scripts/nomenclature-baseline.json.`);
  console.error(`Follow-up work tracked in tools/SK8Lytz_Bucket_List.md → ## 🧹 Technical Debt`);
  console.error(`${'─'.repeat(72)}\n`);
}

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
