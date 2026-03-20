# wxc_sdk — Python SDK for Webex APIs (Calling focus)

This Playbook is an **implementation guide** only. The **SDK, examples, and documentation** live in the canonical upstream repository: **[jeokrohn/wxc_sdk](https://github.com/jeokrohn/wxc_sdk)**. Install the published package from PyPI as **`wxc-sdk`** ([PyPI](https://pypi.org/project/wxc-sdk/)). **Do not expect a copy of the SDK in this folder** — clone or install from upstream and follow their docs; this Playbook adds Webex org setup, token handling pointers, and a reproducibility pin.

## Use Case Overview

Administrators and integrators who automate **Webex Control Hub** and **Webex Calling** tasks (users, locations, numbers, policies, and related APIs) often want a **typed, Python-native client** instead of hand-rolling every REST call. **[wxc_sdk](https://github.com/jeokrohn/wxc_sdk)** exposes a large surface of **documented Webex REST APIs** with emphasis on **Calling** endpoints, plus runnable **`examples/`** scripts for common operations.

**Target persona:** Python developers, collaboration engineers, and admins building internal tools, reports, or migrations against Webex.

**Estimated implementation time:** About **1–3 hours** to create a bot or personal access token with the right scopes, install the package, load credentials from environment, and run a first script (for example listing Calling-enabled users per upstream’s `examples/calling_users.py`).

## Architecture

Your Python process imports **`wxc_sdk`**, constructs a **`WebexSimpleApi`** (or other entry points documented upstream), and issues **HTTPS requests** to **Webex public REST APIs** ([developer.webex.com](https://developer.webex.com)). Authentication is **Bearer token**-based (typically **`WEBEX_ACCESS_TOKEN`** in a `.env` file for examples — see upstream `examples/.env (sample)`). No Webex-hosted runtime is required: this is a **client library** that runs where you run Python.

See [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md) for a component view.

## Prerequisites

- **Python** version compatible with the pinned **`wxc-sdk`** release (see upstream `pyproject.toml` `requires-python` for the ref you use).
- **pip** (or **uv**) to install **`wxc-sdk`** from PyPI, or a **git checkout** of upstream at the pinned tag/commit in [`src/README.md`](src/README.md).
- **Webex account** with permissions appropriate for the APIs you call (often **Control Hub** / admin scenarios require an **integration** or **bot** token with sufficient **scopes**).
- **Access token:** Create a **bot** or use an **OAuth integration** as required by your security model; upstream examples commonly use **`WEBEX_ACCESS_TOKEN`** via **`python-dotenv`**. See [Getting started — Webex Integration](https://developer.webex.com/docs/getting-started) and your org’s policies for token issuance and rotation.
- **Network:** Outbound **HTTPS** to `webexapis.com` (and any other hosts your chosen script uses).

## Code Scaffold

**Upstream** ([github.com/jeokrohn/wxc_sdk](https://github.com/jeokrohn/wxc_sdk)) provides:

| Area | Purpose |
| ---- | ------- |
| `wxc_sdk/` | Python package (APIs, models, Calling-focused helpers). |
| `examples/` | Sample scripts (e.g. Calling users, numbers, queues); includes **`.env (sample)`** for `WEBEX_ACCESS_TOKEN`. |
| `docs/` | Sphinx / Read the Docs sources; published at [wxc-sdk.readthedocs.io](https://wxc-sdk.readthedocs.io). |

**This repository** under `playbooks/wxc-sdk/src/` contains **only**:

- **`src/README.md`** — Canonical URL, **pinned git ref**, PyPI install line, **LICENSE** link, and explicit **no-vendoring** policy.
- **`env.template`** — Optional reminder for **Webex-side** variables used with the examples (aligned with upstream samples).

Runnable sample code is **not** duplicated here; obtain it from **upstream** at the pinned version.

## Deployment Guide

1. **Choose a version:** Use the **pinned ref** documented in [`src/README.md`](src/README.md) (recommended: PyPI **`wxc-sdk==<version>`** matching that tag, or `git checkout` that tag on upstream).
2. **Create a virtual environment** (recommended):  
   `python -m venv .venv && source .venv/bin/activate` (Unix) or `.venv\Scripts\activate` (Windows).
3. **Install the SDK** per [upstream README](https://github.com/jeokrohn/wxc_sdk/blob/master/README.rst):  
   `pip install wxc-sdk==<pinned-version>`  
   or install from a git checkout of upstream at the pinned commit.
4. **Install example helpers if needed:** Many scripts in `examples/` use **`python-dotenv`**; install it if not already present:  
   `pip install python-dotenv`.
5. **Obtain a Webex access token** with scopes required for the APIs you plan to call; store it securely. For local runs, copy upstream’s **`examples/.env (sample)`** pattern: set **`WEBEX_ACCESS_TOKEN`** (see also [`src/env.template`](src/env.template)).
6. **Clone or open upstream** only if you want to run **`examples/`** scripts from disk:  
   `git clone https://github.com/jeokrohn/wxc_sdk.git && cd wxc_sdk && git checkout <pinned-tag-or-commit>`  
   Then `cd examples` and run a script, e.g. `python calling_users.py`, after configuring `.env` per upstream.
7. **Verify:** Confirm a minimal call succeeds (for example listing people with Calling data) and adjust **scopes** if the API returns **403**.
8. **Read the docs:** Use [wxc-sdk.readthedocs.io](https://wxc-sdk.readthedocs.io) for API details beyond this Playbook.

## Known Limitations

- **Not a Cisco-maintained product:** This Playbook documents community/third-party tooling; **support** is via **upstream** ([issues](https://github.com/jeokrohn/wxc_sdk/issues)) and **Read the Docs**, not Webex Support for the SDK itself.
- **Version drift:** This guide may lag **upstream**; prefer **upstream CHANGELOG**, **tags**, and **docs** for breaking changes.
- **Upstream license:** [MIT License](https://github.com/jeokrohn/wxc_sdk/blob/master/LICENSE) — review for your compliance process.
- **Token security:** Do not commit tokens; rotate on leak; use least-privilege **scopes**; this Playbook does not replace your org’s secret management.
- **API limits:** Respect [Webex rate limits](https://developer.webex.com/docs/api/basics/rate-limiting) and error handling as documented on **developer.webex.com**.
- **Webex disclaimer:** This is an implementation guide, not a production readiness statement; validate in your environment.
