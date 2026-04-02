# Auto Leave Unwanted Webex Spaces

This Playbook is adapted from the [auto_leave](https://github.com/jeokrohn/auto_leave) sample on GitHub.

## Use Case Overview

Administrators and power users in organizations that rely on **Webex messaging** sometimes get flooded with **spaces** created by bots or automations (alerts, incident feeds, or app notifications). Those spaces still appear in the messaging experience until someone manually hides or leaves them.

This playbook shows a **Python** utility that listens for **real-time conversation events**, checks the **space title** against a **block list** of regular expressions, and—when you enable it in `auto_leave.yml`—**hides** direct (1:1) spaces and/or **leaves** group spaces. With the sample defaults (`hide_direct` and `leave_group_spaces` both `false`), a matching title only produces log lines; set at least one of those flags to `true` before the app will call the Memberships API to change your membership.

**Target persona:** Developer or IT admin comfortable with Python, OAuth integrations, and running a small long-lived process (desktop, VM, or container).

**Estimated time to implement:** 2–4 hours for integration setup, first successful auth, and tuning block-list patterns.

## Architecture

The sample runs a single **async** process (`auto_leave.py`). It uses **wxc-sdk** to complete **OAuth** for a Webex integration and caches **access** (and refresh) tokens in a local YAML file. It registers a **desktop-style device** with **Webex Device Manager (WDM)** and opens the **WebSocket** URL returned for that device. Incoming frames that describe **conversation.activity** events are deserialized; the handler only continues for verb **`post`** or **`add`** (when **`add`** is about you being added to the space), and skips events where **you** are the actor. It then loads the **space** via the **Rooms** API and tests its title against the configured regex list. When a title matches the block list, for **direct** spaces the sample updates membership **`is_room_hidden`** only if **`hide_direct: true`**; for **group** spaces it deletes your membership only if **`leave_group_spaces: true`**. Both default to **`false`** in code and in the sample YAML.

Authentication happens during **OAuth** (browser redirect to **localhost:6001** by default) and on **token refresh** in the background. The WebSocket and **WDM** registration use infrastructure aimed at **desktop clients** (see Known Limitations); **Rooms** and **Memberships** updates use **webexapis.com** REST.

See the sequence diagram in [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md).

## Prerequisites

- **Webex**
  - A user account in a Webex org with access to **messaging** and **spaces**.
  - Ability to create an **integration** at [Webex for Developers](https://developer.webex.com) (admin consent may be required for some orgs).
  - Redirect URI `http://localhost:6001/redirect` registered on the integration (matches the sample code).
  - OAuth scopes sufficient for the sample: typical patterns include **memberships** (read/write), **rooms**, **people** (read), and **devices** (read/write) for WDM registration—mirror what the upstream sample documents for your build of **wxc-sdk**.
- **Developer machine or host**
  - **Python 3.9+** and **pip**, or **Docker** / **Docker Compose** if you use the bundled files under `src/`. Dependencies are pinned in `src/requirements.txt` and have been **`pip install` tested on Python 3.13**; on older Pythons, run the same command locally to confirm your environment resolves cleanly.
  - Outbound **HTTPS** to Webex APIs and the WDM host used in code (`https://wdm-a.wbx2.com`).
  - **Port 6001** reachable locally for the OAuth redirect handler when you first authorize.
- **Network**
  - No inbound public URL is required beyond **localhost** for OAuth during setup; the WebSocket is **outbound** from your host.

## Code Scaffold

| Path | Purpose |
|------|---------|
| [src/auto_leave.py](src/auto_leave.py) | Main **asyncio** app: WDM device lifecycle, WebSocket loop, block-list logic, **Memberships** / **Rooms** calls. |
| [src/auto_leave.yml.sample](src/auto_leave.yml.sample) | Example **YAML** config: `hide_direct`, `leave_group_spaces`, logging flags, and `blocked` regex strings. Copy to `auto_leave.yml` next to the script when running. |
| [src/env.template](src/env.template) | **Environment variable** reference for **OAuth** (`INTEGRATION_*`). Copy to `.env` or export in your shell. |
| [src/requirements.txt](src/requirements.txt) | Pinned Python dependencies including **wxc-sdk**. |
| [src/Dockerfile](src/Dockerfile) | Optional container build using `requirements.txt`. |
| [src/docker-compose.yml](src/docker-compose.yml) | Optional **bind mount** of `./` into `/app` and **port 6001** published for OAuth. |

The code does **not** implement enterprise secret storage, high availability, or detailed audit logging. **Group** space leaving is **off** by default because it is **irreversible** without a new invitation.

## Deployment Guide

1. **Create a Webex integration** at [developer.webex.com](https://developer.webex.com): note the **Client ID** and **Client Secret**, set **Redirect URI** to `http://localhost:6001/redirect`, and assign the scopes your org allows (align with the sample and **wxc-sdk** expectations).
2. **Clone this repository** (or copy `playbooks/auto-leave-spaces/src/` to your workspace).
3. **Create Python environment** (optional but recommended): `cd playbooks/auto-leave-spaces/src && python3 -m venv .venv && source .venv/bin/activate` (on Windows use `.venv\Scripts\activate`).
4. **Install dependencies:** `pip install -r requirements.txt`
5. **Optional smoke test (no Webex credentials):** copy `auto_leave.yml.sample` to `auto_leave.yml` and run `python auto_leave.py` without a `.env` file. The process should exit with code **1** after printing a short message on **stderr** starting with `Error: missing integration credentials` and listing the three `INTEGRATION_*` variables—no Python traceback. That confirms imports, dependency resolution, and config load all ran before OAuth.
6. **Configure secrets:** copy `env.template` to `.env` and set `INTEGRATION_CLIENT_ID`, `INTEGRATION_CLIENT_SECRET`, and `INTEGRATION_SCOPES` (space-separated scope list matching your integration—not placeholder secrets).
7. **Configure block list:** if you have not already, ensure `auto_leave.yml` exists in the **same working directory** you will run from (copy from `auto_leave.yml.sample`); edit `blocked` regexes and set **`hide_direct`** and/or **`leave_group_spaces`** as needed (both **`false`** means log-only on a match). Keep `leave_group_spaces: false` until you understand the impact of leaving group spaces.
8. **First run (interactive OAuth):** from `src/`, run `python auto_leave.py`. When prompted, open the logged **authorization URL**, sign in, and approve; tokens are written to `auto_leave_tokens.yml` beside the script.
9. **Verify behavior:** ensure `hide_direct` and/or `leave_group_spaces` is `true` as appropriate, then trigger a **`post`** (or an **`add`** that adds you) in a test space whose title matches a block pattern; confirm the app **hides** the direct space or **leaves** the group space when that flag is on.
10. **Docker alternative:** from `src/`, `docker compose up --build`. Complete OAuth in a browser on the same host so **localhost:6001** reaches the container-published port. Ensure `auto_leave.yml`, `.env`, and token/cache files either live in the mounted directory or are added before start.

## Known Limitations

- **WDM and WebSocket behavior** are relied on for parity with desktop client event delivery; this pathway may change and is **not** marketed as a supported public integration surface—treat as a **reference** and monitor behavior after platform updates.
- **OAuth tokens** are stored in a **local YAML** file; protect the host filesystem and prefer a proper secret store for any production derivative.
- **Rate limits** and **org policies** may block device registration or membership updates; retry and backoff in the sample are best-effort only.
- **Leaving group spaces** cannot be undone automatically; you must be re-invited.
- **License:** This playbook vendors sample code derived from an upstream project; your obligations depend on that project's license—see the original repository. This repository's distribution terms are under [LICENSE](../../LICENSE).
- This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
