#!/usr/bin/env node
/**
 * Publish APPHUB.yaml to Contentstack.
 * Usage: node scripts/publish-playbook.js <playbook-path> [--env integration|production] [--no-publish] [--promote-only] [--output <file>]
 *
 * Example: node scripts/publish-playbook.js playbooks/meetings-exporter --env integration
 * Example: node scripts/publish-playbook.js playbooks/meetings-exporter --env production --promote-only
 *
 * --promote-only: Publish the existing entry version to the target env without creating/updating.
 *   Use for production to promote the same version from integration (avoids creating a new version).
 */

const fs = require('fs');
const path = require('path');
const { loadApphub, apphubToEntry } = require('./lib/apphub-to-entries');
const {
  getReferences,
  findEntryByFriendlyId,
  createEntry,
  updateEntry,
  publishEntry,
  getEnvironmentUid
} = require('./lib/contentstack-publisher');

async function main() {
  const args = process.argv.slice(2);
  const playbookPath = args.find((a) => !a.startsWith('--'));
  const envArg = args.find((a) => a.startsWith('--env='));
  const envName = envArg ? envArg.split('=')[1] : args[args.indexOf('--env') + 1];
  const noPublish = args.includes('--no-publish');
  const promoteOnly = args.includes('--promote-only');
  const outputIdx = args.indexOf('--output');
  const outputFile = outputIdx >= 0 ? args[outputIdx + 1] : null;

  if (!playbookPath) {
    console.error('Usage: node scripts/publish-playbook.js <playbook-path> [--env integration|production] [--no-publish] [--promote-only]');
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
      console.log(`Promoting existing entry ${entry.uid} (version ${version}) to ${envName}`);
    } else {
      const refs = await getReferences();
      console.log(`References: ${refs.productTypes.length} product_types, ${refs.categories.length} categories`);

      const entryPayload = apphubToEntry(apphub, refs);
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

    if (!noPublish && envName) {
      const envUid = await getEnvironmentUid(envName);
      console.log(`Publishing to ${envName} (${envUid})...`);
      await publishEntry(entry.uid, version, envUid);
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
