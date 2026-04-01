# UCM AXL Inventory Export for Webex Calling Migration Planning

This Playbook is adapted from the [ucmaxl](https://github.com/jeokrohn/ucmaxl) library on GitHub, authored by Johannes Krohn.

---

## Use Case Overview

Before migrating from Cisco Unified Communications Manager (UCM) to Webex Calling, telephony administrators need a complete picture of what exists in their UCM cluster: every phone, its model, firmware version, primary directory number, device pool, and whether it is currently registered. Without this inventory, migration planning is guesswork — administrators discover missing numbers, unsupported device models, or unregistered phones only after cutover.

This Playbook demonstrates how to use the `ucmaxl` Python library to query UCM device and phone data directly via the AXL SOAP API and Informix SQL interface, then cross-reference each device's primary directory number against the Webex Calling Numbers API. The output is a CSV audit report that maps every UCM phone to its Webex Calling readiness status — a practical starting point for scoping a migration.

**Target persona:** UCM administrator or UC engineer preparing a pre-migration inventory of an on-premises UCM cluster before transitioning to Webex Calling.

**What it solves:** Eliminates manual per-device checking by automating the full device inventory export and Webex Calling number cross-reference in a single Python script.

**Estimated implementation time:** 2–4 hours (includes UCM AXL setup and a first report run).

---

## Architecture

The integration operates in two layers:

1. **UCM AXL Layer** — `main.py` uses the `ucmaxl` library's `AXLHelper.sql_query()` method to run direct Informix SQL queries against the UCM database via the AXL SOAP `executeSQLQuery` API. This returns phone records (name, model, firmware load, device pool, primary DN) and registration state from the `device`, `devicenumplanmap`, `numplan`, `registrationdynamic`, and `typemodel` tables.

2. **Webex Calling Numbers Layer** — `main.py` calls `GET /v1/telephony/config/numbers` (Webex Calling Numbers API) using a personal access token to retrieve all phone numbers provisioned in the Webex Calling org. It then compares each UCM device's primary DN against this list to classify it as `MATCH`, `NO_MATCH`, or `NO_DN`.

The result is written to `ucm_device_audit.csv`.

See the data flow diagram in [`/diagrams/architecture-diagram.md`](./diagrams/architecture-diagram.md).

Authentication occurs at two points:

- **UCM AXL:** HTTP Basic auth (`UCM_USER` / `UCM_PASSWORD`) over HTTPS (port 8443) to the UCM publisher node
- **Webex Calling API:** Bearer token (`WEBEX_ACCESS_TOKEN`) obtained from [developer.webex.com](https://developer.webex.com)

---

## Prerequisites

### Webex Requirements

- A **Webex Calling** organization with at least one location configured
- A Webex org administrator account
- A **Webex personal access token** from [developer.webex.com](https://developer.webex.com/docs/api/getting-started) (valid for ~12 hours)
- Phone numbers already imported into the Webex Calling org (even unassigned numbers are visible via the Numbers API)

### Cisco UCM Requirements

- Cisco UCM version 10.x or later with the **AXL SOAP API** enabled on the publisher node
- An AXL-enabled administrative user with at minimum read access to AXL SQL query methods (`executeSQLQuery`)
- Network connectivity from the machine running the script to the UCM AXL endpoint (TCP 443 or 8443)

### Developer Environment

- **Python 3.10+** ([python.org](https://www.python.org))
- `pip` package manager
- A Python virtual environment (recommended: `venv`)
- The `ucmaxl` package (installed from a pinned GitHub commit — see `src/requirements.txt`)
- The `requests` package (for the Webex API call)

---

## Code Scaffold

The source code lives in [`/src/`](./src/). It is sample code — not production-hardened — and is intended to demonstrate the core integration pattern. Upstream library notes are in [`/docs/upstream-overview.md`](./docs/upstream-overview.md).

```
src/
├── main.py                  # Core script: queries UCM phones, cross-references Webex Calling numbers
├── ucmaxl/
│   └── __init__.py          # ucmaxl AXLHelper library (copied from upstream)
├── env.template             # All required environment variables with descriptions
└── requirements.txt         # Pinned dependencies
```

### What the code demonstrates

- **UCM device inventory via AXL SQL** — `main.py` uses `AXLHelper.sql_query()` to join the `device`, `devicenumplanmap`, `numplan`, `registrationdynamic`, and `typemodel` tables, extracting one row per phone with its model name, firmware load, primary DN, device pool, and registration state.
- **Webex Calling Numbers API** — `main.py` calls `GET /v1/telephony/config/numbers` with pagination to retrieve all numbers provisioned in the Webex Calling org.
- **Cross-reference and CSV export** — For each UCM phone, the script checks whether the primary DN matches a Webex Calling number and assigns a `webex_status` of `MATCH`, `NO_MATCH`, or `NO_DN`. Results are written to `ucm_device_audit.csv`.

### What the code does NOT do

- It is not production-hardened. There is no retry logic, circuit breakers, or structured error handling beyond basic logging.
- It does not provision or modify any data in UCM or Webex Calling — it is read-only.
- It does not export hunt groups, call queues, voicemail, or call forwarding rules.
- TLS certificate verification for UCM is disabled by default (`verify=False`). Production use must supply the UCM CA certificate or set `verify=True`.
- The Webex Calling DN matching is pattern-based (last N digits of the UCM DN vs. the Webex Calling subscriber number). Production deployments may need to adapt the matching logic to account for site codes, prefixes, or E.164 normalization.
- Secrets must be moved to a secrets manager for any production use.

---

## Deployment Guide

### Part 1 — Obtain a Webex Access Token

1. Navigate to [developer.webex.com](https://developer.webex.com) and sign in as a Webex org administrator.
2. Click your avatar in the top-right corner and copy the **Personal Access Token**. This token is valid for approximately 12 hours.

### Part 2 — Configure the UCM AXL Connection

3. Confirm that the AXL API is enabled on your UCM publisher: in UCM Administration navigate to **Cisco Unified Serviceability > Tools > Service Activation** and verify that **Cisco AXL Web Service** is activated.
4. Confirm your AXL user account has the **Standard AXL API Access** role (User Management > Application User or End User, depending on your UCM version).

### Part 3 — Set Up the Python Environment

5. Clone or download this playbook's `src/` directory to a local working directory.
6. Create and activate a Python 3.10+ virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   ```
7. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   > **Note:** `requirements.txt` installs `ucmaxl` from a pinned GitHub commit. This requires internet access to GitHub.
8. Copy `env.template` to `.env` and fill in all values:
   ```bash
   cp env.template .env
   ```
   Edit `.env`:
   ```
   UCM_HOST=<your-ucm-publisher-hostname-or-ip>
   UCM_USER=<axl-enabled-user>
   UCM_PASSWORD=<axl-user-password>
   WEBEX_ACCESS_TOKEN=<token-from-step-2>
   ```

### Part 4 — Run the Audit

9. Run the script:
   ```bash
   python main.py
   ```
   Progress is logged to the console. The script will:
   - Connect to UCM and query device inventory via AXL SQL
   - Fetch all Webex Calling numbers via the Numbers API
   - Write `ucm_device_audit.csv` to the current directory

10. Open `ucm_device_audit.csv` in Excel or any CSV viewer. The columns are:

    | Column | Description |
    |--------|-------------|
    | `device_name` | UCM device name (e.g. `SEP001122334455`) |
    | `description` | UCM device description |
    | `model` | Phone model name (e.g. `Cisco 8841`) |
    | `firmware_load` | Active firmware load string |
    | `device_pool` | UCM device pool the phone belongs to |
    | `primary_dn` | Primary directory number (extension) |
    | `registration_state` | `Registered`, `Unregistered`, or `Unknown` |
    | `webex_status` | `MATCH` (DN found in Webex Calling), `NO_MATCH`, or `NO_DN` |

### Part 5 — Interpreting the Report

11. **`MATCH`** rows: the UCM phone's primary DN corresponds to a number already provisioned in Webex Calling. These are strong migration candidates — the number infrastructure is already in place.
12. **`NO_MATCH`** rows: the DN exists in UCM but not yet in Webex Calling. These numbers must be ported or added to the Webex Calling org before users can be migrated.
13. **`NO_DN`** rows: the device has no primary line assignment in UCM. These are often conference room phones, lobby phones, or decommissioned devices. Investigate before including in migration scope.
14. **`Unregistered`** devices: phones that are not currently communicating with UCM. Consider whether these devices are in scope for migration or can be decommissioned.
    <!-- TODO: verify this step against your specific environment — DN matching logic may need adjustment for your dial plan -->

---

## Known Limitations

### TLS Certificate Verification (Security)

The script connects to UCM with `verify=False` by default, which disables TLS certificate validation. This means the connection will not detect a man-in-the-middle attack. Production deployments must set `verify=True` (or pass the UCM CA bundle path) when constructing `AXLHelper`.

### AXL SQL Access Required

The `executeSQLQuery` AXL method requires the user account to have the **Standard AXL API Access** role in UCM. Read-only AXL roles that exclude SQL query access will not work with this script.

### DN Matching Logic

The Webex Calling Numbers API returns numbers in E.164 format (e.g. `+14085551234`). The UCM DN may be a 4-digit extension. The default matching logic in `main.py` compares the last `len(dn)` digits of each Webex Calling number's `subscriberNumber` field against the UCM DN. This heuristic works for simple single-site deployments but may produce false matches or misses in multi-site deployments with overlapping extensions. Adapt the `match_dn()` function in `main.py` to your dial plan.

### Large Clusters

For UCM clusters with more than ~2,000 devices, `AXLHelper.sql_query()` automatically batches queries using `skip/first` pagination. This may increase run time. The Webex Calling Numbers API is also paginated (max 1,000 per page); `main.py` handles this automatically.

### Webex Access Token Expiry

The personal access token from developer.webex.com expires after approximately 12 hours. If the script fails mid-run with a 401 error, re-obtain the token and re-run.

### No License Declared

The upstream `ucmaxl` repository at [github.com/jeokrohn/ucmaxl](https://github.com/jeokrohn/ucmaxl) does not include a LICENSE file. Refer to the Webex Playbooks repository [`LICENSE`](../../LICENSE) for the terms under which this Playbook is distributed.

### Webex Disclaimer

This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
