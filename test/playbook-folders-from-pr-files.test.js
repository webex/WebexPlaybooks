'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { playbookFoldersFromFilenames } = require(
  path.join(__dirname, '..', 'scripts/ci/playbook-folders-from-pr-files.js')
);

describe('playbookFoldersFromFilenames', () => {
  test('returns empty when no playbook paths', () => {
    assert.deepEqual(playbookFoldersFromFilenames(['README.md', 'scripts/foo.js']), {
      folders: [],
      count: 0
    });
  });

  test('single playbook with many files (>30) yields count 1', () => {
    const filenames = Array.from({ length: 40 }, (_, i) => `playbooks/same-slug/src/f${i}.txt`);
    const r = playbookFoldersFromFilenames(filenames);
    assert.equal(r.count, 1);
    assert.deepEqual(r.folders, ['playbooks/same-slug']);
  });

  test('two playbooks yields count 2 and sorted folder list', () => {
    const r = playbookFoldersFromFilenames([
      'playbooks/beta/README.md',
      'playbooks/alpha/x.js',
      'playbooks/beta/y.js'
    ]);
    assert.equal(r.count, 2);
    assert.deepEqual(r.folders, ['playbooks/alpha', 'playbooks/beta']);
  });

  test('unpaginated first page can hide a second playbook (regression)', () => {
    const firstPageOnly = [
      ...Array.from({ length: 30 }, (_, i) => `playbooks/first/f${i}.txt`),
      'playbooks/second/README.md'
    ];
    const partial = firstPageOnly.slice(0, 30);
    assert.deepEqual(playbookFoldersFromFilenames(partial), {
      folders: ['playbooks/first'],
      count: 1
    });
    assert.deepEqual(playbookFoldersFromFilenames(firstPageOnly), {
      folders: ['playbooks/first', 'playbooks/second'],
      count: 2
    });
  });
});
