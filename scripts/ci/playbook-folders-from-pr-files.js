'use strict';

/**
 * Derive unique playbook folder paths from PR file names (GitHub `file.filename`).
 *
 * GitHub REST `pulls.listFiles` is paginated: default 30 files per page (max 100).
 * Workflows must fetch all pages; otherwise only the first page is seen and
 * `playbooks/<second-slug>/` changes can be missed when the first playbook
 * dominates the sort order.
 */

const PLAYBOOK_PATH = /^playbooks\/([^/]+)\//;

/**
 * @param {string[]} filenames
 * @returns {{ folders: string[], count: number }}
 */
function playbookFoldersFromFilenames(filenames) {
  const playbookFolders = new Set();
  for (const filePath of filenames) {
    const match = filePath.match(PLAYBOOK_PATH);
    if (match) {
      playbookFolders.add(`playbooks/${match[1]}`);
    }
  }
  const folders = [...playbookFolders].sort();
  return { folders, count: folders.length };
}

module.exports = { playbookFoldersFromFilenames };
