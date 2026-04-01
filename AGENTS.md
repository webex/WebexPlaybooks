# AGENTS.md — AI Agent Guidelines for Webex Playbooks

This file provides context for AI coding agents (Cursor, Copilot, etc.) contributing
to the Webex Playbooks repository. Follow these guidelines when creating or editing
Playbooks.

## Project Overview

Webex Playbooks are implementation guides that integrate third-party tools with
Webex programmability (Teams, Meetings, Calling, Rooms, Contact Center). Each
Playbook is a folder under `playbooks/<tool-slug>/` with README, APPHUB.yaml,
diagrams, and source code.

## Playbook Structure (Required)

Every Playbook **must** have:

```text
playbooks/<slug>/
├── README.md
├── APPHUB.yaml
├── diagrams/
│   └── architecture-diagram.md
└── src/
    ├── main.<ext>
    └── .env.example
```

**Reference-upstream playbooks** (SDK or sample whose canonical home is another
GitHub repo): the same folder layout applies, but `src/` may contain only
**documentation that points to upstream** — typically `src/README.md` (required:
URL, pinned ref, install path, license link) and optionally `env.template` for
Webex-side or integration-only variables. Do **not** vendor upstream SDK sources
or full sample trees. See `docs/commands/import_playbook_reference.md` and the
`/import-playbook-reference` command.

## README.md — Six Required Sections

Use these exact headers (case-insensitive validation):

1. **## Use Case Overview** — Problem solved, target persona, estimated implementation time
2. **## Architecture** — Component connections, reference diagram in `/diagrams/`
3. **## Prerequisites** — Webex org, API access, third-party accounts, dev environment
4. **## Code Scaffold** — Describe `/src/` structure and what it demonstrates
5. **## Deployment Guide** — Numbered, step-by-step instructions (tested end-to-end)
6. **## Known Limitations** — Rate limits, token expiry, deprecated endpoints, license, Webex disclaimer

## APPHUB.yaml — Technical Review Requirements

### Required Fields (all non-empty)

- `friendly_id` — **Must end with `-playbook`** (e.g. `meetings-exporter-playbook`)
- `title`, `description`, `tag_line`, `estimated_implementation_time`
- `tag_line` — Short tagline for App Hub detail page; **max 128 characters**
- `product_types` — Array, required; at least one value
- `categories` — Array, required; at least one value
- `product_url`, `privacy_url` — required

### Valid Values (enforced by CI)

| Field | Allowed Values |
| ----- | -------------- |
| `product_types` | `teams`, `meetings`, `calling`, `rooms`, `contact_center` |

### Folder Naming

- Kebab-case only: `epic-ehr`, `my-crm`, `meetings-exporter`
- No spaces, no uppercase

## Source Code (src/) Requirements

- Connect to a **real, documented Webex API endpoint** — no internal or experimental APIs
- Use environment variables for **all** secrets — never hardcode credentials
- Include `.env.example` (or `env.template`) with required variables and comments
  when sample code lives in this repo
- Match source repo language when possible; default to Node.js for Webex SDK compatibility

For **reference-upstream** playbooks, the runnable integration code lives **upstream**;
reviewers and authors still require a **followable path** to documented Webex APIs
(via upstream samples or SDK usage described in README and Deployment Guide). See
`docs/commands/import_playbook_reference.md`.

## Prohibited

- **Competitor tools as primary targets** — No Genesys, NICE, Five9, Talkdesk
- **Production-hardening claims** — Playbooks are implementation guides, not production-ready
- **Undocumented APIs** — Only use documented, supported Webex APIs

## Import Playbook Command

Two workflows:

| Workflow | Document | Command (Claude/Cursor/Codex) |
| -------- | -------- | ------------------------------ |
| **Standard** — copy minimal integration code into `playbooks/<slug>/src/` | [docs/commands/import_playbook.md](docs/commands/import_playbook.md) | `/import-playbook` |
| **Reference upstream** — guide only; canonical SDK/sample stays in its repo | [docs/commands/import_playbook_reference.md](docs/commands/import_playbook_reference.md) | `/import-playbook-reference` |

**Clone flow (both):** Clone the source repo to `.import-playbook-cache/<slug>/`
in the workspace (gitignored), read from there, then remove the clone when done.
Keeps everything local to the project.

## References

- [CONTRIBUTING.md](CONTRIBUTING.md) — Full authoring guide and field rules
- [PLAYBOOK_TEMPLATE/](PLAYBOOK_TEMPLATE/) — Copy this when creating new Playbooks
- [.github/workflows/validate-then-publish-to-integration.yml](.github/workflows/validate-then-publish-to-integration.yml) — PR validation, comments, publish to integration
- [.github/workflows/unit-tests-and-workflow-lint.yml](.github/workflows/unit-tests-and-workflow-lint.yml) — `npm test` and actionlint on every PR to `main`
