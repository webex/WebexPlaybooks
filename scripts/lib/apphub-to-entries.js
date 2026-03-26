/**
 * Parse APPHUB.yaml and build Contentstack entry payload.
 * Resolves slugs to Contentstack UIDs using reference maps.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const PRODUCT_TITLE_TO_SLUG = {
  'Webex Calling': 'calling',
  'Webex Contact Center': 'contact_center',
  'Webex Meetings': 'meetings',
  'Webex Teams': 'teams',
  'Webex Messaging': 'teams',
  Messaging: 'teams',
  'Webex Rooms': 'rooms',
  Connect: 'connect',
  'AI Agent': 'ai_agent',
  'Customer Experience': 'customer_experience',
  'Webex EmbeddedApp': 'webex_embeddedapp'
};

const DEFAULT_LOGO_UID = 'blta2de9daa773c6604';

function normalizeSlug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/&/g, '_')
    .replace(/\s+/g, '_')
    .trim();
}

function resolveProductTypes(slugs, productTypesMap) {
  return (slugs || [])
    .map((s) => productTypesMap[normalizeSlug(s)])
    .filter(Boolean)
    .map((uid) => ({ uid, _content_type_uid: 'product_types' }));
}

function resolveCategories(slugs, categoriesMap) {
  return (slugs || [])
    .map((s) => categoriesMap[normalizeSlug(s)])
    .filter(Boolean);
}

function resolveLogo(url, defaultUid = DEFAULT_LOGO_UID) {
  if (!url || typeof url !== 'string') return defaultUid;
  if (url.includes('blta2de9daa773c6604')) return 'blta2de9daa773c6604';
  return defaultUid;
}

function buildReferenceMaps(productTypes, categories) {
  const productTypesMap = {};
  for (const pt of productTypes || []) {
    const slug =
      PRODUCT_TITLE_TO_SLUG[pt.title] ||
      (pt.url ? pt.url.replace(/^\//, '').replace(/-/g, '_') : null) ||
      normalizeSlug(pt.uid);
    if (slug) productTypesMap[slug] = pt.uid;
  }

  const categoriesMap = {};
  for (const c of categories || []) {
    const slug = normalizeSlug(c.slug || c.api_id || c.title);
    if (slug) categoriesMap[slug] = c.uid;
  }

  return { productTypesMap, categoriesMap };
}

function apphubToEntry(apphub, refs) {
  const { productTypesMap, categoriesMap } = buildReferenceMaps(
    refs.productTypes,
    refs.categories
  );

  const productTypes = resolveProductTypes(apphub.product_types, productTypesMap);
  const categories = resolveCategories(apphub.categories, categoriesMap);
  const logoUid = resolveLogo(apphub.logo);

  if (productTypes.length === 0) {
    throw new Error(`No product_types resolved for: ${(apphub.product_types || []).join(', ')}`);
  }
  if (categories.length === 0) {
    throw new Error(`No categories resolved for: ${(apphub.categories || []).join(', ')}`);
  }

  return {
    title: apphub.title,
    friendly_id: apphub.friendly_id,
    description: apphub.description || '',
    tag_line: apphub.tag_line || '',
    product_types: productTypes,
    categories,
    logo: logoUid,
    company_name: apphub.company_name || '',
    company_url: apphub.company_url || '',
    support_url: apphub.support_url || '',
    product_url: apphub.product_url || '',
    privacy_url: apphub.privacy_url || 'https://www.cisco.com/c/en/us/about/legal/privacy-full.html',
    estimated_implementation_time: apphub.estimated_implementation_time || '',
    third_party_tool: apphub.third_party_tool || '',
    submission_date: apphub.submission_date || new Date().toISOString().slice(0, 10)
  };
}

function loadApphub(playbookPath) {
  const apphubPath = path.join(playbookPath, 'APPHUB.yaml');
  if (!fs.existsSync(apphubPath)) {
    throw new Error(`APPHUB.yaml not found at ${apphubPath}`);
  }
  const content = fs.readFileSync(apphubPath, 'utf8');
  return yaml.load(content);
}

module.exports = {
  apphubToEntry,
  loadApphub,
  normalizeSlug
};
