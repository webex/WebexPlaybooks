#!/usr/bin/env node
/**
 * Publish every playbook under playbooks/ that has APPHUB.yaml to Contentstack
 * production (optional: integration too). Intended for local catch-up after CI
 * failures (e.g. CMA 429). Run from repo root with an up-to-date main checkout.
 *
 * Requires: CONTENTSTACK_MANAGEMENT_TOKEN, CMS_API_KEY (or .env at repo root)
 *
 * Usage:
 *   node scripts/bulk-publish-playbooks-production.js [--dry-run] [options]
 *
 * Options:
 *   --dry-run                 List playbooks only; no CMA calls
 *   --include-integration     Also publish to integration (default: production only)
 *   --promote-only            Pass through to publish-playbook.js (publish without update)
 *   --require-main            Exit with error if current git branch is not main
 *   --playbook=<slug>         Only playbooks/<slug> (kebab-case folder name)
 *   --delay-ms=<n>           Pause after each successful publish (default: 4000)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

function loadEnvFromDotEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) {
      const val = m[2].replace(/^['"]|['"]$/g, '').trim();
      process.env[m[1]] = val;
    }
  }
}

function parseArgs(argv) {
  const out = {
    dryRun: false,
    includeIntegration: false,
    promoteOnly: false,
    requireMain: false,
    playbook: null,
    delayMs: 4000
  };
  for (const a of argv) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--include-integration') out.includeIntegration = true;
    else if (a === '--promote-only') out.promoteOnly = true;
    else if (a === '--require-main') out.requireMain = true;
    else if (a.startsWith('--playbook=')) out.playbook = a.slice('--playbook='.length).trim();
    else if (a.startsWith('--delay-ms=')) {
      const n = Number(a.slice('--delay-ms='.length), 10);
      if (!Number.isFinite(n) || n < 0) {
        console.error('Invalid --delay-ms');
        process.exit(1);
      }
      out.delayMs = n;
    }
  }
  return out;
}

function assertMainIfRequired(requireMain) {
  if (!requireMain) return;
  const { execSync } = require('node:child_process');
  let branch;
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..')
    }).trim();
  } catch {
    console.error('--require-main was set but git rev-parse failed.');
    process.exit(1);
  }
  if (branch !== 'main') {
    console.error(`--require-main: current branch is "${branch}", expected main.`);
    process.exit(1);
  }
}

function listPlaybookPaths(repoRoot, singleSlug) {
  const playbooksDir = path.join(repoRoot, 'playbooks');
  if (!fs.existsSync(playbooksDir)) {
    console.error(`No playbooks directory at ${playbooksDir}`);
    process.exit(1);
  }
  const names = fs
    .readdirSync(playbooksDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => {
      if (singleSlug && name !== singleSlug) return false;
      const apphub = path.join(playbooksDir, name, 'APPHUB.yaml');
      return fs.existsSync(apphub);
    })
    .sort();
  return names.map((n) => path.join('playbooks', n));
}

async function runPublishWithRetries(repoRoot, relPath, envCsv, promoteOnly) {
  const scriptPath = path.join(repoRoot, 'scripts', 'publish-playbook.js');
  const args = [scriptPath, relPath, '--env', envCsv];
  if (promoteOnly) args.push('--promote-only');

  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const r = spawnSync(process.execPath, args, {
      cwd: repoRoot,
      encoding: 'utf8',
      env: process.env
    });
    const combined = `${r.stdout || ''}${r.stderr || ''}`;
    if (combined) process.stdout.write(combined);
    if (r.status === 0) return { ok: true };

    const rateLimited = /429|rate limit exceeded/i.test(combined);
    if (rateLimited && attempt < maxAttempts) {
      const waitMs = Math.min(120_000, 5000 * 2 ** (attempt - 1));
      console.error(
        `\nRate limited (429). Waiting ${waitMs}ms before retry ${attempt + 1}/${maxAttempts}...\n`
      );
      await delay(waitMs);
      continue;
    }
    return { ok: false, status: r.status ?? 1 };
  }
  return { ok: false, status: 1 };
}

async function main() {
  loadEnvFromDotEnv();
  const opts = parseArgs(process.argv.slice(2));

  const token = (process.env.CONTENTSTACK_MANAGEMENT_TOKEN || '').trim();
  const apiKey = (process.env.CMS_API_KEY || '').trim();
  if (!opts.dryRun && (!token || !apiKey)) {
    console.error(
      'Set CONTENTSTACK_MANAGEMENT_TOKEN and CMS_API_KEY (or add them to .env at repo root).'
    );
    process.exit(1);
  }

  const repoRoot = path.join(__dirname, '..');
  assertMainIfRequired(opts.requireMain);

  const envCsv = opts.includeIntegration ? 'production,integration' : 'production';
  const playbooks = listPlaybookPaths(repoRoot, opts.playbook);

  if (playbooks.length === 0) {
    console.error('No matching playbooks with APPHUB.yaml.');
    process.exit(1);
  }

  console.log(
    `Found ${playbooks.length} playbook(s). Target env(s): ${envCsv}${opts.promoteOnly ? ' (--promote-only)' : ''}${opts.dryRun ? ' (dry-run)' : ''}\n`
  );

  let ok = 0;
  for (let i = 0; i < playbooks.length; i++) {
    const p = playbooks[i];
    console.log(`\n--- [${i + 1}/${playbooks.length}] ${p} ---\n`);

    if (opts.dryRun) {
      ok++;
      continue;
    }

    const result = await runPublishWithRetries(repoRoot, p, envCsv, opts.promoteOnly);
    if (result.ok) {
      ok++;
      if (i < playbooks.length - 1 && opts.delayMs > 0) {
        await delay(opts.delayMs);
      }
    } else {
      console.error(`\nStopped after failure: ${p} (exit ${result.status}).`);
      console.error('Fix the issue or use --playbook=<slug> to continue with others.');
      process.exit(1);
    }
  }

  console.log(`\nDone. Published ${ok} playbook(s) to ${envCsv}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
