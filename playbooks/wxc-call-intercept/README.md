# Webex Calling Call Intercept Management

This Playbook is adapted from the [wxc_call_intercept](https://github.com/jeokrohn/wxc_call_intercept) sample on GitHub.

## Use Case Overview

Administrators and developers need a quick, scriptable way to **read** whether **call intercept** is enabled for a **Webex Calling** user and to **turn it on or off** without opening Control Hub for every change. This Playbook provides a minimal **Python** CLI that uses the **wxc_sdk** against documented **Webex** person-settings APIs. It is aimed at **IT admins**, **integration developers**, and **partners** automating user telephony settings. **Estimated implementation time:** 1–2 hours (integration app or token setup, Python environment, first successful run).

## Architecture

The sample runs **locally** as a command-line script. It authenticates with a **Webex access token** (CLI argument, `WEBEX_ACCESS_TOKEN`, or **OAuth** via integration credentials and a localhost redirect), resolves the target user by **email** with the **People** API, then calls **person settings → call intercept** to **read** the current state and optionally **configure** intercept on or off. Authentication and REST traffic go to **Webex** cloud endpoints; no separate third-party service is involved. For a sequence view of token acquisition, user lookup, and intercept read/update, see [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md).

## Prerequisites

- **Webex organization** with **Webex Calling** licensed for the target users.
- **API access** sufficient to:
  - List people by email and read `personId` (People API).
  - Read and update **call intercept** person settings for those users (scopes must match your chosen auth path—typically an **admin** or **integration** with the appropriate **spark** scopes; align with your integration or token documentation).
- One of the following **authentication** approaches:
  - A valid **access token** passed as `--token` or in `WEBEX_ACCESS_TOKEN`, **or**
  - A **Webex Integration** with **Client ID**, **Client Secret**, and **scopes** configured; the sample uses OAuth with redirect `http://localhost:6001/redirect` and persists tokens to a local YAML file next to the script.
- **Developer environment:** **Python 3** (3.8+ recommended) and **pip**.
- **Network:** Outbound **HTTPS** to Webex API hosts; for OAuth, local browser access to **localhost:6001** during token acquisition.
- **Compliance:** Only run against users and orgs you are authorized to administer.

## Code Scaffold

Under **`src/`**:

| File | Purpose |
|------|---------|
| `call_intercept.py` | CLI: `user_email` plus optional `on`/`off`; reads intercept state; updates if `on` or `off` is supplied. |
| `env.template` | Copy to `.env` (or export variables) for **OAuth** integration parameters. |
| `requirements.txt` | Pinned Python dependencies (including **wxc-sdk**) for a reproducible install. |

The script demonstrates **WebexSimpleApi**, **People** listing, and **person_settings.call_intercept** **read**/**configure**. It does **not** provide production logging, retries, bulk operations, secure token storage, or Control Hub UI parity. **Secrets** belong in **environment variables** or your secret manager—not in source control.

## Deployment Guide

1. **Clone this repository** (or copy `playbooks/wxc-call-intercept/src/`) to your machine.
2. **Create a Python virtual environment** (recommended): `python3 -m venv .venv && source .venv/bin/activate` (on Windows, `.venv\Scripts\activate`).
3. **Install dependencies:** from `playbooks/wxc-call-intercept/src/`, run `pip install -r requirements.txt`.
4. **Choose authentication:**
   - **Option A — Existing token:** Obtain an access token with scopes that allow people lookup and call intercept person settings. Export `WEBEX_ACCESS_TOKEN` or pass `--token <token>`.
   - **Option B — Integration OAuth:** In [Webex for Developers](https://developer.webex.com), create an **Integration** with redirect URI **`http://localhost:6001/redirect`**. Copy **`src/env.template`** to **`.env`** in your working directory (or set exports) and fill `TOKEN_INTEGRATION_CLIENT_ID`, `TOKEN_INTEGRATION_CLIENT_SECRET`, and `TOKEN_INTEGRATION_CLIENT_SCOPES`.
5. **Run from the directory containing your `.env`** (if using OAuth): `python call_intercept.py <user@example.com>` to print `on` or `off`.
6. **Update intercept:** `python call_intercept.py <user@example.com> on` or `... off` to set intercept and print confirmation.
7. **Debug REST traffic (optional):** add `-d` / `--debug` for verbose logging.

## Known Limitations

- **Rate limits** and throttling apply per **Webex** API policy; the sample does not implement backoff or batching.
- **Access tokens expire**; refresh or re-run OAuth as appropriate. Token cache is a **local YAML** file—**not** suitable for shared or production systems without hardening.
- The upstream sample repository did not include a **`LICENSE`** file in the checked-out tree; confirm license terms on the [source repository](https://github.com/jeokrohn/wxc_call_intercept) before redistribution. This Playbook’s use is also subject to the playbook repository [LICENSE](../../LICENSE).
- **SDK and API versions** may change; validate behavior after upgrading **wxc-sdk**.
- This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
