# Import Playbook — Reference upstream

Create a Webex Playbook that **references** a canonical upstream repo (SDK or
sample) **without** vendoring its sources into `playbooks/<slug>/src/`.

**Usage:** `/import-playbook-reference <github-repo-url>`

The GitHub repo URL is passed as `$ARGUMENTS`.

---

Follow the full instructions in `docs/commands/import_playbook_reference.md`.

The source repo to process is: $ARGUMENTS

**Claude-specific notes:**

- **Step 0:** Run `git clone` in the workspace to clone the repo into
  `.import-playbook-cache/<slug>`. Parse owner and repo from the URL; derive slug
  from repo name (lowercase, kebab-case, strip webex-/cisco- prefixes).

- **Step 1:** If the source repo is primarily for Genesys, NICE, Five9, or
  Talkdesk, stop and explain the competitor-tools restriction — do not proceed.

- **Step 3:** Do not copy SDK or full sample trees into `playbooks/<slug>/src/`;
  use `src/README.md` and optional `env.template` as specified in the doc.

- **Step 4:** Do not run validation automatically. Output the validation command
  (`./scripts/validate-playbook-local.sh playbooks/<slug>`) for the author to run.

- **Step 6:** Run `rm -rf .import-playbook-cache/<slug>` to remove the clone after
  the playbook is created.

- Replace every instance of `<slug>` in the instructions with the slug derived from
  the repo name in Step 0.
