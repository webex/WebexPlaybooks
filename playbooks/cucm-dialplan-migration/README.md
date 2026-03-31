# CUCM to Webex Calling Dial Plan Migration

This Playbook is adapted from the [cisco_dialplan](https://github.com/jeokrohn/cisco_dialplan) sample on GitHub by Johannes Krohn.

---

## Use Case Overview

Organizations migrating from Cisco Unified Communications Manager (UCM) to Webex Calling must transfer dial plan patterns to maintain seamless PSTN routing. UCM deployments commonly accumulate hundreds or thousands of ILS-learned patterns across multiple remote catalogs. Recreating these manually in Webex Calling is error-prone and time-consuming.

This Playbook provides a three-step Python CLI toolchain for a **Webex Calling administrator or telephony migration engineer** to:

1. Extract ILS-learned dial patterns from a Cisco UCM cluster using the Thin AXL SOAP API.
2. Normalize those patterns into Webex Calling-compatible format, resolving conflicts between overlapping patterns.
3. Bulk-provision dial plans and patterns in Webex Calling via the official `wxc-sdk`, mapping each pattern catalog to a trunk or route group.

The toolchain handles deduplication, conflict resolution, and incremental reconciliation — adding only new patterns and removing obsolete ones on subsequent runs.

**Target persona:** Webex Calling administrator or telephony migration engineer with Python experience.

**Estimated implementation time:** 4–8 hours (environment setup, UCM AXL connectivity verification, OAuth flow, first provisioning run).

---

## Architecture

The integration operates as a three-stage offline pipeline run from an administrator workstation:

1. **Read stage** — `read_ucm.py` connects to Cisco UCM over HTTPS (port 8443) using the Thin AXL SOAP API. It queries the `remoteroutingpattern` and `remotecatalogkey` SQL tables to retrieve ILS-learned patterns and their associated remote catalogs. Output is written to `read_ucm.csv`.

2. **Normalize stage** — `normalize.py` reads the CSV, groups patterns by catalog, expands bracket notation (e.g. `+1[2-9]XXXXXXX`) into individual patterns, and resolves cross-catalog conflicts. Normalized output is written to `normalized.csv`.

3. **Provision stage** — `configure_wxc.py` reads the normalized CSV and `config.yml`. It authenticates with Webex Calling via an OAuth integration (managed by `wxc-sdk`), then idempotently creates or updates dial plans and their pattern assignments using the Webex Calling Premises PSTN API.

Authentication to Webex occurs via an OAuth 2.0 Authorization Code flow; tokens are cached in `config.yml` and auto-refreshed on subsequent runs. UCM access uses HTTP Basic Auth over HTTPS.

See the architecture diagram at [/diagrams/architecture-diagram.md](diagrams/architecture-diagram.md).

---

## Prerequisites

### Webex Requirements
- Webex Calling organization with **Location Administrator** or higher privileges
- A Webex Integration (OAuth app) created at [developer.webex.com](https://developer.webex.com) with the scope:
  `spark-admin:telephony_config_write spark-admin:telephony_config_read`
- At least one **Trunk** or **Route Group** already configured in Webex Calling (Premises PSTN) to serve as the route choice for each dial plan

### Cisco UCM Requirements
- Cisco UCM cluster with ILS (Intercluster Lookup Service) enabled
- An AXL API-enabled account on UCM (member of the **Standard AXL API Access** role)
- AXL SOAP endpoint reachable from the developer machine on port 8443: `https://<ucm-host>:8443/axl/`
- UCM version 9.x–14.x (WSDL bundles for these versions are included in `src/ucmaxl/WSDL/`)

### Developer Environment
- Python 3.10 or higher
- `pip` package manager
- Network access from the developer machine to both:
  - UCM AXL endpoint (`<ucm-host>:8443`)
  - Webex API endpoints (`webexapis.com`)

---

## Code Scaffold

The source code under `src/` is adapted from the upstream [cisco_dialplan](https://github.com/jeokrohn/cisco_dialplan) repository. It demonstrates the UCM-to-Webex Calling dial plan migration workflow. It is **not production-hardened** — error handling is minimal, and it is intended as a starting point for adaptation.

```
src/
├── read_ucm.py             # Stage 1: read ILS patterns from UCM via AXL → read_ucm.csv
├── normalize.py            # Stage 2: normalize patterns → normalized.csv
├── configure_wxc.py        # Stage 3: provision dial plans in Webex Calling
├── delete_dialplans.py     # Utility: delete dial plans listed in config.yml
├── config/
│   └── __init__.py         # Pydantic config model; OAuth token management via wxc-sdk
├── ucmaxl/
│   ├── __init__.py         # AXLHelper: thin SOAP wrapper for UCM AXL
│   └── WSDL/               # Bundled WSDL files for UCM versions 9.0–14.0
├── script/
│   └── build               # Shell helper to regenerate requirements.txt
├── requirements.txt        # Pinned Python dependencies
├── env.template            # Required environment variables (copy to .env)
└── config.yml.example      # Example dial plan mapping configuration
```

**What this code does NOT do:**
- It does not handle UCM certificate validation by default (see Known Limitations).
- It does not provide a web UI or API server — all operations are CLI-only.
- It does not migrate route patterns, translation patterns, or other UCM dial plan objects — only ILS-learned patterns from the `remoteroutingpattern` table.

Additional upstream workflow notes are in [docs/upstream-overview.md](docs/upstream-overview.md).

---

## Deployment Guide

### 1. Install Python 3.10+

Verify: `python3 --version`. Install from [python.org](https://www.python.org/downloads/) if needed.

### 2. Clone or download this Playbook

```bash
git clone https://github.com/webex/WebexPlaybooks.git
cd WebexPlaybooks/playbooks/cucm-dialplan-migration/src
```

### 3. Create a Python virtual environment and install dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3a. Run the smoketest

Verify the environment is set up correctly before touching any live systems. No UCM or Webex credentials are required.

```bash
bash script/smoketest
```

All checks should print `OK`. If any fail, fix the environment (Python version, missing packages) before continuing. The script cleans up all temporary files and bytecode cache on exit.

### 4. Create a Webex OAuth Integration

1. Navigate to [developer.webex.com/my-apps](https://developer.webex.com/my-apps) and click **Create a New App → Integration**.
2. Set the **Redirect URI** to `http://localhost:6001/redirect`.
3. Add scopes: `spark-admin:telephony_config_write` and `spark-admin:telephony_config_read`.
4. Copy the **Client ID** and **Client Secret**.

### 5. Configure environment variables

Copy `env.template` to `.env` in the `src/` directory and fill in all values:

```bash
cp env.template .env
```

Edit `.env`:

```
TOKEN_INTEGRATION_CLIENT_ID=<your-client-id>
TOKEN_INTEGRATION_CLIENT_SECRET=<your-client-secret>
TOKEN_INTEGRATION_CLIENT_SCOPES=spark-admin:telephony_config_write spark-admin:telephony_config_read
AXL_HOST=<ucm-hostname-or-ip>
AXL_USER=<ucm-axl-username>
AXL_PASSWORD=<ucm-axl-password>
```

> **Security:** Never commit `.env` to source control. It is listed in `.gitignore` by default.

### 6. Create `config.yml` from the example

```bash
cp config.yml.example config.yml
```

Edit `config.yml` to map each UCM remote catalog (identified by its `routestring` value) to a Webex Calling dial plan, trunk or route group. Leave the `tokens:` field empty — it will be populated automatically on first run.

<!-- TODO: verify the catalog identifiers in config.yml match the routestring values exported from your UCM. Run read_ucm.py first to discover them. -->

### 7. Read ILS patterns from UCM

```bash
python read_ucm.py
```

This queries UCM via AXL and writes patterns to `read_ucm.csv`. Review the output to identify catalog identifiers (the `remotecatalogkey_id` column maps to the UCM `routestring`).

### 8. Normalize patterns

```bash
python normalize.py read_ucm.csv > normalized.csv
```

Conflict resolution messages (if any) are printed to stderr. Review `normalized.csv` before proceeding.

### 9. Provision dial plans in Webex Calling

```bash
python configure_wxc.py normalized.csv
```

On first run a browser window opens for the OAuth authorization flow. After completing authorization, tokens are saved to `config.yml` automatically. Subsequent runs reuse and auto-refresh the saved tokens.

The script is **idempotent** — running it again only adds new patterns and removes patterns no longer present in the CSV.

### 10. (Optional) Delete dial plans

To remove all dial plans referenced in `config.yml`:

```bash
python delete_dialplans.py
```

<!-- TODO: verify step against your specific environment before use in production -->

---

## Known Limitations

- **TLS certificate validation disabled by default for UCM:** `read_ucm.py` passes `verify=False` to the AXLHelper, disabling UCM certificate verification. This is a security risk in production environments. To enable certificate verification, install the UCM CA certificate and set `verify='/path/to/ca-bundle.pem'` in `read_ucm.py`.
- **ILS patterns only:** Only patterns from the `remoteroutingpattern` table (ILS-learned numeric patterns and E.164 patterns) are migrated. Route patterns, translation patterns, and other dial plan objects are not handled.
- **Rate limits:** The Webex Calling Premises PSTN API enforces per-organization rate limits. The `configure_wxc.py` script batches pattern modifications in groups of 200, but very large deployments may encounter `429 Too Many Requests` responses.
- **Token expiry:** Webex OAuth tokens expire after 14 days if unused. The `config/__init__.py` module auto-refreshes tokens using the stored refresh token. If the refresh token also expires, re-run the OAuth flow by deleting the `tokens` block from `config.yml`.
- **Python 3.10 required:** The upstream code uses structural pattern matching and union type hints that require Python 3.10+. Tested on Python 3.10–3.13; requires updated `requirements.txt` pins (included) on Python 3.12+.
- **UCM versions:** Bundled WSDL files cover UCM versions 9.0–14.0. For other versions the AXLHelper will attempt to download the WSDL directly from UCM.
- **License:** The upstream project is licensed under the MIT License. See [`../../LICENSE`](../../LICENSE) for the Webex Playbooks repository license.
- **Webex disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
