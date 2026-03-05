# Contributing to Webex Playbooks

This guide is for Webex team members who author Playbooks. It defines the
quality floor, metadata requirements, PR process, and style expectations.

## Quality Floor

Every Playbook **MUST** contain these six sections in its README.md. Use the
exact headers below (case-insensitive matching is used in validation):

1. **## Use Case Overview** — What problem does this integration solve? Who
   uses it? Include the estimated implementation time (e.g. "2–4 hours").

2. **## Architecture** — How do the components connect? Reference the diagram
   in `/diagrams/`.

3. **## Prerequisites** — What must be in place before starting? (Webex org,
   API access, third-party accounts, etc.)

4. **## Code Scaffold** — Describe the source code structure and what it
   demonstrates. Point to the `/src/` folder.

5. **## Deployment Guide** — Step-by-step instructions a competent developer
   can follow to get the integration running. Must be tested end-to-end.

6. **## Known Limitations** — What does this Playbook not cover? Edge cases,
   unsupported scenarios, or future work.

## APPHUB.yaml Metadata

Each Playbook folder must contain an `APPHUB.yaml` file with the metadata for
App Hub submission. All required fields must be present and non-empty.

```yaml
# App Hub submission
friendly_id: ""              # {folder-slug}-playbook (e.g. epic-ehr-playbook, my-crm-playbook)
name: ""                     # Display name for the Playbook
tag_line: ""                 # Short tagline for App Hub listing
description: ""              # 1–2 sentences, used as App Hub listing copy

product_type: ""             # teams | meetings | calling | rooms | contact_center
app_context: []             # space | in_meeting | call | device | contact_center | sidebar | mcp | a2a

categories:
  - "Productivity"
  - "Integrations"

company_name: "Webex for Developers"
company_url: "https://developer.webex.com"
support_url: "https://github.com/webex/webexplaybooks/issues"
product_url: "https://github.com/webex/webexplaybooks"
logo: "https://developer.webex.com/images/webex-logo.svg"

# Playbook metadata (for filtering and validation)
vertical: ""                 # Primary: healthcare | financial-services | retail-ecommerce
vertical_tags: []            # Additional verticals if the Playbook spans more than one
use_case: ""                 # e.g. "CRM screen pop", "ticket creation", "workforce analytics"
target_persona: ""           # admin | developer | architect
webex_component: ""          # Agent Desktop | Flow Builder | AI Agent Studio | Reporting | Messaging | Meetings | Calling | Bots | Webhooks | Device SDK | Embed SDK | Control Hub
third_party_tool: ""         # The tool being integrated (e.g. Salesforce, Epic)
estimated_implementation_time: ""   # e.g. "2-4 hours"
author: ""                   # Webex team member name
status: ""                   # draft | review | published (do NOT set to published — reviewer does this)

# Optional
privacy_url: "https://www.cisco.com/c/en/us/about/legal/privacy-full.html"
submission_date: ""          # ISO date (e.g. 2025-03-01)
```

### Field Rules

- **friendly_id** — Must end with `-playbook`. Format: `{folder-slug}-playbook`
  (e.g. `epic-ehr-playbook`, `my-crm-playbook`). Reduces App Hub name collisions
  with actual integrations.

- **product_type** — Must be one of: `teams`, `meetings`, `calling`, `rooms`,
  `contact_center`. Matches the Webex product this Playbook integrates with.

- **app_context** — Array of one or more values. Each must be one of: `space`,
  `in_meeting`, `call`, `device`, `contact_center`, `sidebar`, `mcp`, `a2a`.
  Matches where the integration runs (e.g. Contact Center: `["contact_center",
  "sidebar"]`; Teams: `["space"]`).

- **product_url** — Link to the Playbook in the repo
  (e.g. `https://github.com/webex/webexplaybooks/tree/main/playbooks/epic-ehr`).

- **support_url** — Issues link for the repo
  (`https://github.com/webex/webexplaybooks/issues`).

- **vertical** — Must be one of: `healthcare`, `financial-services`,
  `retail-ecommerce`. This is the primary industry for the Playbook.

- **vertical_tags** — Optional. Use when a Playbook applies to multiple
  verticals. Set `vertical` to the primary one and list additional verticals
  here (e.g. `[financial-services, retail-ecommerce]`).

- **webex_component** — Must be one of: `Agent Desktop`, `Flow Builder`,
  `AI Agent Studio`, `Reporting`, `Messaging`, `Meetings`, `Calling`, `Bots`,
  `Webhooks`, `Device SDK`, `Embed SDK`, `Control Hub`.

- **target_persona** — Must be one of: `admin`, `developer`, `architect`.

- **status** — Authors must use `draft` or `review`. Only a reviewer may set
  `published`. Self-publishing will fail validation.

## PR Process

### Where to Add Your Playbook

Copy `PLAYBOOK_TEMPLATE` to `playbooks/<tool-slug>/` (e.g. `playbooks/epic-ehr`,
`playbooks/shopify`). The folder name must be kebab-case and match the
third-party tool slug.

### Branch Naming

Use: `playbook/<tool-slug>`

Examples:

- `playbook/epic-ehr`
- `playbook/servicenow`
- `playbook/shopify`

### PR Template

Open a PR and complete the checklist in
[.github/pull_request_template.md](.github/pull_request_template.md). The
template includes self-attestation and reviewer questions. Ensure your
`APPHUB.yaml` is complete before opening the PR.

### Review Criteria

- All six required sections present in README.md
- APPHUB.yaml complete and valid
- Code in src/ connects to a real, documented Webex API endpoint
- Deployment guide is followable by a competent developer
- No competitor tools as primary integration targets (see below)

A human reviewer performs a ~15-minute spot-check before merge.

## Style Guide

### Target Persona

Write for the stated `target_persona`:

- **admin** — Configuration-focused, less code, more UI and settings
- **developer** — Code and API details, environment setup, debugging
- **architect** — High-level flows, data models, integration patterns

### Implementation Time

Include the estimated implementation time in the Use Case Overview. Use ranges
(e.g. "2–4 hours") and be realistic for someone familiar with the tools.

### API References

Webex API endpoint references must be **real and documented**. Link to official
Webex developer documentation. Do not reference unsupported or internal APIs.

## What NOT to Do

- **No competitor tools as primary targets** — Do not build Playbooks where
  Genesys, NICE, Five9, or Talkdesk are the primary integration target. Webex
  integrations only.

- **No production-hardening claims** — Playbooks are implementation guides. Do
  not claim they are production-ready without additional hardening.

- **No undocumented APIs** — Only use Webex APIs that are documented and
  supported. Internal or experimental endpoints are not allowed.
