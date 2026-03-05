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
- `name`, `description`, `vertical`, `use_case`, `target_persona`, `webex_component`
- `third_party_tool`, `estimated_implementation_time`, `author`, `status`, `product_type`
- `app_context` — Array, required; at least one value

### Valid Values (enforced by CI)

| Field | Allowed Values |
| ----- | -------------- |
| `vertical` | `healthcare`, `financial-services`, `retail-ecommerce` |
| `target_persona` | `admin`, `developer`, `architect` |
| `product_type` | `teams`, `meetings`, `calling`, `rooms`, `contact_center` |
| `app_context` | `space`, `in_meeting`, `call`, `device`, `contact_center`, `sidebar`, `mcp`, `a2a` |
| `webex_component` | `Agent Desktop`, `Flow Builder`, `AI Agent Studio`, `Reporting`, `Messaging`, `Meetings`, `Calling`, `Bots`, `Webhooks`, `Device SDK`, `Embed SDK`, `Control Hub` |
| `status` | `draft`, `review` (never `published` — reviewers set that) |

### Folder Naming

- Kebab-case only: `epic-ehr`, `my-crm`, `meetings-exporter`
- No spaces, no uppercase

## Source Code (src/) Requirements

- Connect to a **real, documented Webex API endpoint** — no internal or experimental APIs
- Use environment variables for **all** secrets — never hardcode credentials
- Include `.env.example` with required variables and comments
- Match source repo language when possible; default to Node.js for Webex SDK compatibility

## Prohibited

- **Competitor tools as primary targets** — No Genesys, NICE, Five9, Talkdesk
- **Production-hardening claims** — Playbooks are implementation guides, not production-ready
- **Undocumented APIs** — Only use documented, supported Webex APIs

## Import Playbook Command

When converting an open source repo into a Playbook, use the instructions in
`docs/commands/import_playbook.md`. The `/import-playbook` command (Claude/Cursor)
follows that document.

## References

- [CONTRIBUTING.md](CONTRIBUTING.md) — Full authoring guide and field rules
- [PLAYBOOK_TEMPLATE/](PLAYBOOK_TEMPLATE/) — Copy this when creating new Playbooks
- [.github/workflows/validate-playbook.yml](.github/workflows/validate-playbook.yml) — CI validation logic
