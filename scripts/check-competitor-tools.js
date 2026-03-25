#!/usr/bin/env node
/**
 * CI/local check: prohibited contact-center competitors must not appear in APPHUB metadata.
 *
 * Policy (see AGENTS.md / CONTRIBUTING.md): no Genesys, NICE, Five9, or Talkdesk as primary targets.
 *
 * Matching rules:
 * - genesys, five9, talkdesk: case-insensitive, whole-word (\b).
 * - NICE: case-sensitive \bNICE\b only (avoids false positives on English "nice").
 * - cxone: case-insensitive substring (common NICE product name when "NICE" is omitted).
 *
 * Exit codes: 0 = ok, 1 = competitor violations (stderr: field lines), 2 = operational error
 * (missing APPHUB.yaml, bad YAML, usage, or module load failure).
 */

const path = require('path');

let loadApphub;
try {
  ({ loadApphub } = require('./lib/apphub-to-entries'));
} catch (e) {
  console.error(e.message || String(e));
  process.exit(2);
}

const FIELDS = ['title', 'description', 'tag_line', 'third_party_tool'];

/** @type {{ label: string; test: (s: string) => boolean }[]} */
const RULES = [
  {
    label: 'Genesys',
    test: (s) => /\bgenesys\b/i.test(s)
  },
  {
    label: 'Five9',
    test: (s) => /\bfive9\b/i.test(s)
  },
  {
    label: 'Talkdesk',
    test: (s) => /\btalkdesk\b/i.test(s)
  },
  {
    label: 'NICE (brand)',
    test: (s) => /\bNICE\b/.test(s)
  },
  {
    label: 'CXone',
    test: (s) => /cxone/i.test(s)
  }
];

function fieldText(apphub, key) {
  const v = apphub[key];
  if (v == null) return '';
  return typeof v === 'string' ? v : String(v);
}

function findViolations(apphub) {
  /** @type {string[]} */
  const messages = [];
  for (const field of FIELDS) {
    const text = fieldText(apphub, field);
    if (!text.trim()) continue;
    for (const rule of RULES) {
      if (rule.test(text)) {
        messages.push(`${field}: matched prohibited term (${rule.label})`);
      }
    }
  }
  return messages;
}

function main() {
  const playbookPath = process.argv[2];
  if (!playbookPath) {
    console.error('Usage: node scripts/check-competitor-tools.js <playbook-folder>');
    process.exit(2);
  }

  const resolved = path.resolve(process.cwd(), playbookPath);

  let apphub;
  try {
    apphub = loadApphub(resolved);
  } catch (e) {
    console.error(e.message || String(e));
    process.exit(2);
  }

  const violations = findViolations(apphub);
  if (violations.length > 0) {
    for (const line of violations) {
      console.error(line);
    }
    process.exit(1);
  }
  process.exit(0);
}

try {
  main();
} catch (err) {
  console.error(err.message || String(err));
  process.exit(2);
}
