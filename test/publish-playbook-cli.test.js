'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'scripts/publish-playbook.js');

test('publish-playbook exits non-zero and prints usage when playbook path missing', () => {
  const r = spawnSync(process.execPath, [scriptPath], {
    encoding: 'utf8',
    cwd: repoRoot
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /Usage/i);
});
