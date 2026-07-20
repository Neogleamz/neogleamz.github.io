# debt/nomenclature-remediation — Batch 8: N4_LEGACY_TERM disposition (84 findings) + tiny N1 bonus fix

## 0. Methodology note — the mapper's report was NOT trusted; everything below was re-derived from scratch

Per the task brief, the explore-mapper's "74 of 84 = Category A" verdict was explicitly flagged as unreliable (self-contradicting "verify in DOM" hedges, an Unknowns section that disagrees with its own headline number). Every claim in this plan was independently re-confirmed via direct `Read`/`Grep` against the live repo and the actual `tools/nomenclature-registry.json` — not the mapper's prose. **Zero Bash access was used or available to this planner; no scanner script was executed live.** All raw-occurrence counts below were derived by manually re-implementing `checkN4`'s exact matching rules (`RE_PROD_BOUNDARY`, the `Bridge` compound-identifier regex, the plain-substring checks for `Salez`/`Nexl`/`Salz`) against `Grep` output, restricted to the same 3 file classes the scanner actually reads (`index.html`, `qa-dashboard.html`, `assets/js/*.js` — never `docs/`, `tools/*.md`, or `tools/*.json`). **The implementer must still run `node scripts/nomenclature-audit.js --warn` live before committing** to confirm these hand-derived numbers — this plan's confidence is "Medium-High, cross-checked twice" (see §3.0), not "Verified by execution."

**Result of this re-derivation: my independently-computed raw total is exactly 84** (Salez 35 + Nexl 24 + Salz 10 + Bridge 8 + Prod 7), matching the task's stated figure — a strong cross-check that the file-scope and per-term matching rules were reproduced correctly.

---

## 1. STEP 1 — Scanner-mechanics finding (read this before anything else; it defines what "success" means for this batch)

Read `checkN4` in full, `nomenclature-audit.js:404-418`, plus its only helper `checkTermOnLine` (`:384-402`) and the call site in `main()` (`:609`):

```js
function checkN4(fileRecords, watchlist, lineFilterFn) {
  const findings = [];
  for (const rec of fileRecords) {
    for (let i = 0; i < rec.lines.length; i++) {
      if (!lineFilterFn(rec.relPath, i + 1)) continue;
      for (const entry of watchlist) {
        if (checkTermOnLine(entry.term, entry.match_scope, rec.lines[i])) {
          findings.push({ ruleId: 'N4_LEGACY_TERM', ... });
        }
      }
    }
  }
  return findings;
}
...
...checkN4(fileRecords, registry.legacy_term_watchlist, lineFilter),
```

**Confirmed: `checkN4` consults exactly one registry field — `registry.legacy_term_watchlist`** (the 5-entry `{term, match_scope, false_positive_risk, note}` array). It reads `term` and `match_scope` only, to decide *where in a line* a hit might textually appear (bare substring vs. compound-identifier-only vs. camelCase-boundary-only). **It does not read, import, or reference `rename_forbidden`, `legacy_function_aliases`, `legacy_token_aliases`, `hubs.*.panes.*`, or `dynamic_id_allowlist` anywhere in its body.** Those four structures are consumed exclusively by `checkN1` (`dynamic_id_allowlist` only) and `checkN5` (the `persistence`-filtered subset of `rename_forbidden` only) — never by `checkN4`.

**Therefore: N4 has zero per-identifier suppression mechanism, full stop.** There is no N4 analogue to N1's `dynamic_id_allowlist`. A registry entry marking `paneSalezBridge` as `"rename_status": "documented-alias-do-not-rename"` is 100% real, human-readable documentation — and it changes **nothing** about whether `node scripts/nomenclature-audit.js` reports a hit on the line `<div id="paneSalezBridge" ...>`. It will keep firing, forever, until either (a) the literal text `Salez`/`Bridge` is removed from that line (an actual rename — explicitly out of scope for every one of the 61 "already-documented-alias" identifiers per this epic's own D2 decision, "document, don't rename"), or (b) someone adds a suppression mechanism to `checkN4` itself (a scanner-hardening change, out of scope for a nomenclature-remediation **content** batch — it would touch `scripts/nomenclature-audit.js`, not `tools/nomenclature-registry.json`).

**What this means for grading this batch:** the pre-batch N4_LEGACY_TERM raw count is 84. **The post-batch N4_LEGACY_TERM raw count will also be 84.** This is not a shortfall — it is the mathematically guaranteed, by-design result of a batch that (correctly, per D2 precedent) adds documentation instead of renaming live wired identifiers. Do not evaluate this batch by "did N4 go down." Evaluate it by: (1) is every one of the 84 findings now correctly triaged with cited evidence, (2) does the registry now contain a real, quotable entry for every identifier that's actually documentable, (3) did the one genuinely fixable N1 side-effect (§5) get fixed. Only §5 (the `SecondaryFee`/`GroupWeight` family-pattern fix) moves any scanner number in this batch — and it moves `N1_GHOST_ID`, not `N4_LEGACY_TERM`.

---

## 2. STEP 2 — Registry cross-references re-verified against the actual JSON (quoted, not paraphrased)

All quotes below are copied verbatim from `tools/nomenclature-registry.json` as read in full for this plan.

### 2.1 `paneSalezBridge` / `paneSalezAnalyticz` / `paneSalezCommandz` — CONFIRMED real, literal keys

```json
"REVENUEZ": {
  "panes": {
    "paneSalezBridge": { "canonical_label": "ORDERZ", "embedded_legacy_terms": ["Salez", "Bridge"], "rename_status": "documented-alias-do-not-rename", "note": "Selected via runtime string concatenation index.html:5196 — see dynamic_id_allowlist 'paneSalez*'." },
    "paneSalezAnalyticz": { "canonical_label": "STATZ", "embedded_legacy_terms": ["Salez"], "rename_status": "documented-alias-do-not-rename" },
    "paneSalezCommandz": { "canonical_label": "SIMULATORZ", "embedded_legacy_terms": ["Salez"], "rename_status": "documented-alias-do-not-rename" }
  }
}
```
Confirmed exact keys exist. `paneSalezBridge` even explicitly lists `"Bridge"` as a second `embedded_legacy_terms` entry — covers both the `Salez` and `Bridge` N4 findings on the same declaration line.

**Citation drift found (see §4):** the `note`'s `index.html:5196` is stale — the actual runtime-concatenation line today is `index.html:4984` (confirmed via `Grep`: `const pane = document.getElementById('paneSalez' + paneId.charAt(0).toUpperCase() + paneId.slice(1));`).

### 2.2 `showSalezPane` / `syncSalezStats` — CONFIRMED `legacy_function_aliases` entries

```json
"legacy_function_aliases": {
  "syncSalezStats": { "file": "assets/js/neogleamz-engine.js", "lines": [1062, 1119], "embedded_legacy_terms": ["Salez"], "rename_status": "documented-alias-do-not-rename", "note": "Referenced by name inside a function-pointer table entry {name:'SALEZ', func: syncSalezStats} (line 1119) — a rename must update both the declaration and this table entry atomically." },
  "showSalezPane": { "file": "index.html", "lines": [5190], "embedded_legacy_terms": ["Salez"], "rename_status": "documented-alias-do-not-rename", "related_tokens": ["click_showSalezPane_bridge", "click_showSalezPane_analyticz", "click_showSalezPane_commandz"], "note": "Also declared writable in eslint.config.mjs globals." }
}
```
Confirmed. `syncSalezStats`'s cited lines (1062, 1119) are **still accurate** — verified via direct `Read` of `assets/js/neogleamz-engine.js:1062` (`function syncSalezStats() {`) and `:1119` (`{ name: "SALEZ", func: syncSalezStats },`).

`showSalezPane`'s cited line (5190) is **stale** — actual definition is `index.html:4978` (see §4). `related_tokens` are all confirmed real and current: `click_showSalezPane_bridge`/`_analyticz`/`_commandz` all exist as literal `data-click` values at index.html:2259/2271/2283 (hub-cards) and 2306/2307/2321/2322/2383/2384 (nav-zone prev/next arrows), with matching delegator cases at system-event-delegator.js:599/602/605.

### 2.3 `paneNexlImportz` / `paneNexlSalez` / `paneNexlBrainz` / `showNexlPane` — CONFIRMED

```json
"NEXUZ": {
  "panes": {
    "paneNexlImportz": { "canonical_label": "IMPORTZ", "embedded_legacy_terms": ["Nexl"], "rename_status": "documented-alias-do-not-rename", "note": "Selected via static lookup object index.html:5249 (literal-matchable, not concatenation)." },
    "paneNexlSalez": { "canonical_label": "SALEZ", "embedded_legacy_terms": ["Nexl"], "rename_status": "documented-alias-do-not-rename" },
    "paneNexlBrainz": { "canonical_label": "BRAINZ", "embedded_legacy_terms": ["Nexl"], "rename_status": "documented-alias-do-not-rename" }
  }
},
"legacy_function_aliases": {
  "showNexlPane": { "file": "index.html", "lines": [5243], "embedded_legacy_terms": ["Nexl"], "rename_status": "documented-alias-do-not-rename", "related_tokens": ["click_showNexlPane_importz", "click_showNexlPane_salez", "click_showNexlPane_brainz"], ... }
}
```
Confirmed. **`paneNexlSalez` is worth flagging explicitly: its div (`index.html:2925`) and its mapping-object value (`index.html:5036`) each independently trip BOTH the `Salez` watchlist term AND the `Nexl` watchlist term on the same 2 lines** — both terms are covered by this one entry's `embedded_legacy_terms` list only partially (it lists `["Nexl"]` only, not `["Nexl","Salez"]`) — **minor documentation gap**: recommend adding `"Salez"` to `paneNexlSalez.embedded_legacy_terms` for completeness (zero scanner effect either way, since N4 doesn't read this field — pure accuracy fix, bundled into §6).

Citation drift: `showNexlPane` (5243 → actual 5030), `paneNexlImportz`'s static-lookup note (5249 → actual 5036). See §4.

### 2.4 `paneProdBuilder` / `paneProdControl` / `paneProdPrint` — CONFIRMED, and the "line 207" comment read in full

```json
"MAKERZ": {
  "panes": {
    "paneProdBuilder": { "canonical_label": "RECIPEZ", "embedded_legacy_terms": ["Prod"], "rename_status": "documented-alias-do-not-rename", "note": "Selected via static lookup object index.html:5211 (literal-matchable, not concatenation)." },
    "paneProdControl": { "canonical_label": "BATCHEZ", "embedded_legacy_terms": ["Prod"], "rename_status": "documented-alias-do-not-rename" },
    "paneProdPrint": { "canonical_label": "LAYERZ", "embedded_legacy_terms": ["Prod"], "rename_status": "documented-alias-do-not-rename" }
  }
}
```
Confirmed. The cited "line 207" comment (`dynamic_id_allowlist[0]`, the `paneSalez*` entry) reads in full:

> "The ONLY hub pane-switcher using true concatenation. showProductionPane (paneProd*), showFulfillzPane (paneFulfillz*), and showNexlPane (paneNexl*) all use static lookup objects (index.html:5211, 5232, 5249) — their ids are literal string values, resolvable by exact match. **Do not add paneProd*/paneNexl*/paneFulfillz* here; doing so would over-broaden N1 and mask genuine ghost ids in those functions.**"

**This comment is exclusively about N1 (ghost-DOM-lookup) resolution mechanics — it has nothing to do with N4.** `paneProdBuilder`/`paneNexlImportz`/etc. resolve for N1 because they are declared as *literal* `id="paneProdBuilder"` strings somewhere in `index.html` (captured in `collected.literalIds` via `RE_ID_ATTR_LITERAL`), so any `getElementById('paneProdBuilder')` call resolves without ever touching `dynamic_id_allowlist`. `paneSalez*` needs the allowlist entry specifically because it's assembled via runtime string concatenation (`'paneSalez' + paneId...`), which produces a `prefix`-kind lookup classification that only `dynamic_id_allowlist` can resolve. **None of this affects N4 at all** — the literal text `paneProdBuilder` still contains `Prod` followed by an uppercase letter, so `RE_PROD_BOUNDARY` still fires on every line where that literal string appears, regardless of how N1 resolves it.

Citation drift: `paneProdBuilder`'s static-lookup note (5211 → actual 4999). See §4.

### 2.5 `statSalzMap`/`statSalzOrd30`/`statSalzNet30`/`statSalz30d`/`statSalzHealth` — CONFIRMED registry gap; CONFIRMED zero persistence risk

Grepped the full registry text: **zero mention of any `statSalz*` identifier anywhere in `tools/nomenclature-registry.json`.** The mapper's gap claim is correct.

Read `setStat` in full, `assets/js/neogleamz-engine.js:611-618`:
```js
const setStat = (id, val) => {
    const el = document.getElementById(id);
    if (el) {
        el.innerText = val;
        el.classList.add('pulse-orange');
        setTimeout(() => el.classList.remove('pulse-orange'), 4000);
    }
};
```
**Confirmed: zero persistence risk.** `setStat()` only sets `.innerText`/`classList` and a `setTimeout` — no `localStorage`/`sessionStorage`/Supabase call anywhere in its body. The `id` argument is a **bare variable**, so `document.getElementById(id)` here is architecturally invisible to N1 (`classifyLookupArg` returns `dynamic-unresolvable` for bare-variable arguments — "not scanned, no finding, avoid false positives"). All 5 stat ids have real, literal DOM producers: `index.html:2824-2828` (`<strong id="statSalzMap">--</strong>` etc., inside `paneNexlSalez`). **Verdict: genuinely internal-only, zero external/persistence contract, real live producer+consumer pair. This is a REGISTRY GAP, DOCUMENT-ONLY case** — not a rename candidate, because renaming would require synchronized edits across `neogleamz-engine.js` (5 `setStat(...)` calls) and `index.html` (5 `id="..."` attributes) for zero functional benefit, matching this epic's D2 precedent of documenting rather than touching working, wired code. Proposed entry: §6.1.

### 2.6 `btnSalezImport`/`btnSalezImportTest` — mapper's "couldn't confirm a producer" claim is WRONG; both are real, confirmed live buttons

```
index.html:2946: <button id="btnSalezImport" class="btn-green" ... data-click="click_document_getElementById_salesC">📦 IMPORT SALEZ CSV</button>
index.html:2951: <button id="btnSalezImportTest" class="btn-orange-muted" ... data-click="click_document_getElementById_salesC_5">🧪 INGEST TEST FILE</button>
```
**Both producers exist, confirmed via direct grep of `index.html`.** The mapper's "Unknowns" hedge on this point was itself wrong — not merely unverified.

Read `executeWithButtonAction` in full, `index.html:4630-4631`:
```js
async function executeWithButtonAction(btnIdOrElement, loadingStr, successStr, asyncCallback) {
    const btn = typeof btnIdOrElement === 'string' ? document.getElementById(btnIdOrElement) : btnIdOrElement;
```
**Confirmed: `getElementById(btnIdOrElement)` here uses a bare parameter variable, not a literal string** — same `dynamic-unresolvable` classification as `setStat()`. This directly answers the task's own question: *"if it just does `document.getElementById(btnId)` then a nonexistent button here would ALSO be an unreported N1 ghost."* Since `btnSalezImport`/`btnSalezImportTest` genuinely exist as real `id=` producers, there is no ghost here at all — confirmed, not merely "would be if the button didn't exist." **Verdict: REGISTRY GAP, DOCUMENT-ONLY** (§6.2) — real, live, wired via `executeWithButtonAction('btnSalezImport', ...)` at `assets/js/system-event-delegator.js:1781` / `:1784`.

### 2.7 `nexlHubLanding` — NOT one of the 84 N4 findings; a separate, case-sensitivity scanner blind spot (false negative)

Confirmed real and live: `index.html:2806` (`<div id="nexlHubLanding" ...>`), consumed at `index.html:5034` (`document.getElementById('nexlHubLanding').style.setProperty('display', 'flex', 'important');`), and referenced (twice, redundantly — see below) inside the explicit-cleanup array at `index.html:4232`.

**Critical correction: this identifier is spelled with a lowercase `n` ("nexl"), and the `legacy_term_watchlist`'s `"Nexl"` term is matched via `line.includes('Nexl')` — a case-sensitive substring check.** `"nexlHubLanding".includes("Nexl")` is `false`. **`nexlHubLanding` never triggers N4 at all, on any of its 3 occurrences, today.** This is why my independent re-derivation of the 84 findings (§0) does not include it anywhere, and why it is *not* part of "the 84" this batch triages — it's a separate discovery, a false-negative scanner blind spot in the opposite direction from N4's usual false-positive risk.

Is it a rename candidate? Genuinely low-risk if it were (3 call sites, zero persistence, zero delegator-token coupling) — but per this epic's consistent D2 "document, don't touch live wired code" posture across every prior batch, and since it isn't even scanner-visible today (no pressure to "clear a finding"), **recommendation: take no action this batch.** Log as an optional future micro-cleanup, not a Batch 8 deliverable (see §7).

**Bonus, unrelated discovery while tracing this:** `index.html:4232`'s cleanup array literally repeats the same string twice — `['stockpilezHubLanding', 'makerzHubLanding', 'revenuezHubLanding', 'paneSyncMaster', 'nexlHubLanding', 'nexlHubLanding']` — a harmless, idempotent duplicate (confirmed: the `forEach` just calls `getElementById`+`style.setProperty('display','none','important')` twice on the same element, zero behavior difference). Not a nomenclature finding, not touched this batch — flagged only for completeness; a genuine future one-line Boy-Scout nit if anyone is already editing that exact line for another reason.

### 2.8 `ccMobileBridgeStatus` — confirmed the same already-known, already-deferred cc* cluster; excluded

```
assets/js/inventory-module.js:1394:  const statusCheck = document.getElementById('ccMobileBridgeStatus');
assets/js/inventory-module.js:1733:  const statusCheck = document.getElementById('ccMobileBridgeStatus');
```
Confirmed present in the frozen `scripts/nomenclature-baseline.json` as an existing `N1_GHOST_ID` fingerprint (`"file": "assets/js/inventory-module.js", "identifier": "ccMobileBridgeStatus"`), consistent with Batches 4-7's standing documentation of the Cycle Count Mobile Bridge cluster as embedded in live shared functions, requiring its own dedicated in-function-surgery plan. **Excluded from this batch, exactly as instructed** — these are the only 2 of the 84 N4 findings tied to the `cc*`/Bridge cluster (the "Bridge" watchlist term's compound-identifier match on `ccMobileBridgeStatus`); do not touch, do not re-litigate.

---

## 3. STEP 3 — Final, independently re-derived disposition of all 84 findings

### 3.0 Cross-check math (confidence basis)

Manually re-implementing `checkTermOnLine`'s 3 heuristics against `Grep` output for each of the 5 watchlist terms, restricted to `index.html` + `assets/js/*.js` (never `tools/`, `docs/`, `qa-dashboard.html` had zero hits for all 5 terms):

| Term | Match scope | Raw line-hits (this plan) |
|---|---|---|
| `Salez` | identifier-safe substring | 35 |
| `Nexl` | identifier-safe substring | 24 |
| `Salz` | identifier-safe substring | 10 |
| `Bridge` | identifier-context only (compound >6 chars) | 8 |
| `Prod` | identifier-boundary only (`Prod(?=[A-Z])`) | 7 |
| **Total** | | **84** |

Exact match to the task's stated figure — high confidence the file-scope and per-term logic were reproduced correctly. (Two bare-word exclusions were verified by hand against the `Bridge` heuristic's `m[0].length > 6` filter: `index.html:4986` `if (paneId === 'bridge')` and `system-event-delegator.js:600` `showSalezPane('bridge')` — both are bare 6-character `'bridge'` string literals, correctly excluded by the length filter, not counted in the 8.)

### 3.1 Disposition summary

| Disposition | Count | % of 84 |
|---|---|---|
| **ALREADY GENUINELY REGISTRY-PROTECTED** (exact entry quoted, §2) | **61** | 73% |
| **REGISTRY GAP, DOCUMENT-ONLY** (new entries proposed, §6) | **21** | 25% |
| **OUT OF SCOPE, ALREADY FLAGGED ELSEWHERE** (`cc*`/Bridge cluster) | **2** | 2% |
| **GENUINE RENAME CANDIDATE** | **0** | 0% |

**Reclassified away from the mapper's claimed "74 Category A": 13 findings** (74 → 61 confirmed). Itemized:
- 6 Salez-term findings the mapper likely folded into "Category A" that are actually gaps: `btnSalezImport`/`btnSalezImportTest` declarations (2 lines) + their `executeWithButtonAction` call sites (2 lines) + `sessionStorage` `'activeSalezPane'` set/remove (2 lines).
- 2 Nexl-term findings: `sessionStorage` `'activeNexlPane'` set/remove.
- 10 Salz-term findings: the entire `statSalz*` cluster (this matches the task's own framing — the mapper's "Unknowns" section already flagged these as contradicting its own "Category A" verdict; this plan confirms the contradiction was correct and resolves it as a gap, not a protected entry).
- 3 Prod-term findings: `sessionStorage` `'activeProdPane'` set/remove/read (the function name `showProductionPane` itself is not a Prod-term hit — see §3.2 note).
- (The 2 `cc*`/Bridge findings were not part of either Category A or this gap list — they're their own explicit exclusion, unaffected by the 74→61 recount.)

### 3.2 Full per-cluster breakdown

**Salez (35 raw hits) — 29 covered / 6 gap**

| Lines (index.html unless noted) | What | Disposition |
|---|---|---|
| 679, 2298, 2317, 2371 | `paneSalezBridge`/`Analyticz`/`Commandz` div declarations + CSS selector | COVERED — `hubs.REVENUEZ.panes.*` (§2.1) |
| 2259, 2271, 2283, 2306, 2307, 2321, 2322, 2383, 2384 | `click_showSalezPane_bridge/analyticz/commandz` hub-card + nav-zone tokens | COVERED — `legacy_function_aliases.showSalezPane.related_tokens` (§2.2) |
| 2925, 5036 | `paneNexlSalez` div + mapping value (cross-lists with Nexl term too) | COVERED — `hubs.NEXUZ.panes.paneNexlSalez` (§2.3) |
| 4951, 4978, 4984 | `showSalezPane` call site, definition, runtime-concat lookup | COVERED — `legacy_function_aliases.showSalezPane` (§2.2) |
| system-event-delegator.js:599,600,602,603,605,606 | delegator cases + `showSalezPane(...)` calls | COVERED — same |
| neogleamz-engine.js:1062,1119 | `syncSalezStats` def + function-pointer entry | COVERED — `legacy_function_aliases.syncSalezStats` |
| inventory-module.js:411,3156; barcodz-module.js:615 | `getElementById('paneSalezAnalyticz')` guards | COVERED — `hubs.REVENUEZ.panes.paneSalezAnalyticz` |
| **2946, 2951** | `btnSalezImport`/`btnSalezImportTest` declarations | **GAP** — §6.2 |
| **system-event-delegator.js:1781,1784** | `executeWithButtonAction('btnSalezImport'/'btnSalezImportTest', ...)` | **GAP** — §6.2 |
| **4517, 4979** | `sessionStorage` `'activeSalezPane'` remove/set | **GAP** — §6.3 |

**Nexl (24 raw hits) — 22 covered / 2 gap**

| Lines | What | Disposition |
|---|---|---|
| 2807,2819,2831,2846,2850,2851,2925,2929,2930,3063,3067,3068,5036 | `paneNexlImportz`/`Salez`/`Brainz` divs + nav tokens + mapping | COVERED — `hubs.NEXUZ.panes.*` |
| 4952, 5030 | `showNexlPane` call site + definition | COVERED — `legacy_function_aliases.showNexlPane` |
| system-event-delegator.js:743,744,746,747,749,750,1514 | delegator cases + `showNexlPane(...)` calls | COVERED — same |
| **4518, 5031** | `sessionStorage` `'activeNexlPane'` remove/set | **GAP** — §6.3 |

**Salz (10 raw hits) — 0 covered / 10 gap**

| Lines | What | Disposition |
|---|---|---|
| neogleamz-engine.js:1065,1087,1088,1089,1090; index.html:2824,2825,2826,2827,2828 | `statSalzMap`/`Ord30`/`Net30`/`30d`/`Health` — 5 `setStat()` calls + 5 producers | **GAP (all 10)** — §6.1 |

**Bridge (8 raw hits) — 6 covered / 2 out-of-scope**

| Lines | What | Disposition |
|---|---|---|
| 679, 2259, 2298, 2321, 2384; system-event-delegator.js:599 | Same `paneSalezBridge`/`click_showSalezPane_bridge` occurrences as the Salez cluster — `"Bridge"` is explicitly listed in `paneSalezBridge.embedded_legacy_terms` | COVERED — §2.1 |
| **inventory-module.js:1394, 1733** | `ccMobileBridgeStatus` | **OUT OF SCOPE** — §2.8, cc* cluster |

**Prod (7 raw hits) — 4 covered / 3 gap**

| Lines | What | Disposition |
|---|---|---|
| 1969, 2052, 2145, 4999 | `paneProdBuilder`/`Control`/`Print` divs + mapping object | COVERED — `hubs.MAKERZ.panes.*` (§2.4) |
| **4516, 4950, 4994** | `sessionStorage` `'activeProdPane'` remove/read/set | **GAP** — §6.3 |

(Note: `showProductionPane` the function *name* is not itself a Prod-term hit — `RE_PROD_BOUNDARY` requires an uppercase letter immediately after "Prod"; "showProductionPane" has "u" (lowercase) after "Prod", i.e. it's the legitimate English word "Production", correctly excluded exactly as the watchlist's own false-positive-risk note anticipated. Line 4950's actual trigger is the `'activeProdPane'` substring on that same line, not the function name.)

---

## 4. Registry evidence-line drift — new, systemic finding (not part of the 84, but directly relevant to anti-hallucination discipline)

While re-verifying §2's citations, **6 independent `index.html` line citations in the ratified registry were found to be stale**, by inconsistent (non-uniform) offsets — ruling out a single clean "add N to every citation" fix:

| Registry field | Cited line | Actual current line | Drift |
|---|---|---|---|
| `legacy_function_aliases.showSalezPane.lines` | 5190 | 4978 | −212 |
| `legacy_function_aliases.showNexlPane.lines` | 5243 | 5030 | −213 |
| `legacy_token_aliases.click_switchTab_nexl.emitter_line` | 1931 | 1782 | −149 |
| `hubs.REVENUEZ.panes.paneSalezBridge.note` (concat line) | 5196 | 4984 | −212 |
| `hubs.MAKERZ.panes.paneProdBuilder.note` (static lookup) | 5211 | 4999 | −212 |
| `hubs.NEXUZ.panes.paneNexlImportz.note` (static lookup) | 5249 | 5036 | −213 |
| `dynamic_id_allowlist[paneSalez*].evidence` (concat line) | 5196 | 4984 | −212 |
| `dynamic_id_allowlist[paneSalez*].note` (3 lookup-object citations: paneProd*/paneFulfillz*/paneNexl*) | 5211, 5232, 5249 | 4999, 5019, 5036 | −212/−213/−213 |

By contrast, every JS-file citation independently spot-checked (`neogleamz-engine.js:1062,1119` for `syncSalezStats`; `system-event-delegator.js:83` for `click_switchTab_nexl`'s handler_line) is **still accurate** — the drift is `index.html`-specific, consistent with one or more large HTML insertions/deletions since the registry's 2026-07-17 ratification date, at different points in the file (hence the two different offset magnitudes, ~149 vs. ~212-213).

**Recommendation: correct these 6 fields' line citations as part of this batch** (§6.4) — they're small, safe, zero-behavior-change JSON-metadata edits directly adjacent to work this batch is already doing, matching the exact precedent Batch 7 set for `stockzTopHeight`'s stale evidence. **Do not** attempt a blanket repo-wide citation audit in this batch — the non-uniform offset proves each citation needs individual re-verification, and doing that exhaustively for the ~40 other `index.html` citations in the registry is a separate, larger undertaking. **Recommend logging a dedicated future task** (e.g. `chore/nomenclature-registry-evidence-refresh`) to systematically re-verify every remaining `index.html` line citation in the registry.

---

## 5. Bonus fix — `SecondaryFee`/`GroupWeight` family-pattern addition (the ONE thing in this batch that moves an N1 number)

**Confirmed via direct `Read` of the current `assets/js/system-tools-module.js`:** `fix/regex-playground-preset-bugs` (a separate, already-merged branch) fixed the 2 crash/silent-button bugs Batch 7 left as findings, and its own Execution Addendum documents the side effect this task describes:

```js
// system-tools-module.js:114-115 (getCurrentUIRules) — AFTER the fix
regexPostage: document.getElementById('regexFeeStructure').value.trim(),
regexMakeup: document.getElementById('regexSecondaryFee').value.trim(),   // ← new live consumer of regexSecondaryFee

// system-tools-module.js:418 (getCurrentParcelUIRules) — AFTER the fix
regexGroupWeight: document.getElementById('regexGroupWeight').value.trim(),   // ← new live consumer of regexGroupWeight

// system-tools-module.js:453-454 (renderParcelPresetDropdown) — AFTER the fix
let btnDelete = document.getElementById('btnDeletePreset');
let btnOver = document.getElementById('btnOverwritePreset');
```

Both `regexSecondaryFee` (real producer, `system-tools-module.js:1858`) and `regexGroupWeight` (real producer, `:1919`) render via the same zero-static-prefix `id="${f.id}"` template as the other 17 already-allowlisted fields — architecturally invisible to N1's literal/dynamic-prefix resolution, same mechanism Batch 7 already documented. **They are NOT in the current family-pattern alternation** (`tools/nomenclature-registry.json`, `dynamic_id_allowlist[6]`, `~json-line 224-229`), because Batch 7 explicitly excluded them at the time ("currently zero getElementById lookups exist for them anywhere"). That precondition is now false — confirmed exactly 1 `getElementById` occurrence each (`:115` and `:418`), both new since Batch 7. **This means `regexSecondaryFee` and `regexGroupWeight` currently fire as new `N1_GHOST_ID` CRITICAL findings** (confirmed directly by `fix/regex-playground-preset-bugs`'s own Execution Addendum: *"pointing getElementById at regexSecondaryFee and regexGroupWeight for the first time surfaced 2 new N1 findings... flagged as a small follow-up item for a future debt/nomenclature-remediation batch"*) — this is that follow-up.

**Fix:** append `|SecondaryFee|GroupWeight` to the existing alternation and update the note (exact before/after in §6.5). **Predicted N1_GHOST_ID delta: −2 raw occurrences** (`regexSecondaryFee` ×1 at line 115, `regexGroupWeight` ×1 at line 418) — confirmed via direct code trace, not a live scan; implementer must still run `node scripts/nomenclature-audit.js --warn` to report the exact live total (this planner has no Bash access to do so).

---

## 6. Proposed `tools/nomenclature-registry.json` edits (exact)

### 6.1 New `rename_forbidden` entry — `statSalz*`

```json
"statSalz*": {
  "coupling_type": "live_wiring",
  "reason": "DOM id family for the 5 NEXUZ→SALEZ pane KPI stat elements (Active SKU Alias Nodez / Orders 30D / Actual Net 30D / Revenue Ingestion 30D / Sync Layer Integrity), written exclusively via the shared setStat(id, val) helper (assets/js/neogleamz-engine.js:611-618), which calls document.getElementById(id) on a BARE VARIABLE — architecturally invisible to N1 (classifyLookupArg's dynamic-unresolvable branch, not scanned) regardless of registry state, and confirmed to have zero localStorage/sessionStorage/Supabase write anywhere in setStat()'s body (only .innerText + a transient CSS pulse class). 'Salz' is a distinct 4-letter legacy variant from 'Salez' per this file's own legacy_term_watchlist note (tracked separately, do not merge). This entry documents the 5 stat ids themselves — the containing function name (syncSalezStats) was already documented in legacy_function_aliases, but debt/nomenclature-remediation Batch 7's explore-mapper found no coverage for the ids as a distinct concern. Added in Batch 8.",
  "evidence": ["assets/js/neogleamz-engine.js:1065 (statSalzMap)", "assets/js/neogleamz-engine.js:1087 (statSalzOrd30)", "assets/js/neogleamz-engine.js:1088 (statSalzNet30)", "assets/js/neogleamz-engine.js:1089 (statSalz30d)", "assets/js/neogleamz-engine.js:1090 (statSalzHealth)", "index.html:2824-2828 (five <strong id=...> producers inside paneNexlSalez)"]
}
```

### 6.2 New `rename_forbidden` entry — `btnSalezImport*`

```json
"btnSalezImport*": {
  "coupling_type": "live_wiring",
  "reason": "Real, live NEXUZ→SALEZ CSV-import button pair ('📦 IMPORT SALEZ CSV' / '🧪 INGEST TEST FILE'), wired via window.executeWithButtonAction(btnIdOrElement, ...) (index.html:4630-4631) whose first argument, when a string, is passed to a BARE-VARIABLE document.getElementById(btnIdOrElement) — architecturally invisible to N1 regardless of registry state. Both ids ARE confirmed real DOM producers (verified via direct grep of index.html) — a prior explore-mapper pass in debt/nomenclature-remediation Batch 8's origin task could not confirm this and flagged it as an open question; this entry resolves that. Documented to close the N4 legacy-term registry gap for the button ids themselves. Renaming either id requires a synchronized, atomic edit of both the HTML id= attribute and the matching string-literal argument to executeWithButtonAction in system-event-delegator.js — same risk class as the FM-5 delegator-token coupling documented elsewhere in this file.",
  "evidence": ["index.html:2946 (btnSalezImport producer)", "index.html:2951 (btnSalezImportTest producer)", "assets/js/system-event-delegator.js:1781 (executeWithButtonAction('btnSalezImport', ...))", "assets/js/system-event-delegator.js:1784 (executeWithButtonAction('btnSalezImportTest', ...))"]
}
```

### 6.3 New `rename_forbidden` entry — `active*Pane`

```json
"active*Pane": {
  "coupling_type": "session_persistence",
  "reason": "sessionStorage key family remembering each hub tab's last-viewed sub-pane across a browser session (activeInvPane / activeProdPane / activeSalezPane / activeNexlPane / activeFulfillzPane, plus the sibling top-level activeTab key). Each key is set/read/removed as a literal string inside switchTab()/show*Pane() (index.html, ~4514-5031); renaming any one key would silently reset that hub's remembered sub-pane back to its 'hub' default for the remainder of the affected user's current session. Lower severity than the localStorage rename_forbidden family (sessionStorage clears on tab close) but real and reproducible within a session. Uses a DISTINCT coupling_type ('session_persistence', not 'persistence') so nomenclature-audit.js's N5 check — which filters strictly on coupling_type === 'persistence' and only inspects localStorage.* calls — does NOT pick this up; N5 does not apply to sessionStorage at all, this entry is pure N4/human documentation. Only activeProdPane/activeSalezPane/activeNexlPane embed a legacy_term_watchlist substring (Prod/Salez/Nexl respectively); activeTab/activeInvPane/activeFulfillzPane are listed for completeness of the shared mechanism, not because they trip N4.",
  "evidence": ["index.html:4514 (activeTab removeItem)", "index.html:4515 (activeInvPane removeItem)", "index.html:4516 (activeProdPane removeItem)", "index.html:4517 (activeSalezPane removeItem)", "index.html:4518 (activeNexlPane removeItem)", "index.html:4935 (activeTab setItem)", "index.html:4963 (activeInvPane setItem)", "index.html:4979 (activeSalezPane setItem)", "index.html:4994 (activeProdPane setItem)", "index.html:5010 (activeFulfillzPane setItem)", "index.html:5031 (activeNexlPane setItem)"]
}
```

### 6.4 Citation corrections (6 fields, exact before → after; zero semantic change, pure evidence-line fixes per §4)

1. `legacy_function_aliases.showSalezPane.lines`: `[5190]` → `[4978]`
2. `legacy_function_aliases.showNexlPane.lines`: `[5243]` → `[5030]`
3. `legacy_token_aliases.click_switchTab_nexl.emitter_line`: `1931` → `1782`
4. `hubs.REVENUEZ.panes.paneSalezBridge.note`: `"Selected via runtime string concatenation index.html:5196 — see dynamic_id_allowlist 'paneSalez*'."` → `"Selected via runtime string concatenation index.html:4984 — see dynamic_id_allowlist 'paneSalez*'."`
5. `hubs.MAKERZ.panes.paneProdBuilder.note`: `"Selected via static lookup object index.html:5211 (literal-matchable, not concatenation)."` → `"Selected via static lookup object index.html:4999 (literal-matchable, not concatenation)."`
6. `hubs.NEXUZ.panes.paneNexlImportz.note`: `"Selected via static lookup object index.html:5249 (literal-matchable, not concatenation)."` → `"Selected via static lookup object index.html:5036 (literal-matchable, not concatenation)."`
7. `dynamic_id_allowlist[pattern="paneSalez*"].evidence`: `"index.html:5196 — 'paneSalez' + paneId.charAt(0).toUpperCase() + paneId.slice(1)"` → `"index.html:4984 — 'paneSalez' + paneId.charAt(0).toUpperCase() + paneId.slice(1)"`
8. `dynamic_id_allowlist[pattern="paneSalez*"].note`: replace `"...static lookup objects (index.html:5211, 5232, 5249)..."` → `"...static lookup objects (index.html:4999, 5019, 5036)..."`
9. (Also add `hubs.NEXUZ.panes.paneNexlSalez.embedded_legacy_terms`: `["Nexl"]` → `["Nexl", "Salez"]` — completeness fix noted in §2.3, zero scanner effect.)

### 6.5 Family-pattern edit for the N1 bonus fix

Existing (`dynamic_id_allowlist`, the first `"regex(OrderNum|...)"` entry, ~json-line 224-229) — before:
```json
"pattern": "regex(OrderNum|OrderDate|OrderTotal|LineItemNum|ItemName|Quantity|UnitPrice|Specs|ParcelNum|ActualPaid|ChargeableWeight|FeeStructure|DeductionStructure|ParcelLineItemNum|ParcelItemName|ParcelQuantity|ParcelSpecs)",
```
After:
```json
"pattern": "regex(OrderNum|OrderDate|OrderTotal|LineItemNum|ItemName|Quantity|UnitPrice|Specs|ParcelNum|ActualPaid|ChargeableWeight|FeeStructure|DeductionStructure|ParcelLineItemNum|ParcelItemName|ParcelQuantity|ParcelSpecs|SecondaryFee|GroupWeight)",
```
And update that entry's `note`: change the opening `"Family entry covering 17 verified-real field ids..."` to `"Family entry covering 19 verified-real field ids..."`, and replace the clause `"...Deliberately EXCLUDES regexPostage/regexMakeup/btnDeleteParcelPreset/btnOverwriteParcelPreset (...) and regexSecondaryFee/regexGroupWeight (real producers, but currently zero getElementById lookups exist for them anywhere, so no finding exists to allowlist — would need a fresh entry only if a future lookup is added) and the 4 readonly-type fields..."` with: `"...Deliberately EXCLUDES regexPostage/regexMakeup/btnDeleteParcelPreset/btnOverwriteParcelPreset (ghost ids — already fixed to read the correct existing ids per docs/plans/fix-regex-playground-preset-bugs.md, so these 4 no longer appear as getElementById targets at all) and the 4 readonly-type fields... regexSecondaryFee and regexGroupWeight were added to this family in debt/nomenclature-remediation Batch 8, after fix/regex-playground-preset-bugs gave both fields their first-ever getElementById consumer (system-tools-module.js:115 and :418) — until that fix landed, neither had a live lookup to allowlist."`

Also append to `evidence`: `"assets/js/system-tools-module.js:115 (regexSecondaryFee consumer, post-fix)", "assets/js/system-tools-module.js:418 (regexGroupWeight consumer, post-fix)"`.

**After all edits, regenerate `docs/nomenclature_dictionary.md` via `node scripts/generate-nomenclature-dictionary.js`** (do not hand-edit) — standard precedent, clears `N7_DICT_STALE`. Confirmed via reading `scripts/generate-nomenclature-dictionary.js`'s `buildRenameForbiddenTable()` (used for all `rename_forbidden` entries, including the 3 new ones in §6.1-6.3) that it renders generically off `pattern`/`coupling_type`/`reason`/`evidence` regardless of `coupling_type` value — **no generator-script change is required** to support the new `"live_wiring"`/`"session_persistence"` coupling_type values; they'll render into the dictionary's "Rename-Forbidden Identifiers" table exactly like the existing `"persistence"`/`"db_enum"` entries.

**Confirmed safe against accidental scanner interaction:** `nomenclature-audit.js`'s `persistenceForbiddenCompiled` (feeds `checkN5`) filters `rename_forbidden` entries via `v.coupling_type === 'persistence'` — an exact string match. `"live_wiring"` and `"session_persistence"` are both excluded by construction; these 3 new entries will never be compiled into any scanner-consumed pattern list. They are pure human documentation, exactly like the existing `legacy_function_aliases`/`legacy_token_aliases`/`hubs.*.panes` entries already are for N4 purposes (§1).

---

## 7. Explicitly NOT done this batch

- **No rename of any of the 61 already-documented identifiers** (`paneSalez*`, `paneNexl*`, `paneProd*`, `showSalezPane`, `showNexlPane`, `syncSalezStats`, their related tokens) — consistent with this epic's D2 "document, don't rename" precedent across Batches 2-7.
- **No rename of `statSalz*`/`btnSalezImport*`/`active*Pane`** — documented instead (§6.1-6.3), same reasoning; all three are live, wired, internal-only, and a rename buys nothing but risk.
- **No action on `nexlHubLanding`** (§2.7) — not one of the 84, currently scanner-invisible, low urgency; optional future micro-cleanup only.
- **No action on the `ccMobileBridgeStatus`/`cc*` cluster** (§2.8) — explicitly out of scope, already tracked elsewhere across Batches 4-7.
- **No repo-wide registry citation audit** (§4) — only the 6 fields directly adjacent to this batch's own new work are corrected; the broader drift is flagged for a dedicated future task.
- **No scanner-code change to `scripts/nomenclature-audit.js`** — adding an N4 suppression mechanism is explicitly out of scope for a nomenclature-remediation content batch (§1).

---

## 8. Security / XSS

Zero `innerHTML`/`insertAdjacentHTML`/`outerHTML`/`document.write` code is touched anywhere in this batch. Every edit is either (a) a JSON registry addition/correction, or (b) a regenerated Markdown dictionary. The one JS file read in depth for verification (`system-tools-module.js`, `neogleamz-engine.js`, `index.html`) is **read-only** for this batch — no lines in any of them are edited. `node scripts/xss-audit.js` expected: **0 violations before and after** (no-op confirmation, same as Batch 5-7 precedent for registry-only work).

**RLS implications:** none. No Supabase table/column/policy is read, written, or referenced anywhere in this batch's evidence trail (`setStat()`, `executeWithButtonAction()`, and the sessionStorage keys are all 100% client-side).

**Print-window DOMPurify:** not applicable — no print-window `document.write` path exists in any file touched or read by this batch.

## 9. Vanilla JS / framework constraints

Not applicable in the usual sense — no JS logic is added, removed, or modified this batch. The one JS-adjacent change (§6.5's regex-pattern-string edit) is a JSON string value inside `tools/nomenclature-registry.json`, not executable JavaScript. No `var`, no framework, no Web Bluetooth surface touched anywhere.

## 10. 4-state UX / UI mutex / zero-refresh

Not applicable — this batch changes zero user-facing UI, zero DB-mutation buttons, and zero render functions. No `window.executeWithButtonAction` wiring is added/removed/altered (the existing `btnSalezImport`/`btnSalezImportTest` wiring is documented, not touched). No render function needs re-invocation because none is edited.

## 11. Schema / Master Reference / Topological integrity

No Supabase table/column/RLS change anywhere in this batch — `tools/SK8Lytz_App_Master_Reference.md`'s `## Database Schemas` section requires no update. **No button, modal, or UI element is created, deleted, or moved** — every action this batch is either (a) already-existing live UI being documented in a metadata file, or (b) a JSON evidence-citation correction. The Mermaid Architectural Blueprint topological-integrity rule does not apply.

---

## 12. Expected scanner deltas (realistic, per §1's finding)

| Rule | Before (this plan's best estimate) | After | Confidence | Why |
|---|---|---|---|---|
| **`N4_LEGACY_TERM`** | 84 | **84 — unchanged** | **High (by design, per §1)** | `checkN4` has zero registry consultation; no scanned-file text is renamed/deleted this batch. Do not expect or require this number to drop. |
| **`N1_GHOST_ID`** | unknown exact live total (no Bash access to confirm; known to include ≥2 findings for `regexSecondaryFee`/`regexGroupWeight` per `fix/regex-playground-preset-bugs`'s own Execution Addendum) | **−2 from whatever the live pre-batch number is** | Medium-High — confirmed via direct code trace (§5), not a live scan; implementer must run the scanner to report the exact before/after pair |
| `N7_DICT_STALE` | 0 | 0 → possibly 1 mid-edit → 0 after regen | High — regenerate in the same commit as the registry edits |
| `N2_ORPHAN_HANDLER` | unaffected | unchanged | High — zero delegator-file edits |
| `N3_LABEL_DRIFT` | unaffected | unchanged | High — zero pane-label edits |
| `N5_NEW_NONCONFORMANT_KEY` | unaffected | unchanged | High — confirmed the 3 new `rename_forbidden` entries use `coupling_type` values that are excluded from N5's `persistence`-filter by construction (§6) |
| `N6_UNUSED_CSS` | unaffected | unchanged | High — zero CSS touched |

**Do not judge this batch's success by "N4_LEGACY_TERM went down."** It is mathematically guaranteed to stay at 84 (or whatever the live pre-batch number actually is) because the scanner has no mechanism to react to registry documentation. Success for this batch = (1) all 84 findings correctly triaged with cited evidence (§3), (2) 21 genuine registry gaps closed with real, quotable entries (§6.1-6.3), (3) 6 stale evidence citations corrected (§6.4), (4) the one genuinely fixable N1 side-effect closed (§6.5).

---

## 13. Verification checklist

1. `npx eslint .` → 0 new errors/warnings (no JS file is edited this batch).
2. `npm test` → same pass count as pre-batch (no JS file is edited this batch; confirm no test references `tools/nomenclature-registry.json` structurally in a way this batch's new keys would break — grep `tests/` for `nomenclature-registry` first).
3. `node scripts/xss-audit.js` → 0 violations before and after.
4. `node scripts/nomenclature-audit.js --warn` (run twice — before touching the registry, and after):
   - Confirm `N4_LEGACY_TERM` raw count is **identical** before/after (per §12 — if it changes at all, something unexpected happened; investigate before committing).
   - Confirm `N1_GHOST_ID` drops by exactly 2, isolated to the `regexSecondaryFee`/`regexGroupWeight` fingerprints disappearing — report the actual before/after totals in the commit/PR description (do not force them to match any number in this plan; this planner had no Bash access to pre-confirm).
   - Confirm `N7_DICT_STALE` is 0 after `node scripts/generate-nomenclature-dictionary.js` is re-run.
5. Validate `tools/nomenclature-registry.json` is syntactically valid JSON after all edits (`node -e "JSON.parse(require('fs').readFileSync('tools/nomenclature-registry.json','utf8'))"` or equivalent) — 3 new object entries + 9 field-level string edits is enough surface area for a stray comma/quote slip.
6. Diff-review `docs/nomenclature_dictionary.md` — confirm the 3 new `rename_forbidden` rows render correctly in the "Rename-Forbidden Identifiers" table and the citation corrections (§6.4) are reflected wherever those fields are surfaced in the dictionary output.
7. No manual browser/UI testing guide is required — this batch changes zero application code and zero user-facing behavior.

## 14. Risks (ranked)

1. **Lowest risk — everything in this batch is JSON metadata + a regenerated Markdown file.** Zero application code (`index.html`, any `assets/js/*.js`) is edited. Zero UI/DB/XSS surface touched.
2. **Low risk — the 3 new `coupling_type` values (`"live_wiring"`, `"session_persistence"`) are new strings not previously used anywhere in the registry.** Confirmed (§6) they're excluded from every scanner-side filter by construction (`checkN5`'s exact-string `'persistence'` match; `dynamic_id_allowlist` is a separate array these entries never touch) — but double-check after the edit that no other script/test does a blanket `Object.values(rename_forbidden)` scan expecting only `"persistence"`/`"db_enum"` values (grep `tests/` and `scripts/` for `coupling_type` first, quick confirmation).
3. **Low risk — JSON syntax validity** across 3 new nested objects + 9 string-field edits in one file; mitigated by verification step §13.5.
4. **Medium risk — the citation corrections (§6.4) touch fields also read by the dictionary generator.** Confirmed `buildRenameForbiddenTable`/hub-pane-directory builders render generically off whatever string is present — a typo in a corrected line number would silently propagate into the regenerated dictionary rather than crash. Mitigate via careful `git diff` review (§13.6).
5. **Zero implementation risk from the `N4_LEGACY_TERM` non-reduction** (§1, §12) — this is an accurate, predicted, by-design outcome, not a bug — but it IS a real communication risk if the batch is presented/reviewed without this framing. Lead with §1 in any summary of this batch's results.

---

## Files Touched

- `tools/nomenclature-registry.json` — add 3 new `rename_forbidden` entries (§6.1 `statSalz*`, §6.2 `btnSalezImport*`, §6.3 `active*Pane`); correct 6 stale `index.html` line citations + 1 `embedded_legacy_terms` completeness fix (§6.4); append `SecondaryFee`/`GroupWeight` to the existing regex family pattern + update its `note`/`evidence` (§6.5).
- `docs/nomenclature_dictionary.md` — regenerated via `node scripts/generate-nomenclature-dictionary.js` (not hand-edited), reflecting all of the above.

**Not touched (confirmed):** `index.html`, every `assets/js/*.js` file (all read-only this batch, zero edits — including `system-tools-module.js`, whose only code change was already shipped by the separate `fix/regex-playground-preset-bugs` branch prior to this batch), `scripts/nomenclature-audit.js` (no scanner-code change — adding N4 suppression is explicitly out of scope, §1/§7), `scripts/nomenclature-baseline.json` (deliberately deferred, same standing precedent as Batches 1-7), `eslint.config.mjs` (no JS identifier renamed), `tools/SK8Lytz_App_Master_Reference.md` (no schema/RLS/UI-topology change), `tools/SK8Lytz_Bucket_List.md` (ledger-exemption rule — syncs at `/wind-down`).

## Suggested commit message(s)

Single commit (registry + regenerated dictionary are one logical, reviewable unit; matches Batch 7's precedent for its own registry-only commit):

```
chore(nomenclature): Batch 8 — document 21 N4 registry gaps, correct 6 stale
evidence citations, allowlist SecondaryFee/GroupWeight for N1

- Re-derived all 84 N4_LEGACY_TERM findings from scratch (independent
  cross-check: 35 Salez + 24 Nexl + 10 Salz + 8 Bridge + 7 Prod = 84,
  exact match). Confirmed checkN4 has zero registry-suppression
  mechanism (unlike N1's dynamic_id_allowlist) — this commit documents,
  it does not and cannot reduce the N4 raw count.
- Added 3 new rename_forbidden entries: statSalz* (5 KPI stat ids,
  zero persistence, confirmed via setStat()'s bare-variable
  getElementById), btnSalezImport* (2 real, confirmed-live import
  buttons the prior explore-mapper pass incorrectly could not verify),
  active*Pane (6-key sessionStorage family, new "session_persistence"
  coupling_type, confirmed excluded from N5's exact-match filter).
- Corrected 6 stale index.html line citations drifted since the
  registry's 2026-07-17 ratification (showSalezPane, showNexlPane,
  click_switchTab_nexl, paneSalezBridge/paneProdBuilder/paneNexlImportz
  notes) — non-uniform offsets (149/212/213 lines), confirmed
  individually, not a blanket patch. Broader repo-wide citation drift
  flagged for a dedicated future task.
- Appended SecondaryFee/GroupWeight to the Regex Playground family
  pattern: fix/regex-playground-preset-bugs gave both fields their
  first-ever getElementById consumer, surfacing 2 new N1_GHOST_ID
  false positives per that branch's own Execution Addendum. Fixes
  that follow-up.
- Regenerated docs/nomenclature_dictionary.md.

Refs: debt/nomenclature-remediation Batch 8. Explicitly out of scope:
ccMobileBridgeStatus/cc* cluster (Batches 4-7), nexlHubLanding (not
one of the 84 — case-sensitive watchlist miss, separate finding),
any rename of a documented-alias identifier (D2 precedent).
```
