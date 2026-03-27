'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  MARKER_BEGIN,
  MARKER_END,
  stripPreviewFooter,
  appendPreviewFooter
} = require('../scripts/lib/preview-description');

test('stripPreviewFooter is no-op when markers absent', () => {
  const text = 'Hello world\n\nMore text.';
  assert.equal(stripPreviewFooter(text), text);
});

test('stripPreviewFooter removes block between markers', () => {
  const base = 'Description line.';
  const withFooter = `${base}\n${MARKER_BEGIN}\nfooter\n${MARKER_END}`;
  assert.equal(stripPreviewFooter(withFooter), base);
});

test('stripPreviewFooter handles missing end marker', () => {
  const text = `Before\n${MARKER_BEGIN}\ntrailing`;
  assert.equal(stripPreviewFooter(text), 'Before');
});

test('appendPreviewFooter then stripPreviewFooter returns original base (trimEnd)', () => {
  const base = 'YAML description.\n\nSecond paragraph.';
  const prUrl = 'https://github.com/org/repo/pull/42';
  const withFooter = appendPreviewFooter(base, prUrl);
  assert.ok(withFooter.includes(prUrl));
  assert.ok(withFooter.includes(MARKER_BEGIN));
  assert.equal(stripPreviewFooter(withFooter), base.trimEnd());
});

test('appendPreviewFooter is idempotent (second append replaces same block)', () => {
  const base = 'Same body.';
  const url1 = 'https://github.com/org/repo/pull/1';
  const url2 = 'https://github.com/org/repo/pull/2';
  const once = appendPreviewFooter(base, url1);
  const twice = appendPreviewFooter(once, url2);
  assert.equal(twice.indexOf(url1), -1);
  assert.ok(twice.includes(url2));
  assert.equal(stripPreviewFooter(twice), base);
});

test('appendPreviewFooter with empty prUrl returns stripped base only', () => {
  const base = `Text\n${MARKER_BEGIN}\nold\n${MARKER_END}`;
  assert.equal(appendPreviewFooter(base, ''), 'Text');
});

test('stripPreviewFooter removes legacy HTML comment markers', () => {
  const legacyBegin = '<!-- webex-playbooks-preview:begin -->';
  const legacyEnd = '<!-- webex-playbooks-preview:end -->';
  const base = 'Description line.';
  const withLegacy = `${base}\n${legacyBegin}\nPreview text\n${legacyEnd}`;
  assert.equal(stripPreviewFooter(withLegacy), base);
});
