'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { apphubToEntry, loadApphub, normalizeSlug } = require('../scripts/lib/apphub-to-entries.js');

const repoRoot = path.join(__dirname, '..');

function loadRefs() {
  const productTypes = require(path.join(repoRoot, 'scripts/output/product_types.json'));
  const categories = require(path.join(repoRoot, 'scripts/output/categories.json'));
  return { productTypes, categories };
}

describe('normalizeSlug', () => {
  test('maps hyphens to underscores', () => {
    assert.equal(normalizeSlug('developer-tools'), 'developer_tools');
  });
});

describe('apphubToEntry', () => {
  const refs = loadRefs();

  test('builds entry for minimal apphub object', () => {
    const apphub = {
      friendly_id: 'unit-test-playbook',
      title: 'Unit Test',
      description: 'Desc',
      tag_line: 'Tag',
      product_types: ['meetings'],
      categories: ['developer-tools'],
      product_url: 'https://example.com/p',
      privacy_url: 'https://example.com/privacy'
    };
    const entry = apphubToEntry(apphub, refs);
    assert.equal(entry.friendly_id, 'unit-test-playbook');
    assert.equal(entry.title, 'Unit Test');
    assert.ok(Array.isArray(entry.product_types));
    assert.ok(entry.product_types.length >= 1);
    assert.ok(entry.product_types[0].uid);
    assert.equal(entry.product_types[0]._content_type_uid, 'product_types');
    assert.ok(entry.categories.length >= 1);
    assert.equal(entry.privacy_url, 'https://example.com/privacy');
  });

  test('loadApphub + apphubToEntry for valid-minimal fixture', () => {
    const folder = path.join(repoRoot, 'test/fixtures/playbooks/valid-minimal');
    const apphub = loadApphub(folder);
    const entry = apphubToEntry(apphub, refs);
    assert.equal(entry.friendly_id, 'valid-minimal-playbook');
    assert.match(entry.description, /validation tests/i);
  });

  test('throws when product_types do not resolve', () => {
    assert.throws(
      () =>
        apphubToEntry(
          {
            friendly_id: 'x-playbook',
            title: 'T',
            product_types: ['nonexistent_slug_xyz'],
            categories: ['developer-tools'],
            product_url: 'https://x',
            privacy_url: 'https://p'
          },
          refs
        ),
      /No product_types resolved/
    );
  });
});
