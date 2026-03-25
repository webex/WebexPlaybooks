'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const validateScript = path.join(repoRoot, 'scripts/ci/validate-playbook-folder.sh');

function validate(folderRel) {
  const folder = path.join(repoRoot, folderRel);
  return spawnSync('bash', [validateScript, folder], {
    encoding: 'utf8',
    cwd: repoRoot
  });
}

describe('validate-playbook-folder.sh', () => {
  test('passes valid-minimal fixture', () => {
    const r = validate('test/fixtures/playbooks/valid-minimal');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /README\.md contains all 6 required section headers/);
    assert.match(r.stdout, /No prohibited competitor/);
  });

  test('fails bad-missing-section fixture', () => {
    const r = validate('test/fixtures/playbooks/bad-missing-section');
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /deployment guide/);
  });

  test('fails bad-competitor fixture', () => {
    const r = validate('test/fixtures/playbooks/bad-competitor');
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /Prohibited competitor/);
  });

  test('exit 2 without arguments', () => {
    const r = spawnSync('bash', [validateScript], { encoding: 'utf8', cwd: repoRoot });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Usage/i);
  });
});
