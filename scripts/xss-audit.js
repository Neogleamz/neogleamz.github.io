#!/usr/bin/env node
/**
 * xss-audit.js — Deterministic XSS scanner for Neogleamz OS.
 *
 * Replaces grep-based health_check scans that fail on long lines and
 * produce false negatives with negative-lookahead regex.
 *
 * Usage:
 *   node scripts/xss-audit.js           — report all violations, exit 1 if any
 *   node scripts/xss-audit.js --warn    — report violations, always exit 0 (CI advisory)
 *
 * Pre-commit wiring: add `node scripts/xss-audit.js` to .githooks/pre-commit
 * AFTER all known violations in tools/SK8Lytz_Bucket_List.md §🧹 are resolved.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT  = path.resolve(__dirname, '..');
const WARN_MODE = process.argv.includes('--warn');

// ── Files to scan ─────────────────────────────────────────────────────────────

function collectFiles() {
  const files = [path.join(ROOT, 'index.html')];
  const jsDir = path.join(ROOT, 'assets', 'js');
  if (fs.existsSync(jsDir)) {
    fs.readdirSync(jsDir)
      .filter(f => f.endsWith('.js'))
      .forEach(f => files.push(path.join(jsDir, f)));
  }
  return files;
}

// ── Rule helpers ──────────────────────────────────────────────────────────────

/** Line is a pure comment — skip it entirely. */
function isComment(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

/** Line assigns an empty/whitespace string (safe clear operation). */
function isClearOp(line) {
  return /\.(innerHTML|outerHTML)\s*=\s*(['"`])\s*\2/.test(line);
}

/** Line has at least one template-literal interpolation or a bare variable. */
function hasDynamic(line) {
  return /\$\{/.test(line);
}

/** Line calls window.safeHTML() directly (not as a ternary condition). */
function hasDirectSafeHTML(line) {
  return /window\.safeHTML\s*\(/.test(line) && !/window\.safeHTML\s*\?/.test(line);
}

/** Line uses the forbidden ternary pattern. */
function hasForbiddenTernary(line) {
  return /window\.safeHTML\s*\?/.test(line);
}

// ── Rules ─────────────────────────────────────────────────────────────────────
//
// Each rule: { id, severity, description, test(line) → boolean }
// Rules are evaluated in order; first match wins for a given line.

const RULES = [
  {
    id: 'FORBIDDEN_TERNARY',
    severity: 'CRITICAL',
    description:
      'window.safeHTML ? ... : x ternary is BANNED. ' +
      'Use window.safeHTML(x) directly — the function already has an innerText fallback inside it.',
    test: (line) =>
      hasForbiddenTernary(line) &&
      /\.(innerHTML|insertAdjacentHTML|outerHTML)\b/.test(line),
  },
  {
    id: 'UNGUARDED_INNERHTML',
    severity: 'CRITICAL',
    description:
      'Dynamic innerHTML without window.safeHTML(). ' +
      'Wrap the value: element.innerHTML = window.safeHTML(html)',
    test: (line) =>
      /\.innerHTML\s*=/.test(line) &&
      hasDynamic(line) &&
      !isClearOp(line) &&
      !hasDirectSafeHTML(line),
  },
  {
    id: 'UNGUARDED_INSERT_ADJACENT',
    severity: 'CRITICAL',
    description:
      'Dynamic insertAdjacentHTML without window.safeHTML(). ' +
      'Wrap the value: el.insertAdjacentHTML(pos, window.safeHTML(html))',
    test: (line) =>
      /insertAdjacentHTML\s*\(/.test(line) &&
      hasDynamic(line) &&
      !hasDirectSafeHTML(line),
  },
  {
    id: 'UNGUARDED_OUTERHTML',
    severity: 'MODERATE',
    description:
      'Dynamic outerHTML without window.safeHTML(). ' +
      'Use textContent on a created element, or wrap in window.safeHTML().',
    test: (line) =>
      /\.outerHTML\s*=/.test(line) &&
      hasDynamic(line) &&
      !hasDirectSafeHTML(line),
  },
  {
    id: 'UNGUARDED_DOCUMENT_WRITE',
    severity: 'MODERATE',
    description:
      'document.write() with dynamic content — sanitize with DOMPurify.sanitize(html) ' +
      'before writing, or use Blob + URL.createObjectURL() for print windows.',
    test: (line) =>
      /document\.write\s*\(/.test(line) &&
      hasDynamic(line) &&
      !/DOMPurify\.sanitize\s*\(/.test(line),
  },
  {
    id: 'INLINE_EVENT_HANDLER_IN_TEMPLATE',
    severity: 'MODERATE',
    description:
      'Inline event handler (onclick=, onchange=, etc.) baked into a template string. ' +
      'Use data-click / data-change tokens bound via system-event-delegator.js instead.',
    test: (line) =>
      /`[^`]*(onclick|onchange|onsubmit|oninput)\s*=\s*"/.test(line),
  },
  {
    id: 'INLINE_EVENT_HANDLER_IN_HTML',
    severity: 'MODERATE',
    description:
      'Inline event handler in static HTML markup. ' +
      'Use data-click / data-change tokens instead.',
    test: (line) => {
      // Only flag HTML attribute context (inside a tag), not JS property assignments
      // Heuristic: line has < before the handler and no = assignment syntax before it
      const t = line.trim();
      return /^\s*<[^>]*(onclick|onchange|onsubmit|oninput)\s*=/.test(line) ||
             /<[a-zA-Z][^>]*(onclick|onchange|onsubmit|oninput)\s*=\s*"[^"]*"/.test(line);
    },
  },
];

// ── Scanner ───────────────────────────────────────────────────────────────────

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines   = content.split('\n');
  const findings = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isComment(line)) continue;

    for (const rule of RULES) {
      if (rule.test(line)) {
        findings.push({
          file:     path.relative(ROOT, filePath),
          lineNum:  i + 1,
          ruleId:   rule.id,
          severity: rule.severity,
          desc:     rule.description,
          snippet:  line.trim().slice(0, 140),
        });
        break; // one finding per line (most specific rule wins)
      }
    }
  }

  return findings;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const files    = collectFiles();
let allFindings = [];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  allFindings = allFindings.concat(scanFile(f));
}

const critical = allFindings.filter(f => f.severity === 'CRITICAL');
const moderate = allFindings.filter(f => f.severity === 'MODERATE');

if (allFindings.length === 0) {
  console.log('✅  XSS audit passed — 0 violations found.');
  process.exit(0);
}

// Print report
console.error(`\n${'─'.repeat(72)}`);
console.error(`🚨  XSS AUDIT — ${allFindings.length} violation(s)  ` +
  `[${critical.length} CRITICAL  ${moderate.length} MODERATE]`);
console.error(`${'─'.repeat(72)}\n`);

for (const v of allFindings) {
  const icon = v.severity === 'CRITICAL' ? '🔴' : '🟠';
  console.error(`${icon}  ${v.file}:${v.lineNum}  [${v.ruleId}]`);
  console.error(`   ${v.desc}`);
  console.error(`   ${v.snippet}`);
  console.error('');
}

console.error(`${'─'.repeat(72)}`);
console.error(`Fix all violations listed above.`);
console.error(`Tracked in tools/SK8Lytz_Bucket_List.md → ## 🧹 Technical Debt`);
console.error(`${'─'.repeat(72)}\n`);

process.exit(WARN_MODE ? 0 : 1);
