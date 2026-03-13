# Contributing to Webex Playbooks

This guide is for **internal Cisco contributors** (e.g. CX, Sales, TME, Webex
team) who author Playbooks. You may be new to Playbook standards or the GitHub
PR workflow—this document is the end-to-end guide for submitting a Playbook via
a pull request. It covers the quality floor, the APPHUB schema (metadata),
what to expect from automated validation and review, and style expectations.

## In this guide

- [Quality floor](#quality-floor) — Required README sections and considerations every Playbook must meet
- [APPHUB.yaml metadata (APPHUB schema)](#apphubyaml-metadata) — Required metadata for App Hub submission
- [Full submission process](#full-submission-process) — Step-by-step from clone to merge
- [What to expect from automated validation and review](#what-to-expect-from-automated-validation-and-review) — CI checks, human review, and AI review pipeline
- [Style guide](#style-guide) — Implementation time and writing conventions
- [What NOT to do](#what-not-to-do) — Rules and restrictions

## Before you start

You need a GitHub account with access to this repository. You will work on a
**branch** and open a **Pull Request (PR)** to propose your Playbook; the PR
template and this guide walk you through the rest. If you are new to pull
requests, see [GitHub: About pull requests](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests).

## Quality Floor

Playbooks are sample code clearly marked as such; production implementations
are expected to follow stricter platform security and access control. The
following defines the **Playbook Quality Floor** for submission.

Every Playbook **MUST** contain these six sections in its README.md. Use the
exact headers below (case-insensitive matching is used in validation):

1. **Use Case Overview** — What problem does this integration solve? Who uses it? Include the estimated implementation time (e.g. "2–4 hours").
    - A clear and concise description of the problem or scenario the playbook addresses.
    - Explanation of the intended outcome and value of the playbook.

2. **Architecture** — How do the components connect? Reference the diagram in `/diagrams/`.
    - Visual representation of the playbook's workflow or system architecture.
    - Illustrates components, integrations, and data flow relevant to the playbook.

3. **Prerequisites** — What must be in place before starting? (Webex org, API access, third-party accounts, etc.)
    - List of required tools, APIs (Generally Available + publicly documented APIs, SDKs, developer tools ONLY, unless implemented internal to the project), environment setup, permissions, and any dependencies needed before deploying or running the playbook.
    - Include version requirements and configuration notes.

4. **Code Scaffold** — Describe the source code structure and what it demonstrates. Point to the `/src/` folder.
    - Sample code that demonstrates the core functionality of the playbook.
    - Code should be modular, reusable, and clearly commented to aid understanding.
    - Mark clearly as sample code, not production-ready, with guidance on security and best practices for production use.

5. **Deployment Guide** — Step-by-step instructions a competent developer can follow to get the integration running. Must be tested end-to-end.
    - Detailed instructions on how to deploy, configure, and execute the playbook.
    - Include any setup steps, commands, or configuration changes required.
    - Highlight any manual steps or approvals needed.

6. **Known Limitations** — What does this Playbook not cover? Edge cases, unsupported scenarios, or future work.
    - Explicitly document any constraints, assumptions, or gaps in the playbook.
    - Include security considerations, such as the use of only publicly documented APIs and tools, and disclaimers about production readiness.
    - Note any scenarios or edge cases not covered by the playbook.

### Additional Considerations for Playbook Quality Floor

- **Clear Marking as Sample Code** — Each playbook must prominently state that
  it is sample code intended for demonstration or learning purposes only.
  Production implementations should follow stricter security and operational
  controls.

- **Security Guidance** — Include notes or references reminding users that
  production deployments must implement platform security and access control
  measures, such as authentication, authorization, and audit logging.

- **Modularity and Reusability** — Encourage modular design to facilitate
  reuse and easier maintenance.

- **Documentation Quality** — Ensure all sections are well-written, accurate,
  and easy to follow for contributors and reviewers.

- **Review and Approval Alignment** — This quality floor serves as the
  canonical reference for contributors, reviewers, and AI agent rulesets to
  enforce consistency and security compliance.

This structured quality floor balances the need for clear, useful sample code
with the understanding that production security controls are outside the scope
of the playbook itself but must be implemented by users deploying production
solutions.

## APPHUB.yaml Metadata

This section is the **canonical APPHUB schema** for Playbook metadata. Each
Playbook folder must contain an `APPHUB.yaml` file that conforms to it. All
required fields must be present and non-empty for App Hub submission.

```yaml
# App Hub submission
friendly_id: ""              # {folder-slug}-playbook (e.g. epic-ehr-playbook, my-crm-playbook)
title: ""                    # Display name for the Playbook (matches ContentStack field)
tag_line: ""                 # Short tagline for App Hub detail page (required, max 128 chars)
description: ""              # 1–2 sentences, used as App Hub listing copy

product_types: []            # Array: one or more of teams | meetings | calling | rooms | contact_center
app_context: []             # space | in_meeting | call | device | contact_center | sidebar | mcp | a2a

# categories: verticals (healthcare, financial-services, retail-ecommerce) AND app categories (developer-tools, productivity, etc.)
categories: []               # Array of App Hub category slugs; include verticals and app categories as appropriate

company_name: "Webex for Developers"
company_url: "https://developer.webex.com"
support_url: "https://github.com/webex/webexplaybooks/issues"
product_url: ""              # Link to playbook in repo (e.g. https://github.com/webex/webexplaybooks/tree/main/playbooks/epic-ehr)
privacy_url: ""              # Privacy policy URL (App Hub displays this link; use Cisco default for Webex-authored playbooks)
logo: ""                     # Optional. URL to your logo. Omit or leave empty to use the standard Webex Playbook logo.

# Playbook metadata (for filtering and validation)
estimated_implementation_time: ""   # e.g. "2-4 hours"

# Optional
third_party_tool: ""         # The tool being integrated (e.g. Salesforce, Epic); omit for generic playbooks (e.g. "any CMS")
submission_date: ""          # ISO date (e.g. 2025-03-01)
```

### Field Rules

- **friendly_id** — Must end with `-playbook`. Format: `{folder-slug}-playbook`
  (e.g. `epic-ehr-playbook`, `my-crm-playbook`). Reduces App Hub name collisions
  with actual integrations.

- **title** — Display name for the Playbook. Matches the ContentStack field used
  by other app types.

- **tag_line** — Short tagline displayed on the App Hub detail page. Required.
  Max 128 characters.

- **product_types** — Array of one or more of: `teams`, `meetings`, `calling`,
  `rooms`, `contact_center`. Playbooks can span multiple products (e.g.
  `["meetings", "teams"]` appears on both /meetings and /messaging).

- **app_context** — Array of one or more values. Each must be one of: `space`,
  `in_meeting`, `call`, `device`, `contact_center`, `sidebar`, `mcp`, `a2a`.
  Matches where the integration runs (e.g. Contact Center: `["contact_center",
  "sidebar"]`; Teams: `["space"]`).

- **product_url** — Link to the Playbook in the repo
  (e.g. `https://github.com/webex/webexplaybooks/tree/main/playbooks/epic-ehr`).

- **support_url** — Issues link for the repo
  (`https://github.com/webex/webexplaybooks/issues`).

- **logo** — Optional. URL to your logo image. If not provided, defaults to the
  standard Webex Playbook logo.

- **categories** — Array of App Hub category slugs. Include both verticals
  (e.g. `healthcare`, `financial-services`, `retail-ecommerce`) and app
  categories (e.g. `developer-tools`, `productivity`) as appropriate. Example:
  a developer tool in the healthcare vertical → `categories: ["developer-tools",
  "healthcare"]`. Values must match App Hub category slugs.

- **third_party_tool** — Optional. The tool being integrated (e.g. Salesforce,
  Epic). Omit for generic playbooks (e.g. "how to integrate with any CMS").

## Full submission process

This section walks through the PR-based submission from start to finish. Every
Playbook must meet the [Quality floor](#quality-floor) (six required README
sections and additional considerations). Each Playbook folder must include an
`APPHUB.yaml` that conforms to the [APPHUB.yaml metadata schema](#apphubyaml-metadata) above.

1. **Access and clone** — Clone this repository from GitHub. You need access to
   the repo (via the Cisco org or a fork, depending on how your team is set
   up). Clone the default branch (e.g. `main`).

2. **Create a branch** — Create a new branch using the naming convention
   `playbook/<tool-slug>` (e.g. `playbook/epic-ehr`). See [Branch naming](#branch-naming) below for details.

3. **Copy template and add content** — Copy the `PLAYBOOK_TEMPLATE` folder to
   `playbooks/<tool-slug>/` (e.g. `playbooks/epic-ehr`). The folder name must be
   kebab-case and match the third-party tool slug. Then:
   - Fill in the README with all six required sections per the [Quality floor](#quality-floor); add an architecture diagram under `diagrams/` and working code under `src/`.
   - Fill in `APPHUB.yaml` with all required fields per the [APPHUB.yaml metadata](#apphubyaml-metadata) schema.

4. **Open a pull request** — Push your branch and open a Pull Request against
   `main`. Complete the checklist in the [PR template](.github/pull_request_template.md). Ensure your `APPHUB.yaml` is complete before opening the PR.

5. **Automated validation** — When you open the PR, the **Validate Playbook**
   workflow runs and posts a comment on your PR with a validation report. See
   [What to expect from automated validation and review](#what-to-expect-from-automated-validation-and-review) for what is checked. If any check fails, fix the issues, push again, and wait for the workflow to pass. The PR cannot merge until validation passes.

6. **Human review** — After validation passes, a human reviewer performs a
   ~15-minute spot-check using the [review criteria](#review-criteria) below. You may receive change requests; respond by pushing additional commits to the same branch.

7. **After merge** — All playbooks in the repo are published at merge time via
   CI sync to ContentStack. The Playbook is featured on the Webex App Hub per
   the program process.

## PR Process

The following details support the [Full submission process](#full-submission-process) above.

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

## What to expect from automated validation and review

### Automated validation (CI)

When you open a PR, the **Validate Playbook** workflow runs (see
[.github/workflows/validate-playbook.yml](.github/workflows/validate-playbook.yml)). It runs only on the Playbook folders you changed and posts a **comment** on your PR with a checklist of results. The workflow checks:

- **Single playbook per PR** — PRs must touch only one playbook folder. If you change multiple playbooks, split into separate PRs.
- **README.md** — Exists and contains all six required section headers (Use Case Overview, Architecture, Prerequisites, Code Scaffold, Deployment Guide, Known Limitations); matching is case-insensitive.
- **APPHUB.yaml** — Exists; all required fields are present and non-empty; `product_types` is an array with at least one of `teams`, `meetings`, `calling`, `rooms`, `contact_center`; `categories` has at least one value.
- **Folders** — `diagrams/` and `src/` exist.
- **Folder name** — Playbook folder name is kebab-case (lowercase, hyphens only; e.g. `epic-ehr`, `servicenow`).

If any check fails, the workflow fails and the PR cannot merge. Fix the issues reported in the bot comment, push again, and the workflow will re-run. The comment is updated with the latest results.

### Human review

After automated validation passes, a human reviewer performs a ~15-minute spot-check using the [Review criteria](#review-criteria) in the PR Process section. They confirm that the code in src/ connects to a real Webex API, the deployment guide is followable, and there are no duplicate or disallowed integration targets. You may receive change requests; respond by pushing commits to the same branch. Human review complements (and is not replaced by) any automated checks.

### AI review pipeline

An AI review pipeline may be added in the future to provide additional feedback on quality floor adherence, API usage, or style. Any such checks will be documented here. Today, the Validate Playbook workflow and human spot-check are the only reviews that run on your PR.

## Style Guide

### Implementation Time

Include the estimated implementation time in the Use Case Overview. Use ranges
(e.g. "2–4 hours") and be realistic for someone familiar with the tools.

### API References

Webex API endpoint references must be **real and documented**. Link to official
Webex developer documentation. Do not reference unsupported or internal APIs.

## What NOT to Do

- **No multiple playbooks per PR** — Each PR must touch only one playbook
  folder. If you need to change multiple playbooks, open separate PRs. This
  keeps reviews focused and rollbacks clean.

- **No competitor tools as primary targets** — Do not build Playbooks where
  Genesys, NICE, Five9, or Talkdesk are the primary integration target. Webex
  integrations only.

- **No production-hardening claims** — Playbooks are implementation guides. Do
  not claim they are production-ready without additional hardening.

- **No undocumented APIs** — Only use Webex or approved 3rd-party APIs that are documented and supported. Internal or experimental endpoints are not allowed.
