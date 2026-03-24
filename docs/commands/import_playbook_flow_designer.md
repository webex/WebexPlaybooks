# import-playbook-flow-designer — Core Instructions

This document is the single source of truth for the **import-playbook-flow-designer**
command. It is referenced by `.cursor/rules/import-playbook-flow-designer.mdc` (Cursor).
For generic third-party app imports, see [import_playbook.md](import_playbook.md). For
reference-only playbooks (no vendored `src/`), see
[import_playbook_reference.md](import_playbook_reference.md).

---

## Purpose

Create a Webex Integration Playbook whose `playbooks/<slug>/src/` contains a **vendored
copy** of one **top-level subdirectory** from a GitHub repository of Webex Contact
Center **Flow Designer** sample assets (flow definitions, README, diagrams, exported
configuration, etc.).

The “subset” is **the chosen folder** under the repo root—not the entire repository.
Each run must identify that folder by name.

---

## Parameters (required and optional)

| Parameter | Required | Description |
| --------- | -------- | ----------- |
| `<source-directory>` | **Yes** | Top-level directory name under the cloned repo (e.g. `ai-agent-autonomous`). This is **not** hardcoded; any valid folder name the repo contains may be used on subsequent runs. |
| GitHub repo URL | No | Defaults to `https://github.com/WebexSamples/webex-contact-center-flows.git`. Use a fork or alternate URL when needed. |
| `<slug>` (playbook folder) | No | Defaults to `<source-directory>` normalized to kebab-case. Override if the folder name would collide or is unsuitable for `playbooks/<slug>/`. |

Parse `owner` and `repo` from the GitHub URL. Derive **`<repo-slug>`** from `repo`:
lowercase, kebab-case (typically the repo name, e.g. `webex-contact-center-flows`).

---

## Step 0 — Clone the source repo into the workspace

Run a shallow clone into the workspace cache:

```bash
mkdir -p .import-playbook-cache
git clone --depth 1 https://github.com/<owner>/<repo>.git .import-playbook-cache/<repo-slug>
```

The clone path is `.import-playbook-cache/<repo-slug>/`.

If the clone fails (private repo, network error, wrong URL), note the error. Do not
proceed with copy steps until the clone exists or the user provides access. Raw-URL
fallback is impractical for multi-file flow trees; prefer fixing clone access (HTTPS,
VPN, fork).

---

## Step 1 — Read the selected sample directory

Verify that this path exists:

```text
.import-playbook-cache/<repo-slug>/<source-directory>/
```

If it does not exist, stop and report clearly (wrong `<source-directory>` name, wrong
branch, or repo layout changed).

Read thoroughly:

- Any `README*` in that directory or parent repo (for context)
- All files under `<source-directory>/` (flows, JSON, XML, images, etc.)
- Root `LICENSE` in `.import-playbook-cache/<repo-slug>/` if present

Extract:

- What the sample demonstrates (voice vs digital, AI agent, routing, etc.)
- Prerequisites stated in README (WxCC org, licenses, Flow Designer access)
- Import or deployment steps if documented
- Any limitations or product availability notes

**Competitor tools:** If the repository is primarily for Genesys, NICE, Five9, or
Talkdesk as the integration target, stop and explain that those are not allowed as
primary targets per project policy. Do not proceed.

---

## Step 2 — Determine the Playbook slug and APPHUB.yaml values

- **Folder slug:** Use explicit `<slug>` from the message if provided; otherwise use
  `<source-directory>` as-is when it is already kebab-case and valid; normalize if
  needed (lowercase, kebab-case, no leading/trailing hyphens).
- **Default integration profile:** Webex Contact Center + Flow Designer samples.

Use the integration mapping from [import_playbook.md](import_playbook.md) (Step 2). For
typical WxCC flow samples:

- `product_types`: include `contact_center`
- `app_context`: include `contact_center` and `sidebar` unless the sample clearly targets
  a different surface

Set `categories`, `estimated_implementation_time`, and `tag_line` (max 128 characters)
from the sample’s scope and README.

---

## Step 3 — Create the Playbook folder and files

Create:

```text
playbooks/<slug>/
├── README.md
├── APPHUB.yaml
├── diagrams/
│   └── architecture-diagram.md
└── src/
    └── (full recursive copy of <source-directory>/ contents — preserve paths)
```

Optional: `src/env.template` — only if the sample documents environment variables or
API keys that operators must configure. If the sample is purely flow/config assets
with no secrets pattern, omit `env.template`. Do not invent variables.

### README.md

Write all **six** required sections (same headers as
[PLAYBOOK_TEMPLATE/README.md](../../PLAYBOOK_TEMPLATE/README.md)). Follow the README
guidance in [import_playbook.md](import_playbook.md) (Step 3), adapted for Flow Designer:

- **Use Case Overview:** Business outcome, persona, estimated implementation time.
  Credit the upstream sample, e.g. “This Playbook bundles assets from
  [`<owner>/<repo>`](https://github.com/<owner>/<repo>) …”
- **Architecture:** WxCC, Flow Designer, and any AI/agent components; point to
  `diagrams/architecture-diagram.md`.
- **Prerequisites:** WxCC org, admin access, any AI agent or feature flags noted upstream.
- **Code Scaffold:** Describe **files under `/src/`** (flow exports, configs, docs). It
  is acceptable that there is no `main.js` — state what each type of asset is for.
- **Deployment Guide:** Numbered steps to import or apply flows in Control Hub / Flow
  Designer using these files, aligned with upstream README when available.
- **Known Limitations:** Upstream caveats, license pointer to this repo’s
  [`LICENSE`](../../LICENSE), and the standard Webex disclaimer from
  [import_playbook.md](import_playbook.md).

### APPHUB.yaml

Follow [import_playbook.md](import_playbook.md) APPHUB section: copy comment structure
from [PLAYBOOK_TEMPLATE/APPHUB.yaml](../../PLAYBOOK_TEMPLATE/APPHUB.yaml), substitute
values. Set `product_url` to this Playbook’s path in WebexPlaybooks:
`https://github.com/webex/WebexPlaybooks/tree/main/playbooks/<slug>` (adjust if org
fork).

### diagrams/architecture-diagram.md

Mermaid diagram: caller or digital entry → WxCC flow → Flow Designer activities (e.g.
AI agent) → outcomes (handled, escalated). Use names from the sample.

### src/ — Copy the sample tree

Recursively copy **everything** under:

```text
.import-playbook-cache/<repo-slug>/<source-directory>/
```

into:

```text
playbooks/<slug>/src/
```

Preserve inner directory structure and filenames (same principle as
[import_playbook.md](import_playbook.md) Step 3 `src/`).

After copy, scan for accidental secrets (long tokens, private keys). Redact or replace
with placeholders and document in `env.template` only where operators must supply
values.

**Runtime code:** Flow Designer samples may not include executable integration code. Do
not add a fake `main.js` solely to satisfy a template; the README **Code Scaffold**
explains the assets. If the sample *does* include scripts, keep secrets in environment
variables per repository policy.

---

## Step 4 — Run validation checks

Do **not** run validation automatically. Output the command for the author:

```bash
./scripts/validate-playbook-local.sh playbooks/<slug>
```

---

## Step 5 — Report to the author

Same reporting structure as [import_playbook.md](import_playbook.md) Step 5 (what was
created, confidence, TODOs, APPHUB review, suggested next steps, branch naming
`playbook/<slug>`). Do not open a PR unless the author asks.

---

## Step 6 — Clean up the clone cache

Remove the clone used for this import:

```bash
rm -rf .import-playbook-cache/<repo-slug>
```

---

## Troubleshooting

- **Empty or missing path after clone:** Confirm `<source-directory>` matches a
  top-level folder on the default branch (often `main`). Listing the repo root in the
  clone helps.
- **Unreachable GitHub repo:** Verify URL, authentication, and that the sample is
  public or that credentials are configured for `git clone`.
