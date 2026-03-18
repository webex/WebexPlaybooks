# Webex BYODS Manager Integration

This Playbook is adapted from the [Webex BYODS Manager](https://github.com/WebexSamples/webex-byods-manager) sample on GitHub.

## Use Case Overview

Webex Bring Your Own Data Source (BYODS) lets organizations register their own data endpoints so Webex can push or pull contextual data—for example, for agent screen pop in Contact Center or rich context in Teams spaces. Managing these data sources and keeping their tokens valid can be tedious when done manually.

This Playbook shows how to integrate with the **Webex Admin API** to manage BYODS programmatically: list and view data sources, register new ones, update configurations, and extend data source tokens (including quick extension without changing other settings). It is aimed at **developers and admins** who need to operate BYODS at scale or automate token refresh. A realistic implementation time is **2–4 hours** for local use, or **half a day** if you add AWS Lambda for scheduled token extension.

## Architecture

The integration is between your automation (local Python scripts or an AWS Lambda function) and the **Webex Admin API**. You authenticate with a **Webex Service App** that has `spark-admin:datasource_read` and `spark-admin:datasource_write`. The Service App token is obtained using a Personal Access Token (or, for production, an OAuth integration with `spark:applications_token`). Your code calls the Data Source APIs (`/v1/dataSources`, `/v1/dataSources/schemas`) to list, register, update, and extend tokens. Optionally, credentials are stored in **AWS Secrets Manager** and a **Lambda** function runs on a schedule (e.g., hourly) to extend tokens without manual intervention.

For a visual summary of the flow, see the diagram in [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md).

## Prerequisites

- **Webex**
  - A Webex organization where you have admin or developer access.
  - A **Webex Service App** with:
    - `spark-admin:datasource_read` (list/view)
    - `spark-admin:datasource_write` (register, update, extend tokens)
  - A way to obtain tokens for that Service App:
    - **Quick start:** Personal Access Token from [developer.webex.com](https://developer.webex.com) (expires every 12 hours).
    - **Production / Lambda:** An Integration with `spark:applications_token` and OAuth refresh (see [TOKEN_MANAGEMENT.md](src/TOKEN_MANAGEMENT.md) in `src/`).

- **Your environment**
  - Python 3.6+.
  - `pip install -r src/requirements.txt` (or use a virtual environment as in the Deployment Guide).

- **Optional (AWS Lambda)**
  - AWS account, AWS CLI (optional), and OAuth already set up for the Service App token flow so Lambda can run unattended.

- **Network**
  - Outbound HTTPS to `webexapis.com` (and, if using Lambda, to AWS APIs).

## Code Scaffold

The `src/` folder contains the core scripts from the source repo:

- **`data-sources.py`** — Main menu-driven tool: list data sources, view/update, register new, quick extend token, refresh list. Uses `TokenManager` for Service App token refresh on 401.
- **`extend_data_source.py`** — CLI to extend a single data source token by ID (e.g. for cron or Lambda).
- **`token_manager.py`** — Loads config (local `token-config.json` or AWS Secrets Manager in Lambda), validates/refreshes personal token via OAuth, and fetches Service App tokens; used by both scripts.
- **`refresh_token.py`** — Standalone script to test fetching a fresh Service App token.
- **`get_service_app_token.py`** — Prints a fresh Service App token to stdout (e.g. for scripting).
- **`lambda_function.py`** — AWS Lambda entry point for scheduled token extension (reads `DATA_SOURCE_ID`, `SECRET_NAME`, optional `TOKEN_LIFETIME_MINUTES` from environment).
- **`token-config.json.template`** — Template for local credentials; copy to `token-config.json` and fill in (never commit `token-config.json`).
- **`env.template`** — Lists required configuration keys as environment variables; for production, use env vars or a secrets manager instead of storing secrets in files.

The code demonstrates calling the Webex Data Source APIs and handling token expiry with retry. It is **not** production-hardened (e.g. minimal retries, no circuit breakers). All secrets must be supplied via configuration or environment and must not be hardcoded.

## Deployment Guide

1. **Clone or copy** the contents of `playbooks/byods-manager/src/` to a directory on your machine (e.g. `byods-manager`).

2. **Create a Python virtual environment** (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate   # Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create token configuration:**
   - Copy `token-config.json.template` to `token-config.json`.
   - Edit `token-config.json` with your Service App credentials (`serviceApp`: `appId`, `clientId`, `clientSecret`, `targetOrgId`) and token manager credentials (`tokenManager`: `personalAccessToken`; for OAuth add `oauthClientId`, `oauthClientSecret`, `oauthRefreshToken`). See `src/TOKEN_MANAGEMENT.md` for details.

5. **Run the main manager:**
   ```bash
   python data-sources.py
   ```
   Use the menu to list data sources, view/update, register new, or use "Quick Extend Token" for a single data source.

6. **Extend a single data source from the command line:**
   ```bash
   python extend_data_source.py <data_source_id> [token_lifetime_minutes]
   ```
   Example: `python extend_data_source.py 85895e47-3096-4c47-aae8-f5a52f7b7870 1440` (1440 = 24 hours, max allowed).

7. **Optional — AWS Lambda for scheduled extension:**  
   Package the project (including `token_manager.py`, `lambda_function.py`, and dependencies), create a secret in AWS Secrets Manager with the same structure as `token-config.json`, set Lambda env vars `DATA_SOURCE_ID`, `SECRET_NAME`, and optionally `TOKEN_LIFETIME_MINUTES`, and attach an EventBridge schedule. Full steps are in the source repo’s `deploy/AWS_SETUP.md`; copy the `deploy/` folder from the [webex-byods-manager](https://github.com/WebexSamples/webex-byods-manager) repo if you need the packaging script and detailed AWS instructions.

## Known Limitations

- **Token lifetime:** Data source tokens can be set for up to **1440 minutes (24 hours)**. The scripts and Lambda extend within this limit; for longer validity you must re-extend on a schedule.
- **Service App token:** Obtained via Personal Access Token (expires ~12 hours) or OAuth. For unattended Lambda, OAuth refresh is required; see TOKEN_MANAGEMENT.md.
- **Admin API only:** This Playbook uses the documented Webex Admin Data Source APIs only; no internal or undocumented APIs are used.
- **License:** The sample code is provided under the Cisco Sample Code License. See this repository’s [LICENSE](../../LICENSE) for the Webex Playbooks license; the original sample license is in the source repo.
- **Webex disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
