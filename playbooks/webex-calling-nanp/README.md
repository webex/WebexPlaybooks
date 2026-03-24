# NANP translation pattern automation (Webex Calling)

This Playbook is adapted from the [wxc_nanp](https://github.com/jeokrohn/wxc_nanp) sample on GitHub.

## Use Case Overview

In parts of the United States, carriers expect **called-party numbers** sent to the PSTN to use **different digit lengths** depending on whether a destination is **home-NPA local**, **foreign-NPA local**, or **toll**. This sample helps Webex Calling administrators **provision location-level translation patterns** so local calls can be **normalized** before routing to a premises gateway (for example via an **EDP** with a matching pattern).

The included Python script, for a given **NPA/NXX**, derives required patterns using **public exchange data** and applies them through **Webex Calling APIs** (via `wxc-sdk`). **Estimated implementation time:** 2–4 hours (Python environment, Webex token or service app, locate WxC location name, first dry run with `--readonly`).

**Target persona:** Webex Calling admins or voice engineers who manage **dial plans** and **translation patterns** for PSTN access.

## Architecture

1. **Data:** The script queries [localcallingguide.com](https://www.localcallingguide.com/) (XML) to determine which NPA/NXX prefixes are **local** to a gateway NPA/NXX.
2. **Computation:** It builds `TranslationPattern` objects (matching and replacement rules) consistent with that topology.
3. **Webex:** It authenticates with a **user access token** (`WEBEX_TOKEN`) or a **service app** (`SERVICE_APP_*`), then uses **async** `wxc-sdk` calls to **list**, **create**, **update**, or **delete** location-scoped translation patterns named `TP_xxxxx`.

Authentication never belongs in source control: use `src/env.template` and a local `.env` (gitignored). Service-app tokens may be **cached** in `local_tp.yml` in the working directory (also gitignored).

See the [architecture diagram](diagrams/architecture-diagram.md) for a concise flow.

## Prerequisites

- **Webex Calling** org with permissions to manage **call routing / translation patterns** for a **location** you can name exactly as it appears in Control Hub.
- **API access:** Either a suitable **access token** for Webex Calling APIs, or a **Webex Integration** (service app) with **client ID**, **client secret**, and **refresh token** as used by the script (`SERVICE_APP_*` variables).
- **Python:** 3.10+ recommended (features used align with modern Python; match your environment to `requirements.txt`).
- **Network:** Outbound HTTPS to `webexapis.com` (and related Webex API hosts), and to `https://www.localcallingguide.com/` for prefix lookup.
- **Operational:** Know the **NPA** and **NXX** for the gateway site and the **WxC location name** for `--location`.

## Code Scaffold

- **`src/local_tp.py`** — CLI that fetches local prefix data, computes patterns, and provisions WxC translation patterns (or runs read-only / pattern-only modes). Uses `wxc-sdk`, `requests`, `python-dotenv`, and optional on-disk token cache.
- **`src/requirements.txt`** — Pinned dependencies (includes `wxc-sdk`).
- **`src/env.template`** — Variables for `WEBEX_TOKEN` or service-app credentials; copy to `.env` locally.
- **`src/.gitignore`** — Ignores `.env` and `local_tp.yml` cache.

This is a **focused automation sample**, not a full production service: limited error UX, **external website dependency** for numbering data, and operators must **validate** patterns against carrier and dial-plan requirements.

## Deployment Guide

1. **Clone or open** this Playbook and `cd` into `playbooks/webex-calling-nanp/src`.
2. **Create a virtual environment** (recommended): `python3 -m venv .venv` then `source .venv/bin/activate` (macOS/Linux) or `.venv\Scripts\activate` (Windows).
3. **Install dependencies:** `pip install -r requirements.txt`.
4. **Configure credentials:** Copy `env.template` to `.env` and set `WEBEX_TOKEN`, **or** `SERVICE_APP_CLIENT_ID`, `SERVICE_APP_CLIENT_SECRET`, and `SERVICE_APP_REFRESH_TOKEN` per your integration.
5. **Discover your location name** in Webex Control Hub (must match `--location` exactly).
6. **Dry run (patterns only, no token):** `python local_tp.py --patternsonly --npa <NPA> --nxx <NXX>` to inspect generated patterns.
7. **Read-only API pass:** `python local_tp.py --readonly --npa <NPA> --nxx <NXX> --location "<Location Name>"` to compare against existing `TP_*` patterns without writes.
8. **Apply changes:** Remove `--readonly` when ready; re-run the same command to create/update/delete patterns as printed in the task list.
9. **Optional:** Pass `--token` instead of `.env` for one-off runs: `python local_tp.py --npa ... --nxx ... --location "..." --token "<access_token>"`.

## Known Limitations

- **External data:** Prefix logic depends on **localcallingguide.com** availability, format, and accuracy; there is no SLA from this Playbook.
- **Rate limits:** Neither the upstream script nor this Playbook documents Webex API rate limits; use **readonly** passes and avoid tight loops in automation.
- **Tokens:** Access tokens **expire**; service-app flow uses refresh and caches tokens in `local_tp.yml` — protect that file like a secret.
- **Upstream license:** The [original repository](https://github.com/jeokrohn/wxc_nanp) did not include a `LICENSE` file at import time; confirm terms with the author before redistribution beyond this sample.
- This Webex Playbooks repository’s **[LICENSE](../../LICENSE)** applies to Playbook scaffolding (README, APPHUB, diagrams).
- **Webex disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
