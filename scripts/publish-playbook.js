#!/usr/bin/env node
/**
 * Publish APPHUB.yaml to Contentstack.
 * Usage: node scripts/publish-playbook.js <playbook-path> [--env integration|production|integration,production] [--no-publish] [--promote-only] [--preview-pr-url <url>] [--output <file>]
 *
 * Example: node scripts/publish-playbook.js playbooks/meetings-exporter --env integration
 * Example: node scripts/publish-playbook.js playbooks/meetings-exporter --env production,integration
 * Example: node scripts/publish-playbook.js playbooks/meetings-exporter --env production --promote-only
 *
 * --promote-only: Publish the existing entry version to the target env(s) without creating/updating.
 * --env: Comma-separated environment names publish the same version to each after one update.
 *
 * PLAYBOOK_PREVIEW_PR_URL: When set and publish list includes "integration", append preview footer to description.
 */

const fs = require('fs');
const path = require('path');
const { loadApphub, apphubToEntry } = require('./lib/apphub-to-entries');
const { stripPreviewFooter, appendPreviewFooter } = require('./lib/preview-description');
const {
  getReferences,
  findEntryByFriendlyId,
  createEntry,
  updateEntry,
  publishEntry,
  getEnvironmentUid
} = require('./lib/contentstack-publisher');

function parseEnvList(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

function parsePreviewPrUrl(args) {
  const fromEnv = (process.env.PLAYBOOK_PREVIEW_PR_URL || '').trim();
  if (fromEnv) return fromEnv;

  const eq = args.find((a) => a.startsWith('--preview-pr-url='));
  if (eq) return eq.split('=').slice(1).join('=').trim();

  const idx = args.indexOf('--preview-pr-url');
  if (idx >= 0 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
    return args[idx + 1].trim();
  }
  return '';
}

async function main() {
  const args = process.argv.slice(2);
  const playbookPath = args.find((a) => !a.startsWith('--'));
  const envArg = args.find((a) => a.startsWith('--env='));
  const envRaw = envArg ? envArg.split('=').slice(1).join('=') : args[args.indexOf('--env') + 1];
  const envNames = parseEnvList(envRaw);
  const noPublish = args.includes('--no-publish');
  const promoteOnly = args.includes('--promote-only');
  const outputIdx = args.indexOf('--output');
  const outputFile = outputIdx >= 0 ? args[outputIdx + 1] : null;
  const previewPrUrl = parsePreviewPrUrl(args);

  if (!playbookPath) {
    console.error(
      'Usage: node scripts/publish-playbook.js <playbook-path> [--env integration|production|integration,production] [--no-publish] [--promote-only] [--preview-pr-url <url>]'
    );
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), playbookPath);
  console.log(`Publishing playbook from ${resolvedPath}\n`);

  try {
    const apphub = loadApphub(resolvedPath);
    console.log(`Loaded APPHUB.yaml: ${apphub.friendly_id}`);

    const existing = await findEntryByFriendlyId(apphub.friendly_id);
    let entry;
    let version;

    if (promoteOnly) {
      if (!existing) {
        throw new Error(`Entry not found for ${apphub.friendly_id}. Publish to integration first.`);
      }
      entry = existing;
      version = existing._version;
      console.log(`Promoting existing entry ${entry.uid} (version ${version}) to ${envNames.join(', ')}`);
    } else {
      const refs = await getReferences();
      console.log(`References: ${refs.productTypes.length} product_types, ${refs.categories.length} categories`);

      const apphubForEntry = {
        ...apphub,
        description: stripPreviewFooter(apphub.description || '')
      };
      const entryPayload = apphubToEntry(apphubForEntry, refs);

      const publishTargetsIntegration = envNames.some((n) => n.toLowerCase() === 'integration');
      if (publishTargetsIntegration && previewPrUrl) {
        entryPayload.description = appendPreviewFooter(entryPayload.description, previewPrUrl);
        console.log('Applied integration preview footer to description');
      }

      console.log('Built entry payload');

      if (existing) {
        console.log(`Updating existing entry ${existing.uid}`);
        entry = await updateEntry(existing.uid, entryPayload);
        version = entry._version;
      } else {
        console.log('Creating new entry');
        entry = await createEntry(entryPayload);
        version = entry._version;
      }
      console.log(`Entry ${entry.uid} (version ${version})`);
    }

    if (!noPublish && envNames.length > 0) {
      for (const name of envNames) {
        const envUid = await getEnvironmentUid(name);
        console.log(`Publishing to ${name} (${envUid})...`);
        await publishEntry(entry.uid, version, envUid);
      }
      console.log('Published successfully.');

      if (outputFile) {
        const line = JSON.stringify({ friendly_id: apphub.friendly_id, entry_uid: entry.uid }) + '\n';
        fs.appendFileSync(outputFile, line);
      }
    } else if (noPublish) {
      console.log('Skipped publish (--no-publish).');
    } else {
      console.log('Skipped publish (no --env specified).');
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
