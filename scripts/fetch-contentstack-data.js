#!/usr/bin/env node
/**
 * Fetch Contentstack data via CMA for publish script reference mapping.
 * Requires: CONTENTSTACK_MANAGEMENT_TOKEN, CMS_API_KEY
 * Optional: CMS_BASE_URL (default: https://api.contentstack.io)
 *
 * Usage:
 *   CONTENTSTACK_MANAGEMENT_TOKEN=xxx CMS_API_KEY=yyy node scripts/fetch-contentstack-data.js
 *   # Or create .env from env.template and run: node scripts/fetch-contentstack-data.js
 */

const fs = require('fs');
const path = require('path');

// Load .env from repo root if present
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) {
        const val = m[2].replace(/^['"]|['"]$/g, '').trim();
        process.env[m[1]] = val;
      }
    }
  }
}
loadEnv();

const BASE_URL = process.env.CMS_BASE_URL || 'https://api.contentstack.io';
const MANAGEMENT_TOKEN = process.env.CONTENTSTACK_MANAGEMENT_TOKEN;
const API_KEY = process.env.CMS_API_KEY;

const CONTENT_TYPES = {
  product_types: 'product_types',
  categories: 'categories',
  app_categories: 'app_categories',
  webex_playbook_app: 'webex_playbook_app'
};

async function cmaFetch(endpoint, options = {}) {
  const url = `${BASE_URL}/v3${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    api_key: API_KEY,
    authorization: MANAGEMENT_TOKEN.replace(/^Bearer\s+/i, '').trim(),
    ...options.headers
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CMA ${res.status} ${endpoint}: ${text}`);
  }
  return res.json();
}

async function fetchAllEntries(contentTypeUid) {
  const entries = [];
  let skip = 0;
  const limit = 100;
  while (true) {
    const data = await cmaFetch(
      `/content_types/${contentTypeUid}/entries?limit=${limit}&skip=${skip}`
    );
    const batch = data.entries || [];
    entries.push(...batch);
    if (batch.length < limit) break;
    skip += limit;
  }
  return entries;
}

async function main() {
  if (!MANAGEMENT_TOKEN || !API_KEY) {
    console.error('Required env vars: CONTENTSTACK_MANAGEMENT_TOKEN, CMS_API_KEY');
    process.exit(1);
  }

  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Fetching Contentstack data via CMA...\n');

  const run = async (name, fn) => {
    try {
      return await fn();
    } catch (e) {
      console.error(`\nFailed at step: ${name}`);
      console.error(e.message);
      throw e;
    }
  };

  try {
    // 0. Content types (discover correct UIDs)
    const contentTypeList = await run('content types', () => cmaFetch('/content_types'));
    const ctUids = (contentTypeList.content_types || contentTypeList || []).map((ct) => (typeof ct === 'string' ? ct : ct?.uid)).filter(Boolean);
    fs.writeFileSync(
      path.join(outputDir, 'content_types_list.json'),
      JSON.stringify({ content_types: ctUids }, null, 2)
    );
    console.log('0. content_types_list.json');
    ctUids.filter((u) => /categor|product|playbook/i.test(u)).forEach((u) => console.log(`   - ${u}`));

    // 1. Environments
    const envs = await run('environments', () => cmaFetch('/environments'));
    fs.writeFileSync(
      path.join(outputDir, 'environments.json'),
      JSON.stringify(envs, null, 2)
    );
    console.log('1. environments.json');
    (envs.environments || []).forEach((e) => {
      console.log(`   - ${e.name} (uid: ${e.uid})`);
    });

    // 2. Product types
    const productTypes = await run('product_types', () => fetchAllEntries(CONTENT_TYPES.product_types));
    fs.writeFileSync(
      path.join(outputDir, 'product_types.json'),
      JSON.stringify(productTypes, null, 2)
    );
    console.log(`\n2. product_types.json (${productTypes.length} entries)`);

    // 3. Categories - use webex_apps_categories (playbook schema reference_to)
    const categories = await run('categories', () => fetchAllEntries('webex_apps_categories'));
    fs.writeFileSync(
      path.join(outputDir, 'categories.json'),
      JSON.stringify(categories, null, 2)
    );
    console.log(`3. categories.json (${categories.length} entries)`);

    // 4. webex_playbook_app entries (sample playbook)
    const playbooks = await run('webex_playbook_app entries', () => fetchAllEntries(CONTENT_TYPES.webex_playbook_app));
    fs.writeFileSync(
      path.join(outputDir, 'webex_playbook_app_entries.json'),
      JSON.stringify(playbooks, null, 2)
    );
    console.log(`4. webex_playbook_app_entries.json (${playbooks.length} entries)`);

    // 5. Content type schema for webex_playbook_app
    const schema = await run('webex_playbook_app schema', () => cmaFetch(`/content_types/${CONTENT_TYPES.webex_playbook_app}`));
    fs.writeFileSync(
      path.join(outputDir, 'webex_playbook_app_schema.json'),
      JSON.stringify(schema, null, 2)
    );
    console.log('5. webex_playbook_app_schema.json');

    console.log(`\nOutput written to ${outputDir}/`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
