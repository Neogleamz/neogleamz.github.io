#!/usr/bin/env node
/**
 * generate-nomenclature-dictionary.js — Regenerates docs/nomenclature_dictionary.md
 * from the single machine-readable naming authority, tools/nomenclature-registry.json.
 *
 * Per ADR decision D1 (docs/architecture/nomenclature-audit-engine.md), the dictionary
 * is generated output — never hand-edit docs/nomenclature_dictionary.md directly.
 *
 * Deliberately deterministic: derives its "as of" date from meta.ratified_date in the
 * registry, never from Date.now()/new Date(), so re-running with no data change produces
 * byte-identical output (no meaningless git-diff churn on regeneration).
 *
 * Usage:
 *   node scripts/generate-nomenclature-dictionary.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'tools', 'nomenclature-registry.json');
const OUTPUT_PATH = path.join(ROOT, 'docs', 'nomenclature_dictionary.md');

// ── Small markdown helpers ─────────────────────────────────────────────────────

function code(value) {
  return '`' + value + '`';
}

function joinCells(values, sep) {
  return values.join(sep);
}

function tableRow(cells) {
  return '| ' + cells.join(' | ') + ' |';
}

function buildTable(headers, rows) {
  const lines = [];
  lines.push(tableRow(headers));
  lines.push(tableRow(headers.map(() => '---')));
  rows.forEach((row) => {
    lines.push(tableRow(row));
  });
  return lines.join('\n');
}

// ── Section builders ────────────────────────────────────────────────────────────

function buildHeaderSection(meta) {
  const lines = [];
  lines.push('# Canonical Nomenclature Dictionary');
  lines.push('> Generated from tools/nomenclature-registry.json — do not hand-edit.');
  lines.push('> Regenerate: node scripts/generate-nomenclature-dictionary.js');
  lines.push('> Machine authority: tools/nomenclature-registry.json (ratified ' + meta.ratified_date + ')');
  return lines.join('\n');
}

function buildHubPaneDirectory(hubs) {
  const headers = ['Hub', 'Tab Content DOM ID', 'Tab Button Token', 'Panes (canonical label → dom id)', 'Modules'];
  const rows = [];

  Object.keys(hubs).forEach((hubName) => {
    const hub = hubs[hubName];
    const hubLabel = hub.emoji + ' ' + hubName;
    const domId = code(hub.tab_content_dom_id);
    const token = code(hub.tab_button_token);
    const paneCells = Object.keys(hub.panes).map((paneId) => {
      const pane = hub.panes[paneId];
      return pane.canonical_label + ' → ' + code(paneId);
    });
    const panesCell = joinCells(paneCells, '<br>');
    const modulesCell = joinCells(hub.modules.map(code), '<br>');
    rows.push([hubLabel, domId, token, panesCell, modulesCell]);
  });

  const lines = [];
  lines.push('## Hub & Pane Directory');
  lines.push('');
  lines.push(buildTable(headers, rows));
  return lines.join('\n');
}

function buildLegacyAliasLog(registry) {
  const headers = ['Identifier', 'Canonical Label', 'Embedded Legacy Term(s)', 'Note'];
  const rows = [];

  // Source 1: hubs.*.panes.*
  Object.keys(registry.hubs).forEach((hubName) => {
    const hub = registry.hubs[hubName];
    Object.keys(hub.panes).forEach((paneId) => {
      const pane = hub.panes[paneId];
      if (pane.rename_status === 'documented-alias-do-not-rename') {
        rows.push([
          code(paneId),
          pane.canonical_label,
          joinCells(pane.embedded_legacy_terms, ', '),
          pane.note || ''
        ]);
      }
    });
  });

  // Source 2: legacy_function_aliases
  Object.keys(registry.legacy_function_aliases).forEach((fnName) => {
    const entry = registry.legacy_function_aliases[fnName];
    if (entry.rename_status === 'documented-alias-do-not-rename') {
      rows.push([
        code(fnName + '()'),
        '—',
        joinCells(entry.embedded_legacy_terms, ', '),
        entry.note || ''
      ]);
    }
  });

  // Source 3: legacy_token_aliases
  Object.keys(registry.legacy_token_aliases).forEach((tokenName) => {
    const entry = registry.legacy_token_aliases[tokenName];
    if (entry.rename_status === 'documented-alias-do-not-rename') {
      rows.push([
        code(tokenName),
        '—',
        joinCells(entry.embedded_legacy_terms, ', '),
        entry.note || entry.risk || ''
      ]);
    }
  });

  const lines = [];
  lines.push('## Legacy Alias Log (L2/L3 — document, don\'t rename; ADR decision D2)');
  lines.push('');
  lines.push(buildTable(headers, rows));
  return lines.join('\n');
}

function buildRenameForbiddenTable(renameForbidden) {
  const headers = ['Pattern', 'Coupling Type', 'Reason', 'Evidence'];
  const rows = Object.keys(renameForbidden).map((pattern) => {
    const entry = renameForbidden[pattern];
    const evidenceCell = joinCells(entry.evidence.map(code), '<br>');
    return [code(pattern), entry.coupling_type, entry.reason, evidenceCell];
  });

  const lines = [];
  lines.push('## Rename-Forbidden Identifiers (ADR decision D3)');
  lines.push('');
  lines.push(buildTable(headers, rows));
  return lines.join('\n');
}

function buildDynamicIdAllowlistTable(allowlist) {
  const headers = ['Pattern', 'Resolution Type', 'Note'];
  const rows = allowlist.map((entry) => {
    let note = entry.note || '';
    if (!note) {
      const evidenceText = 'Evidence: ' + entry.evidence;
      note = entry.cross_ref ? evidenceText + ' — see ' + entry.cross_ref : evidenceText;
    }
    return [code(entry.pattern), entry.resolution_type, note];
  });

  const lines = [];
  lines.push('## Dynamic ID Allowlist Patterns (ADR decision D5, feeds Phase 2 N1)');
  lines.push('');
  lines.push(buildTable(headers, rows));
  return lines.join('\n');
}

function buildLocalStoragePolicy(policy) {
  const lines = [];
  lines.push('## localStorage Key Policy (ADR decisions D3/D8)');
  lines.push('');
  lines.push('**Existing keys:** ' + policy.existing_keys);
  lines.push('');
  lines.push('**New keys:** ' + policy.new_keys);
  lines.push('');
  lines.push('**Observed legacy prefix families:**');
  policy.observed_legacy_prefix_families.forEach((family) => {
    lines.push('- ' + family);
  });
  return lines.join('\n');
}

function buildLegacyTermWatchlist(watchlist) {
  const headers = ['Term', 'Match Scope', 'False-Positive Risk', 'Note'];
  const rows = watchlist.map((entry) => {
    return [code(entry.term), entry.match_scope, entry.false_positive_risk, entry.note || ''];
  });

  const lines = [];
  lines.push('## Legacy Term Watchlist (Phase 2 N4 input)');
  lines.push('');
  lines.push(buildTable(headers, rows));
  return lines.join('\n');
}

function buildKnownDiscrepancies(discrepancies) {
  const titleFor = (key) => {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const lines = [];
  lines.push('## Known Discrepancies / Forward Notes');
  lines.push('');
  Object.keys(discrepancies).forEach((key, idx) => {
    if (idx > 0) {
      lines.push('');
    }
    lines.push('**' + titleFor(key) + ':** ' + discrepancies[key]);
  });
  return lines.join('\n');
}

function buildFooter() {
  const lines = [];
  lines.push('---');
  lines.push('For the full architectural Mermaid topology (modals, buttons, shared components), see');
  lines.push('tools/SK8Lytz_App_Master_Reference.md §0 "Architectural Hierarchy Blueprint (IMMUTABLE)"');
  lines.push('— the single canonical location per CLAUDE.md\'s Topological Integrity rule. Not duplicated');
  lines.push('here; the prior hand-copied duplicate in this file had already drifted from the original');
  lines.push('(see docs/plans/feat-nomenclature-registry-1.md §0.5) and is removed as part of this');
  lines.push('regeneration rather than perpetuated.');
  return lines.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

function buildOutput(registry) {
  const sections = [
    buildHeaderSection(registry.meta),
    buildHubPaneDirectory(registry.hubs),
    buildLegacyAliasLog(registry),
    buildRenameForbiddenTable(registry.rename_forbidden),
    buildDynamicIdAllowlistTable(registry.dynamic_id_allowlist),
    buildLocalStoragePolicy(registry.localstorage_policy),
    buildLegacyTermWatchlist(registry.legacy_term_watchlist),
    buildKnownDiscrepancies(registry.known_discrepancies),
    buildFooter()
  ];

  return sections.join('\n\n') + '\n';
}

function generate() {
  let raw;
  try {
    raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
  } catch (err) {
    throw new Error('Cannot read ' + path.relative(ROOT, REGISTRY_PATH) + ': ' + err.message);
  }

  let registry;
  try {
    registry = JSON.parse(raw);
  } catch (err) {
    throw new Error('Invalid JSON in ' + path.relative(ROOT, REGISTRY_PATH) + ': ' + err.message);
  }

  const output = buildOutput(registry);
  fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
  return OUTPUT_PATH;
}

if (require.main === module) {
  try {
    const outPath = generate();
    console.log('Generated ' + path.relative(ROOT, outPath));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { generate, buildOutput };
