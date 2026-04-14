/**
 * Contentstack CMA client for creating/updating and publishing playbook entries.
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.CMS_BASE_URL || 'https://api.contentstack.io';
const MANAGEMENT_TOKEN = (process.env.CONTENTSTACK_MANAGEMENT_TOKEN || '').replace(/^Bearer\s+/i, '').trim();
const API_KEY = process.env.CMS_API_KEY;
const CONTENT_TYPE = 'webex_playbook_app';
const LOCALE = 'en-us';

function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env');
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse Retry-After header (seconds) or return null. */
function retryAfterMs(headerVal) {
  if (!headerVal) return null;
  const n = parseInt(String(headerVal).trim(), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(120_000, n * 1000);
}

async function cmaFetch(endpoint, options = {}) {
  const token = (process.env.CONTENTSTACK_MANAGEMENT_TOKEN || '').replace(/^Bearer\s+/i, '').trim();
  const apiKey = process.env.CMS_API_KEY || API_KEY;
  const url = `${BASE_URL}/v3${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    api_key: apiKey,
    authorization: token,
    ...options.headers
  };

  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, { ...options, headers });
    if (res.ok) {
      return res.json();
    }
    const text = await res.text();
    if (res.status === 429 && attempt < maxAttempts) {
      const fromHeader = retryAfterMs(res.headers.get('retry-after'));
      const backoff = Math.min(120_000, 5000 * 2 ** (attempt - 1));
      const waitMs = fromHeader ?? backoff;
      await sleep(waitMs);
      continue;
    }
    throw new Error(`CMA ${res.status} ${endpoint}: ${text}`);
  }
  throw new Error(`CMA exhausted retries ${endpoint}`);
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

async function getReferences() {
  const outputDir = path.join(__dirname, '..', 'output');
  const readJson = (file) => {
    const p = path.join(outputDir, file);
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
    return null;
  };

  let productTypes = readJson('product_types.json');
  let categories = readJson('categories.json');

  if (!productTypes || !categories) {
    productTypes = productTypes || await fetchAllEntries('product_types');
    categories = categories || await fetchAllEntries('webex_apps_categories');
  }

  return {
    productTypes: Array.isArray(productTypes) ? productTypes : [],
    categories: Array.isArray(categories) ? categories : []
  };
}

async function findEntryByFriendlyId(friendlyId) {
  const all = await findAllPlaybookEntries();
  return all.find((e) => e.friendly_id === friendlyId) || null;
}

async function findAllPlaybookEntries() {
  const entries = [];
  let skip = 0;
  const limit = 100;
  while (true) {
    const data = await cmaFetch(
      `/content_types/${CONTENT_TYPE}/entries?limit=${limit}&skip=${skip}`
    );
    const batch = data.entries || [];
    entries.push(...batch);
    if (batch.length < limit) break;
    skip += limit;
  }
  return entries;
}

async function createEntry(entry) {
  const data = await cmaFetch(`/content_types/${CONTENT_TYPE}/entries`, {
    method: 'POST',
    body: JSON.stringify({ entry })
  });
  return data.entry;
}

async function updateEntry(entryUid, entry) {
  const data = await cmaFetch(
    `/content_types/${CONTENT_TYPE}/entries/${entryUid}`,
    {
      method: 'PUT',
      body: JSON.stringify({ entry })
    }
  );
  return data.entry;
}

async function publishEntry(entryUid, version, environmentUid) {
  return cmaFetch('/bulk/publish', {
    method: 'POST',
    headers: { skip_workflow_stage_check: 'true' },
    body: JSON.stringify({
      entries: [
        {
          uid: entryUid,
          content_type: CONTENT_TYPE,
          locale: LOCALE,
          version: String(version)
        }
      ],
      locales: [LOCALE],
      environments: [environmentUid]
    })
  });
}

async function getEnvironmentUid(name) {
  const data = await cmaFetch('/environments');
  const env = (data.environments || []).find((e) => e.name === name);
  if (!env) throw new Error(`Environment ${name} not found`);
  return env.uid;
}

module.exports = {
  cmaFetch,
  getReferences,
  findEntryByFriendlyId,
  createEntry,
  updateEntry,
  publishEntry,
  getEnvironmentUid,
  CONTENT_TYPE,
  LOCALE
};
