# import-playbook — Core Instructions

This document is the single source of truth for the import-playbook command.
It is referenced by both `.claude/commands/import-playbook.md` (Claude Code) and
`.cursor/rules/import-playbook.mdc` (Cursor). Do not duplicate content between those
files — edit here and both adapters pick up the change.

---

## Purpose

Convert an existing open source application into a Webex Integration Playbook — an
implementation guide that shows how to integrate a third-party tool with Webex
programmability (Teams, Meetings, Calling, Rooms, Contact Center).

The source repo is an existing open source project, NOT a Webex project. The goal is
to produce a Playbook that teaches a Webex developer how to integrate with it.

---

## Step 0 — Clone the source repo into the workspace

Parse the GitHub URL to extract `owner` and `repo`. Derive the slug from the repo
name: lowercase, kebab-case, strip any "webex-" or "cisco-" prefixes.

Run a shallow clone into the workspace cache (avoids many raw content fetches):

```bash
mkdir -p .import-playbook-cache
git clone --depth 1 https://github.com/<owner>/<repo>.git .import-playbook-cache/<slug>
```

The clone path is `.import-playbook-cache/<slug>/`. All source files are now local.

If the clone fails (e.g. private repo, network error), note the error and fall back to
fetching individual files via raw content URLs. Continue with Step 1 either way.

---

## Step 1 — Read the source repo thoroughly

Read the following from the cloned repo at `.import-playbook-cache/<slug>/` (or fetch
via raw URLs if the clone was skipped):

- README.md (or README.rst / README.txt if no .md exists)
- Any docs/ or documentation/ folder contents
- package.json, setup.py, pyproject.toml, or equivalent manifest (for dependencies,
  description, homepage)
- Any existing API reference, openapi.yaml, swagger.json, or similar
- LICENSE file
- Any existing integration guides, examples/, or sample/ folders
- CHANGELOG or releases page if accessible

From this reading, extract:

- What the tool does and who it is for
- What APIs or webhooks it exposes that are relevant to a Webex integration
- What authentication method it uses (OAuth, API key, JWT, etc.)
- What prerequisites a developer would need (accounts, licenses, API access, environment)
- What is the most natural Webex integration pattern: Teams bot, Meeting automation,
  Calling analytics, WxCC screen pop, Rooms/device integration, etc.
- Which Webex product(s) does this integrate with (Teams, Meetings, Calling, Rooms,
  Contact Center)?
- Any rate limits, known limitations, or deprecation notices in the docs
- The license type (important for the Known Limitations section)

If a file cannot be read, note it and continue — do not stop.

---

## Step 2 — Determine the Playbook slug and APPHUB.yaml values

Derive the folder slug from the repo name: lowercase, kebab-case, strip any "webex-"
or "cisco-" prefixes (this is a third-party tool).

Make your best determination of:

- `categories` — App Hub category slugs. Include verticals (e.g. `healthcare`,
  `financial-services`, `retail-ecommerce`) and app categories (e.g. `developer-tools`,
  `productivity`, `recording-transcriptions`) as appropriate. At least one required.
- `product_types` — derive from integration type (see mapping below). Valid values:
  `teams`, `meetings`, `calling`, `rooms`, `contact_center`
- `app_context` — derive from integration type (see mapping below). Valid values:
  `space`, `in_meeting`, `call`, `device`, `contact_center`, `sidebar`, `mcp`, `a2a`
- `estimated_implementation_time` — realistic estimate based on auth flow and API
  surface complexity

**Integration type mapping:**

| Integration type       | product_types    | app_context                                       |
| ---------------------- | ---------------- | ------------------------------------------------- |
| Contact Center (WxCC)  | `contact_center` | `["contact_center", "sidebar"]`                   |
| Teams (Messaging)      | `teams`          | `["space"]` (add `mcp` or `a2a` if applicable)    |
| Meetings               | `meetings`       | `["in_meeting"]`                                  |
| Calling                | `calling`        | `["call"]`                                        |
| Rooms / Devices        | `rooms`          | `["device"]`                                      |

---

## Step 3 — Create the Playbook folder and files

Create the following structure:

```text
playbooks/<slug>/
├── README.md
├── APPHUB.yaml
├── diagrams/
│   └── architecture-diagram.md
└── src/
    ├── main.<ext>
    └── env.template
```

### README.md

Write all 6 required sections with real, substantive content drawn from your research.

Do not leave placeholder text where you have enough information to write real content.
Use `<!-- TODO: [specific instruction] -->` comments only where human judgment is
genuinely required.

#### ## Use Case Overview

Describe what this integration does for a Webex user or admin. Lead with the business
outcome, not the technical mechanism. Include who this is for (target persona) and a
realistic estimated implementation time. Make it concrete — describe the moment in a
workflow where this tool adds value.

**Source attribution:** Add a line at the top of the README (after the title) crediting
the original repo, e.g. "This Playbook is adapted from the [Project Name](https://github.com/owner/repo) sample on GitHub."

#### ## Architecture

Describe the integration architecture in prose, then refer to the Mermaid diagram in
/diagrams/architecture-diagram.md. Explain which Webex component(s) are involved, how
data flows between Webex and the third-party tool, and where authentication occurs.

#### ## Prerequisites

Exhaustive list based on source repo docs:

- Webex requirements (product license, API access, org type — e.g. WxCC org, Webex org
  with Teams)
- Third-party tool requirements (account type, API access level, paid tier
  requirements)
- Developer environment (language runtime, package manager, etc.)
- Network/firewall requirements if the tool requires inbound webhooks

#### ## Code Scaffold

Introduce the source code, explain what it demonstrates, and note what it does NOT do
(not production-hardened, minimal error handling, secrets must move to environment
variables). Reference the files in /src/.

#### ## Deployment Guide

Step-by-step instructions written for the target persona. Number every step. Each step
is a single action with the exact command, UI path, or configuration value where known.
Use `<!-- TODO: verify this step against your specific environment -->` only where
environment-specific values are unavoidable.

#### ## Known Limitations

Based on source repo docs:

- Any rate limits from the third-party API
- Authentication token expiry / refresh requirements
- Any deprecated endpoints noticed
- License constraints (note the open source license type and commercial use implications).
  Reference the playbook repo's LICENSE (e.g. `[LICENSE](../../LICENSE)`) rather than the
  source repo's license.
- Standard Webex disclaimer: "This Playbook is provided as a starting point. Webex does
  not guarantee the functional accuracy of the source code. Test thoroughly before use
  in a production environment."

### APPHUB.yaml

Use the full schema from PLAYBOOK_TEMPLATE/APPHUB.yaml. Derive from the source repo:

- `friendly_id` — slug + `-playbook` (e.g. folder `meetings-exporter` →
  `meetings-exporter-playbook`) to reduce App Hub name collisions with actual integrations
- `title` — `{ThirdPartyTool} + Webex {Product} Integration`
- `tag_line` — one-line value proposition (required, max 128 chars)
- `description` — 1–2 sentences for App Hub listing
- `product_types` — from integration type mapping (Step 2)
- `app_context` — from integration type mapping (Step 2)
- `categories` — default `["productivity", "developer-tools"]`; include verticals
  (healthcare, financial-services, retail-ecommerce) and app categories as appropriate
- `company_name`, `company_url`, `support_url`, `product_url`, `privacy_url`, `logo` — use
  defaults from template
- `third_party_tool` (optional), `estimated_implementation_time` — from Step 2

**APPHUB.yaml ordering for validation:** The CI validation uses `grep -A 10` and `grep -A 20`
to parse `product_types` and `app_context`. If these sections are adjacent to other list
sections (e.g. `categories`), the grep can capture items from the wrong section and fail
validation. Add 8+ blank lines between `product_types` and `app_context`, or place them
so that no other `  - ` list items appear within the next 10–20 lines after each key.

### diagrams/architecture-diagram.md

Write a Mermaid sequence or flowchart diagram showing the integration data flow. Use
real Webex component names and the actual tool name. Show:

- The trigger event (incoming call, agent action, flow execution, message event, etc.)
- The API call(s) between Webex and the third-party tool
- Where authentication occurs
- The response back to the agent, flow, or user

Wrap in a ```mermaid code block.

### src/

Choose the language based on what the source repo uses (match their SDK language if
they publish one). Default to Node.js if no clear preference. If the source repo is
primarily documentation or config (e.g. no clear runtime), default to Node.js for
Webex SDK compatibility.

If the repo was cloned in Step 0, copy and adapt relevant files from
`.import-playbook-cache/<slug>/` into `playbooks/<slug>/src/` rather than writing from
scratch. Extract the minimal integration logic needed for the Playbook.

The source code must:

- Authenticate with the third-party tool API using the method documented in the source
  repo
- Perform the primary action of the integration (fetch a record, create a ticket, push
  an event, etc.)
- Use environment variables for ALL secrets and configuration — never hardcode
- Include a comment block at the top explaining what the code does, what it does NOT
  do, and what environment variables must be set

Use the tool's existing SDK or client library if one exists — do not use raw HTTP calls
when an SDK is available.

Include `.env.example` or `env.template` listing all required environment variables with
descriptive comments. (Some orgs prefer `env.template` to avoid dotfile limitations.)

---

## Step 4 — Run validation checks

After creating all files, verify the Playbook would pass the repo's automated checks:

```bash
# Check all 6 required README section headers exist
for section in "Use Case Overview" "Architecture" "Prerequisites" "Code Scaffold" "Deployment Guide" "Known Limitations"; do
  grep -qi "## $section" "playbooks/<slug>/README.md" \
    && echo "✓ $section" \
    || echo "✗ MISSING: $section"
done

# Check APPHUB.yaml has no empty required fields
grep -v -E "^(third_party_tool|submission_date):" "playbooks/<slug>/APPHUB.yaml" | grep ': ""' \
  && echo "✗ Empty APPHUB.yaml fields found above" \
  || echo "✓ All required APPHUB.yaml fields populated"

# Check friendly_id ends with -playbook
grep -E "^friendly_id:" "playbooks/<slug>/APPHUB.yaml" | grep -q '\-playbook"$' \
  && echo "✓ friendly_id ends with -playbook" \
  || echo "✗ friendly_id must end with -playbook"

# Check diagrams and src folders exist
[ -d "playbooks/<slug>/diagrams" ] && echo "✓ diagrams/ exists" || echo "✗ diagrams/ missing"
[ -d "playbooks/<slug>/src" ] && echo "✓ src/ exists" || echo "✗ src/ missing"
```

Fix any failures before finishing.

---

## Step 5 — Report to the author

Output a summary covering:

1. **What was created** — list all files with their paths
2. **Confidence levels** — for each major README section, note:
   - High: substantive content written from source repo docs
   - Medium: reasonable inferences made, should be verified
   - Low: TODOs left because information was not available
3. **TODOs requiring human input** — numbered list of every `<!-- TODO -->` comment,
   extracted and listed for easy action
4. **Fields to complete in APPHUB.yaml** — remind the author to review
   `categories` determinations
5. **Suggested next steps** — review architecture diagram for accuracy,
   run the code against a real Webex sandbox, then open a PR using the branch naming
   convention: `playbook/<slug>`

Do not open a PR or create a branch — leave that to the author.

---

## Step 6 — Clean up the clone cache

Remove the cloned repo from the workspace so it does not persist on the user's machine:

```bash
rm -rf .import-playbook-cache/<slug>
```

If the clone was skipped (fallback to raw URLs), this step is unnecessary.
