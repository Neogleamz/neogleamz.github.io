# debt/nomenclature-remediation — Batch 2: N5 localStorage Registry Fix

## Scope

Batch 2 of the multi-batch ledger item `debt/nomenclature-remediation`. Targets the **N5_NEW_NONCONFORMANT_KEY** category (24 findings, 12 unique key names) from `node scripts/nomenclature-audit.js --warn`.

## This is a registry fix, not a code rename — and that distinction matters

Initial read of the ledger task ("new keys must use sk8lytz_ prefix") suggested renaming these 12 localStorage keys in code. **That would be wrong and actively harmful.** localStorage keys hold state persisted in every existing user's browser. Renaming `'theme'` → `'sk8lytz_theme'` in code doesn't migrate anyone's existing data — every returning user's browser still has the value under the old key name, so the app would silently reset their saved theme/panel-widths/collapse-states/sync-counters back to defaults on next load. This is exactly the risk `tools/nomenclature-registry.json`'s own `localstorage_policy` already codifies:

> `"existing_keys": "Frozen — rename-forbidden wholesale, no exceptions (D8)."`
> `"new_keys": "Must use the sk8lytz_ prefix ... new keys only, not retroactive."`

I checked git history (`git log -S"<key>"`) for all 12 keys — every one predates the sk8lytz_ prefix policy by 2-5 months (oldest: March 2026; newest: June 2026; today: 2026-07-17). None are recent/genuinely-new additions. So per the registry's own stated policy, **all 12 are legacy and exempt** — they just aren't individually enumerated. The registry already anticipated this gap: `localstorage_policy.observed_legacy_prefix_families` ends with *"~6 further hub-local state keys carrying no org prefix — already D8-conformant ... not enumerated here"* — but that field is human-readable documentation only. It has **zero effect on the scanner.**

## Why the scanner still flags them (root cause)

Traced `checkN5()` in `scripts/nomenclature-audit.js:420-431`: it only skips a key if it matches a `sk8lytz_` prefix OR matches an entry in `registry.rename_forbidden` where `coupling_type === "persistence"` (compiled at `scripts/nomenclature-audit.js:599-602`). The `localstorage_policy.observed_legacy_prefix_families` field is never read by the compiler — it's prose, not machine input. The 7 existing `persistence`-coupled `rename_forbidden` entries (`batchezSopSort_*`, `batchezSopExpanded_*`, `layerzSopExpanded_*`, `neoSelect_*`, `neoResizer_*`, `neogleamz_*`) don't cover any of these 12 key names, so they fall through to CRITICAL findings every scan.

**Fix:** add 12 new `persistence`-coupled entries to `registry.rename_forbidden`, matching the existing entries' structure (reason + evidence). This is the same mechanism already used for the other 7 legacy families — no new scanner logic needed.

## Verified key inventory (all 12 are exact static keys, no dynamic suffix)

Confirmed by reading every call site — none of these append a variable/id suffix (unlike e.g. `batchezSopSort_*`, which does), so each gets an exact-match registry entry (no trailing `*`):

| Key | First seen | File:line (get/set) |
|---|---|---|
| `theme` | pre-2026-03 | index.html:25, 4261, 4531 |
| `stockzLeftWidth` | 2026-03-21 | index.html:4554, 4599 |
| `stockzTopHeight` | 2026-03-19 | index.html:4644, 4683 |
| `NEOGLEAMZ_VER` | 2026-03-21 | index.html:4986, 4991 |
| `neo_user_email` | 2026-03-23 | index.html:6972 |
| `barcodzGroupState` | ≤2026-05-17 | assets/js/barcodz-module.js:126, 184 |
| `recipeGroupState` | ≤2026-05-17 | assets/js/bom-module.js:262, 283 |
| `fgiCategoryState` | ≤2026-05-17 | assets/js/inventory-module.js:27, 31 |
| `neoSnapshotLeftWidth` | ≤2026-05-17 | assets/js/inventory-module.js:872, 910 |
| `labelzGroupState` | 2026-06-05 | assets/js/labelz-module.js:215, 306 |
| `statImpzSyncs` | ≤2026-05-17 | assets/js/neogleamz-engine.js:1010 |
| `lastBrainSync` | ≤2026-05-17 | assets/js/neogleamz-engine.js:1096 |

## Implementation

Edit `tools/nomenclature-registry.json` — add 12 entries to `rename_forbidden`, each:
```json
"theme": {
  "coupling_type": "persistence",
  "reason": "Existing user-facing theme preference (light/dark), predates the sk8lytz_ prefix policy by several months. Renaming would silently reset every returning user's saved theme to default with no migration path.",
  "evidence": ["index.html:25", "index.html:4261", "index.html:4531"]
}
```
(...and 11 more, same shape, reasons tailored per key per the table above.)

No application code changes. No JS/HTML edits.

## Verification

1. `node scripts/nomenclature-audit.js --warn` — confirm N5_NEW_NONCONFORMANT_KEY drops from 24 → 0.
2. Confirm N1/N1_PREFIX/N3/N4/N6/N7 unchanged (this touches only the registry's `rename_forbidden` section, nothing that feeds those checks).
3. `node scripts/generate-nomenclature-dictionary.js` — regenerate `docs/nomenclature_dictionary.md` so the human-readable doc stays in sync with the registry (per the existing convention from Phase 1/2).
4. Also fold these 12 key names into `localstorage_policy.observed_legacy_prefix_families` (replacing the vague "~6 further ... not enumerated here" note) so the human-readable policy section matches the enforced one — avoids the same drift happening again.

## Security / XSS
None — JSON registry + generated-doc change only.

## 4-state UX / UI mutex / zero-refresh
Not applicable.
