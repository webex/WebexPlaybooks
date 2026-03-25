'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'scripts/check-competitor-tools.js');

const { findViolations } = require('../scripts/check-competitor-tools.js');

describe('findViolations', () => {
  test('returns empty when scanned fields are empty', () => {
    assert.deepEqual(findViolations({}), []);
  });

  test('returns empty for clean metadata', () => {
    const v = findViolations({
      title: 'Webex Sample',
      description: 'A nice integration with third parties.',
      tag_line: 'Short',
      third_party_tool: 'Salesforce'
    });
    assert.deepEqual(v, []);
  });

  test('detects Genesys in title', () => {
    const v = findViolations({ title: 'Genesys Cloud', description: '', tag_line: '', third_party_tool: '' });
    assert.ok(v.some((l) => l.includes('title') && l.includes('Genesys')));
  });

  test('detects five9 case-insensitive', () => {
    const v = findViolations({
      title: '',
      description: 'Uses FIVE9 APIs',
      tag_line: '',
      third_party_tool: ''
    });
    assert.ok(v.some((l) => l.includes('Five9')));
  });

  test('detects Talkdesk', () => {
    const v = findViolations({
      third_party_tool: 'Talkdesk connector'
    });
    assert.ok(v.some((l) => l.includes('Talkdesk')));
  });

  test('detects NICE only when capitalized token', () => {
    assert.deepEqual(
      findViolations({ description: 'A nice experience', title: '', tag_line: '', third_party_tool: '' }),
      []
    );
    const v = findViolations({ description: 'Uses NICE CXone', title: '', tag_line: '', third_party_tool: '' });
    assert.ok(v.length >= 1);
  });

  test('detects cxone', () => {
    const v = findViolations({ tag_line: 'cxone integration', title: '', description: '', third_party_tool: '' });
    assert.ok(v.some((l) => l.includes('CXone')));
  });
});

describe('check-competitor-tools CLI', () => {
  function run(args, opts = {}) {
    return spawnSync(process.execPath, [scriptPath, ...args], {
      encoding: 'utf8',
      cwd: repoRoot,
      ...opts
    });
  }

  test('exit 2 when no playbook path', () => {
    const r = run([]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Usage/i);
  });

  test('exit 2 when APPHUB.yaml missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pb-comp-'));
    const r = run([dir]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /APPHUB\.yaml/i);
  });

  test('exit 0 for valid fixture APPHUB', () => {
    const folder = path.join(repoRoot, 'test/fixtures/playbooks/valid-minimal');
    const r = run([folder]);
    assert.equal(r.status, 0, r.stderr);
  });

  test('exit 1 for bad-competitor fixture', () => {
    const folder = path.join(repoRoot, 'test/fixtures/playbooks/bad-competitor');
    const r = run([folder]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Genesys/i);
  });
});
