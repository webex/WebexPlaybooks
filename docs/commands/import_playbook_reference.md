# import-playbook-reference — Core Instructions

This document is the single source of truth for the **reference-upstream** import
workflow: a Playbook that **points developers to an existing canonical repo**
(SDK, sample application, or multi-package project) **without vendoring** that
code into `playbooks/<slug>/src/`.

It is referenced by `.cursor/rules/import-playbook-reference.mdc` (Cursor) and
`.claude/commands/import-playbook-reference.md` (Claude Code). Do not duplicate
content between those files — edit here and both adapters pick up the change.

For the standard workflow that **copies** minimal integration code into `src/`,
see [import_playbook.md](import_playbook.md).

---

## Purpose

Produce a Webex Integration Playbook that is an **implementation guide** tied to
a **canonical upstream open source repository** (for example a Webex Calling
SDK). The Playbook lives in WebexPlaybooks; the **source of truth for the SDK or
sample app remains the upstream repo**. This repo **must not** repackage,
replace, or duplicate upstream trees (no full `packages/`, vendor dirs, or SDK
sources under `playbooks/<slug>/src/`).

The source repo may be a Webex-affiliated project (SDK, samples) or a
third-party tool — the same competitor and API rules apply as for the standard
import.

---

## When to use this workflow vs standard import

| Use **import_playbook_reference.md** when…                         | Use [import_playbook.md](import_playbook.md) when…        |
| ------------------------------------------------------------------ | ----------------------------------------------------------- |
| Upstream is the long-lived home for the SDK or app                 | You want a self-contained minimal sample in this repo       |
| Copying `src/` would duplicate a large or actively maintained tree | Copying a small, stable snippet into `src/` is appropriate  |
| Versioning and releases are owned upstream                         | The playbook is the primary place for the demo code         |

---

## Step 0 — Clone the source repo into the workspace

Same as [import_playbook.md — Step 0](import_playbook.md#step-0--clone-the-source-repo-into-the-workspace).

Parse the GitHub URL to extract `owner` and `repo`. Derive the slug from the repo
name: lowercase, kebab-case, strip any "webex-" or "cisco-" prefixes.

```bash
mkdir -p .import-playbook-cache
git clone --depth 1 https://github.com/<owner>/<repo>.git .import-playbook-cache/<slug>
```

If the clone fails, note the error and fall back to raw content URLs. Continue
with Step 1 either way.

---

## Step 1 — Read the source repo thoroughly

Same as [import_playbook.md — Step 1](import_playbook.md#step-1--read-the-source-repo-thoroughly).

Read README, docs, manifests, LICENSE, examples, and extract integration-relevant
facts. **Competitor tools:** If the source repo is primarily for Genesys, NICE,
Five9, or Talkdesk, stop and do not proceed.

---

## Step 2 — Determine the Playbook slug and APPHUB.yaml values

Same as [import_playbook.md — Step 2](import_playbook.md#step-2--determine-the-playbook-slug-and-apphubyaml-values)
(integration type mapping, `product_types`, `categories`, etc.).

Set `third_party_tool` (when applicable) to the SDK or product name as it appears
in upstream documentation.

---

## Step 3 — Create the Playbook folder and files

Create this structure:

```text
playbooks/<slug>/
├── README.md
├── APPHUB.yaml
├── diagrams/
│   └── architecture-diagram.md
└── src/
    ├── README.md          # required — upstream pointer and policy (see below)
    └── env.template       # optional — Webex / integration-only vars (see below)
```

### README.md

Write all **6 required sections** with real, substantive content. Differences
from the standard import:

#### Opening (immediately after the title)

State clearly that this Playbook is a **guide** and that the **implementation,
SDK, or sample application** lives in the **canonical upstream repository**.
Include a prominent link to `https://github.com/<owner>/<repo>` (and to a
published package registry entry if upstream ships an npm/PyPI/etc. package).
Example tone: "This Playbook documents how to use [Project](url) with Webex; **do
not expect a full copy of the SDK in this folder** — clone or install from
upstream."

#### ## Use Case Overview

Same goals as standard import, plus reinforce **where** developers get the code
(upstream) and **what** this Playbook adds (Webex-specific wiring, org setup,
checklist).

#### ## Architecture

Same as standard import — refer to `/diagrams/architecture-diagram.md`.

#### ## Prerequisites

Include everything from upstream docs **by reference** (link to their
prerequisites section where possible), plus Webex org/API/licensing requirements.

#### ## Code Scaffold

**Do not** describe this repo as containing a full port of upstream.

- Summarize the **upstream** repository layout (key folders, entry samples,
  package names).
- Explain what **this** repo’s `playbooks/<slug>/src/` contains: **only**
  `src/README.md` (required pointer) and optionally `env.template` for secrets
  or variables that are **not** documented upstream or that are **Webex-side**
  only.
- State explicitly that runnable sample code is obtained from upstream at the
  pinned version/ref you document in `src/README.md`.

#### ## Deployment Guide

Number every step. **Start** from obtaining upstream at a **specific ref** (tag,
commit, or released package version), then upstream’s install/build steps, **then**
Webex-specific configuration. Link to upstream README sections for commands you
do not duplicate.

#### ## Known Limitations

Include standard items from the standard import, and add **reference-specific**
items where relevant:

- **Version drift** — Playbook may lag upstream; readers should prefer upstream
  docs for API changes.
- **Upstream license** — Link to upstream LICENSE; note any copyleft or
  commercial-use constraints.
- Standard Webex disclaimer (same as [import_playbook.md](import_playbook.md)).

### APPHUB.yaml

Same rules as [import_playbook.md — APPHUB.yaml](import_playbook.md#apphubyaml).
`product_url` remains
`https://github.com/webex/WebexPlaybooks/tree/main/playbooks/<slug>`.

### diagrams/architecture-diagram.md

Same as standard import — Mermaid diagram with real Webex and tool/SDK names.

### src/ — **Reference only; do not vendor upstream**

**Forbidden in `playbooks/<slug>/src/`:**

- Copying SDK sources, `packages/*`, `vendor/`, generated artifacts, or full
  sample applications from `.import-playbook-cache/<slug>/`
- Replacing upstream with a “playbook fork” of the project

**Required:**

- **`src/README.md`** — Must include at minimum:
  - Canonical upstream URL (`https://github.com/<owner>/<repo>`)
  - Recommended **git ref or release** (tag/version) for reproducibility
  - How to consume upstream: e.g. `npm install <package>@<version>`, `git clone
    … && git checkout <tag>`, or documented submodule policy (prefer published
    packages when available)
  - Link to upstream **LICENSE**
  - Explicit sentence: **Source code for the SDK/sample is not duplicated in
    this Playbook repository; use the upstream repository (or published package)
    as the source of truth.**

**Optional:**

- **`env.template`** — Only if needed for **Webex-side** or **integration-only**
  variables not covered in upstream docs. If upstream already documents all env
  vars, omit this file and link to their env documentation from `src/README.md`
  and the Deployment Guide.

Do **not** add `main.<ext>` or other large copied sources solely to satisfy a
template; CI only requires that the `src/` **directory** exists.

---

## Step 4 — Run validation checks

Same as [import_playbook.md — Step 4](import_playbook.md#step-4--run-validation-checks).

```bash
./scripts/validate-playbook-local.sh playbooks/<slug>
```

---

## Step 5 — Report to the author

Same as [import_playbook.md — Step 5](import_playbook.md#step-5--report-to-the-author),
with one addition in the summary:

- **Upstream reference** — Confirm the canonical repo URL and pinned ref/version
  documented in `src/README.md`.

---

## Step 6 — Clean up the clone cache

Same as [import_playbook.md — Step 6](import_playbook.md#step-6--clean-up-the-clone-cache).

```bash
rm -rf .import-playbook-cache/<slug>
```

If the clone was skipped, this step is unnecessary.
