# Cisco UCM to Webex Calling Bulk Migration

This Playbook is adapted from the [migrationapi](https://github.com/jeokrohn/migrationapi) sample on GitHub, authored by Johannes Krohn.

---

## Use Case Overview

Enterprise telephony administrators migrating from Cisco Unified Communications Manager (UCM) to Webex Calling face a labor-intensive, error-prone challenge: replicating hundreds or thousands of user records by hand. This Playbook demonstrates an automated approach using the Cisco AXL SOAP API to read UCM user data and the Webex Calling SDK (`wxc_sdk`) to bulk-provision those users in Webex Calling.

**Target persona:** UCM administrator or UC engineer performing a full-org migration from on-premises UCM to Webex Calling cloud telephony.

**What it solves:** Eliminates manual user-by-user provisioning by automating the extract-transform-load (ETL) pipeline: read users and phone numbers from UCM, validate them against available Webex Calling licenses and numbers, and provision them asynchronously in bulk.

**Three tools are included:**

| Script | Purpose |
|---|---|
| `main.py` | Bulk-provision UCM users into Webex Calling with extensions, DIDs, and licenses |
| `export_to_csv.py` | Export any UCM database table to CSV for offline analysis |
| `read_gdpr.py` | Extract ILS-learned GDPR dial plan patterns from UCM for Webex Calling dial plan migration |

**Estimated implementation time:** 4–8 hours (includes UCM AXL setup, Webex Calling org preparation, and test run with `READONLY=True` before going live).

---

## Architecture

The integration operates in three layers:

1. **UCM AXL Layer** — The `ucm_reader` module uses the `ucmaxl` library (SOAP/zeep) to query UCM via the Administrative XML (AXL) API. It retrieves user records, phone assignments, and location data.
2. **Transform Layer** — `main.py` maps UCM user fields to Webex Calling equivalents: email address, display name, extension (last 4 digits of DID), and phone number (E.164).
3. **Webex Calling Provisioning Layer** — The `wxc_sdk` async client authenticates with the Webex API using a personal access token and provisions users, assigns calling licenses, and sets DIDs and extensions in parallel.

See the data flow diagram in [`/diagrams/architecture-diagram.md`](./diagrams/architecture-diagram.md).

Authentication occurs at two points:
- **UCM AXL:** HTTP Basic auth (`AXL_USER` / `AXL_PASSWORD`) over HTTPS to the UCM host
- **Webex Calling API:** Bearer token (`WEBEX_ACCESS_TOKEN`) obtained from [developer.webex.com](https://developer.webex.com)

---

## Prerequisites

### Webex Requirements
- A **Webex Calling** organization (Professional or Basic licenses available in sufficient quantity for the users being migrated)
- A Webex org administrator account with the ability to create users and assign licenses
- A **Webex personal access token** from [developer.webex.com](https://developer.webex.com/docs/api/getting-started) (valid for ~12 hours)
- Target phone numbers (DIDs) already added to the Webex Calling org and unassigned
- A Webex Calling **Location** created and named to match the UCM partition you intend to migrate (the sample targets a location named `SJC` — adjust `main.py` to match your environment)

### Cisco UCM Requirements
- Cisco UCM version 10.x or later with the **AXL SOAP API** enabled
- An AXL-enabled administrative user (`AXL_USER`) with at minimum read access to the `listUser`, `listPhone`, and AXL SQL query methods
- Network connectivity from the machine running the scripts to the UCM AXL endpoint (TCP 443 or 8443)
- UCM users must have:
  - A valid `mailid` (email address)
  - A `primaryExtension` whose pattern matches the user's `telephoneNumber` in +E.164 format

### Developer Environment
- **Python 3.10+** ([python.org](https://www.python.org))
- `pip` package manager
- A Python virtual environment (recommended: `venv` or `virtualenvwrapper`)
- The `ucmaxl` package (installed from a pinned GitHub commit — see `src/requirements.txt`)
- The `wxc-sdk` package (PyPI)

### Optional
- A Gmail account (`GMAIL_ID`) used to construct synthetic test email addresses during dry-run provisioning. In production, replace the `webex_email()` function in `main.py` with logic that returns real user email addresses.

---

## Code Scaffold

The source code lives in [`/src/`](./src/). It is sample code — not production-hardened — and is intended to demonstrate the core integration pattern. See [`/docs/upstream-overview.md`](./docs/upstream-overview.md) for the original upstream setup notes.

```
src/
├── main.py                     # Core migration: reads UCM users, provisions in Webex Calling
├── export_to_csv.py            # CLI: exports any UCM DB table to CSV via AXL SQL
├── read_gdpr.py                # CLI: exports ILS-learned dial plan patterns to CSV
├── ucm_reader/
│   ├── __init__.py             # UCMReader class — entry point for AXL data access
│   ├── base.py                 # AXLObject base class, ObjApi wrapper, zeep integration
│   ├── user.py                 # User model and UserApi (listUser AXL call)
│   ├── phone.py                # Phone model and PhoneApi
│   └── locations.py            # Location model and LocationApi
├── env.template                # All required environment variables with descriptions
└── requirements.txt            # Pinned dependencies including wxc-sdk
```

### What the code demonstrates

- **`main.py`** — Uses `asyncio` + `wxc_sdk.as_api.AsWebexSimpleApi` to provision users concurrently. Key workflow: validate token → read UCM users → filter by NPA → match available Webex Calling TNs and extensions → create Webex user → assign license + extension + DID. The `READONLY = True` flag at the top of the file prevents actual user creation until you are ready.
- **`export_to_csv.py`** — Accepts a UCM table name as a CLI argument and runs an AXL SQL query (`select * from <table>`) to dump the full table as CSV. Useful for auditing UCM data before migration.
- **`read_gdpr.py`** — Reads the `remoteroutingpattern` table from one or more UCM clusters (configured in `read_gdpr.yml`) and outputs a CSV of ILS-learned dial plan patterns normalized to Webex Calling wildcard format (`X`-only).
- **`ucm_reader/`** — A thin wrapper around `ucmaxl`/zeep that exposes typed Pydantic models for UCM Users, Phones, and Locations. Handles AXL batch pagination automatically when result sets are too large.

### What the code does NOT do

- It is not production-hardened. It contains no retry logic, circuit breakers, or structured error handling beyond basic logging.
- It does not automate phone number import into Webex Calling. Numbers must be pre-loaded in the Webex org.
- It does not migrate voicemail, call forwarding settings, or hunt group memberships.
- It does not handle UCM users without a `mailid` or a properly formatted `telephoneNumber`.
- The `webex_email()` function in `main.py` generates synthetic Gmail plus-addresses. Production deployments must replace this with real user email addresses.
- Secrets must be moved to a secrets manager for any production use.

---

## Deployment Guide

### Part 1 — Prepare the Webex Calling Environment

1. Log in to [Control Hub](https://admin.webex.com) as a Webex org administrator.
2. Confirm that your Webex Calling location exists and is named to match your intent (default in the sample: `SJC`). Navigate to **Calling > Locations** to verify or create it.
3. Confirm that all phone numbers (DIDs) you intend to assign are imported and **unassigned** in Control Hub. Navigate to **Calling > Phone Numbers** to verify.
4. Confirm you have sufficient Webex Calling Professional or Basic licenses. Navigate to **Account > Licenses**.

### Part 2 — Obtain a Webex Access Token

5. Navigate to [developer.webex.com](https://developer.webex.com) and sign in as the org administrator.
6. Click your avatar in the top-right corner, then select **My Webex Apps**. Scroll to the **Personal Access Token** section and click the copy icon to copy the token.
7. Note that this token is valid for approximately 12 hours. You must re-obtain it if it expires before the migration completes.

### Part 3 — Configure the UCM AXL Connection

8. Confirm that the AXL API is enabled on your UCM: in UCM Administration navigate to **System > Cisco Unified CM > AXL Web Service** and ensure it is activated on the publisher node.
9. Confirm your AXL user account has the **Standard AXL API Access** role in UCM (User Management > Application User or End User, depending on your UCM version).

### Part 4 — Set Up the Python Environment

10. Clone or download this playbook's `src/` directory to a local working directory.
11. Create and activate a Python 3.10+ virtual environment:
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate   # Windows: .venv\Scripts\activate
    ```
12. Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
    > **Note:** `requirements.txt` installs `ucmaxl` from a pinned GitHub commit. This requires internet access to GitHub. If your environment does not allow this, pre-download `ucmaxl` and install it manually.
13. Copy `env.template` to `.env` and fill in all values:
    ```bash
    cp env.template .env
    ```
    Edit `.env`:
    ```
    AXL_HOST=<your-ucm-publisher-hostname-or-ip>
    AXL_USER=<axl-enabled-user>
    AXL_PASSWORD=<axl-user-password>
    WEBEX_ACCESS_TOKEN=<token-from-step-6>
    GMAIL_ID=<your-gmail-id-for-test-addresses>
    ```

### Part 5 — Dry Run (READONLY mode)

14. Open `src/main.py` and confirm that `READONLY = True` (line ~16). This prevents any users from actually being created.
15. Adjust the location filter if your Webex Calling location is not named `SJC`. Find the line:
    ```python
    api.locations.list(name='SJC')
    ```
    and replace `'SJC'` with your location name.
16. If your users are in a different NPA, adjust the filter:
    ```python
    users = users_per_npa['+1408']
    ```
    Replace `'+1408'` with your NPA prefix (e.g. `'+1650'`).
17. Run the dry-run:
    ```bash
    python main.py
    ```
    Review the log output. The script will report:
    - How many calling licenses are available
    - Which users have matching Webex Calling TNs available
    - Which users have conflicting extensions
    - Any missing TNs

### Part 6 — Live Run

18. Once the dry-run output looks correct, open `main.py` and change:
    ```python
    READONLY = True
    ```
    to:
    ```python
    READONLY = False
    ```
19. Run the migration:
    ```bash
    python main.py
    ```
    Progress is logged to both the console and `main.log` in the same directory.
20. After completion, verify users in [Control Hub](https://admin.webex.com) under **Users**. Confirm extensions and DIDs are assigned correctly.

### Part 7 — Optional: Export UCM Table Data

21. To export any UCM database table to CSV for pre-migration analysis:
    ```bash
    python export_to_csv.py <tablename>
    # Example:
    python export_to_csv.py enduser
    ```
    Output is written to `<tablename>.csv` in the current directory. See the [UCM data dictionary](https://developer.cisco.com/docs/axl/) for table names.
    <!-- TODO: verify this step against your specific environment — table names vary by UCM version -->

### Part 8 — Optional: Export GDPR Dial Plan Patterns

22. Copy `read_gdpr.yml (sample)` to `read_gdpr.yml` and add your UCM cluster details:
    ```yaml
    - host: <ucm-host>
      user: <axl-user>
      password: <axl-password>
    ```
23. Run:
    ```bash
    python read_gdpr.py
    ```
    Output is written to `read_gdpr.csv`. Use this CSV to configure your Webex Calling dial plan.

---

## Known Limitations

### Authentication and Token Expiry
- The Webex personal access token obtained from developer.webex.com is valid for approximately **12 hours**. If the migration runs longer than this, the script will begin failing with authentication errors. For large migrations, consider implementing token refresh via an OAuth2 integration app or splitting the migration into batches.

### TLS Certificate Verification (Security)
- All three scripts connect to UCM with `verify=False`, which **disables TLS certificate verification**. This means the scripts will not detect a man-in-the-middle attack on the UCM AXL connection. Production deployments must set `verify=True` (or supply the UCM CA certificate path) in `ucm_reader/__init__.py`, `export_to_csv.py`, and `read_gdpr.py`.

### Input Validation (Security)
- `export_to_csv.py` constructs an AXL SQL query by interpolating the `--table` CLI argument directly into the query string without allow-list validation. An operator supplying a crafted table name could potentially exfiltrate unintended UCM database content. For production use, validate the table argument against a known list of UCM table names before executing.

### PII in Log Output (Security / Privacy)
- `main.py` logs user email addresses, phone numbers, display names, and location IDs to both the console and `main.log`. These are Personally Identifiable Information (PII). Production deployments must implement log redaction or structured logging with field-level masking before storing or forwarding logs.

### SOAP XML Security (Supply Chain)
- XML parsing is performed by the `zeep` library through `ucmaxl`. The upstream `ucmaxl` package is installed from a pinned GitHub commit SHA (`-e git+https://github.com/jeokrohn/ucmaxl@41fd647...`), not a versioned release. This means there is no semver guarantee. For production use, consider forking `ucmaxl` into your own registry or pinning a reviewed release.

### Scope of Migration
- This Playbook migrates **user identity, extension, and DID** only. It does not migrate:
  - Voicemail (Unity Connection mailboxes)
  - Call forwarding rules
  - Hunt group or call queue memberships
  - Shared lines or intercom
  - Phones or device configurations (only the user object is provisioned)

### Webex Calling Location
- The sample hardcodes the location name `SJC`. You must change this to match your org's Webex Calling location before running.

### Rate Limits
- The Webex Calling API enforces rate limits. The sample uses `concurrent_requests=PARALLEL_TASKS` (default: 10). If you encounter `429 Too Many Requests` errors, reduce `PARALLEL_TASKS` in `main.py`.

### No License Declared
- The upstream repository at [github.com/jeokrohn/migrationapi](https://github.com/jeokrohn/migrationapi) does not include a LICENSE file. Refer to the Webex Playbooks repository [`LICENSE`](../../LICENSE) for the terms under which this Playbook is distributed.

### Webex Disclaimer
This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly — including a full dry run with `READONLY = True` — before use in a production environment.
