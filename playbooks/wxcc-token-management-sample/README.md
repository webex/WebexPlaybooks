# Webex Contact Center token management sample Playbook

This Playbook is adapted from the [token-app-sample](https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/token-management-samples/token-app-sample) in the Webex Contact Center API samples repository on GitHub.

## Use Case Overview

Integrations that call **Webex Contact Center** or **Webex platform APIs** from **Flow Designer** (or other server-side callers) need a **durable access token** without embedding long-lived secrets in the flow. This sample shows a small **Node.js** service that **refreshes OAuth tokens** on a schedule, **stores** them in **SQLite**, and exposes a **guarded HTTP endpoint** so only expected callers can retrieve the current access token.

**Target persona:** WxCC developers or integration engineers comfortable running Node locally or on a small VM, configuring OAuth client credentials, and aligning HTTP headers with Flow Designer egress rules.

**Estimated implementation time:** 2–4 hours (register or reuse an Integration, complete browser OAuth at `/login` or set `REFRESH_TOKEN`, configure environment variables, align `SOURCE_IP` with your datacenter, verify refresh logs and `GET /api/token`).

This is **not** the same pattern as the [service-app-token-getter](../service-app-token-getter/README.md) Playbook, which targets **Webex Service Apps** and **Teams-oriented** OAuth and webhooks.

## Architecture

You run an **Express** server (`src/server.js`) that registers **`GET /api/token`**. Callers must send headers validated in `src/auth.js`: `Content-Type: application/json`, `Accept: application/json`, `x-organization-id` matching `ORG_ID`, `x-from` matching `FROM`, `x-api-phrase` matching `PASSPHRASE`, and a source IP matching `SOURCE_IP` (Flow Designer egress per [Webex Contact Center security settings](https://help.webex.com/en-us/article/3srgv1/Security-Settings-for-Webex-Contact-Center)). On success, the server returns **only** `access_token`, `token_type`, and `expires_in` (not the refresh token or full DB row).

For **initial tokens**, **`GET /login`** redirects the browser to Webex authorize; **`GET /auth/webex/callback`** exchanges the `code` for tokens and **upserts** row `id=1` in SQLite (see `src/routes/oauth.js`). **`src/scheduler/scheduler.js`** runs at startup and on a **fixed interval** (default **10 hours** in code). It posts to **`https://webexapis.com/v1/access_token`** with **`grant_type=refresh_token`**, using **`CLIENT_ID`**, **`CLIENT_SECRET`**, and a **refresh token read from the database first**, then **`REFRESH_TOKEN`** from the environment if the DB has none. Results are persisted through **`src/service/tokenService.js`**.

See the [architecture diagram](diagrams/architecture-diagram.md) for the Flow Designer, Express, OAuth, and database flow.

## Prerequisites

- **Webex Contact Center**–enabled org and permission to create or use a **Webex Integration** (client ID and secret) with scopes appropriate for the APIs you will call after obtaining a token.
- **Redirect URI** registered on the Integration: `{BASE_URL}/auth/webex/callback`, matching **`REDIRECT_URI`** in `.env`. Use **`OAUTH_SCOPES`** (space-separated) aligned with that Integration. Alternatively, seed a **refresh token** via another OAuth flow and set **`REFRESH_TOKEN`** until you complete browser login.
- **Org ID** for `ORG_ID` (Control Hub or developer portal); must match the org of the user who signs in at `/login` when using authorization-code tokens.
- **Node.js** 18+ recommended and **npm**.
- **Network:** Callers of `GET /api/token` must reach your service; for Flow Designer, configure **`SOURCE_IP`** to match documented egress addresses for your region.
- **Optional:** [Contact Center developer sandbox](https://developer.webex.com/create/docs/sandbox_cc) for learning.

## Code Scaffold

Runnable code lives under **`src/`**:

- **`server.js`** — Express app, `GET /api/token`, `cookie-parser`, mounts OAuth routes, loads `dotenv` at startup.
- **`routes/oauth.js`** — `GET /login`, `GET /auth/webex/callback` (Webex authorization-code flow).
- **`auth.js`** — Header checks that gate access to the token endpoint.
- **`scheduler/scheduler.js`** — Interval job and refresh call to Webex OAuth token URL.
- **`service/tokenService.js`** — Sequelize helpers to read and upsert the token row.
- **`models/Token.js`** — Token model (single-row sample, `id` 1).
- **`db/db.js`** — Sequelize connection; default **SQLite** file `./db/db.sqlite` (override with `DB_STORAGE` / `DB_DIALECT` in `.env` if you extend the sample).
- **`package.json`** — Dependencies include `express`, `cookie-parser`, `sequelize`, `sqlite3`, `axios`, `toad-scheduler`, `dotenv`.
- **`env.template`** — Required variables; copy to **`.env`** in **`src/`** (do not commit secrets).

This is **sample code**, not a production integration: simplified authentication, single logical token row, local SQLite, and fixed scheduler interval. Sensitive values are **not** logged by default; see [docs/upstream-overview.md](docs/upstream-overview.md) for upstream video, support links, and how this Playbook extends upstream with `/login`.

## Deployment Guide

1. **Clone** this repository and open `playbooks/wxcc-token-management-sample/` (or use your PR branch that contains this folder).
2. **Register** your Webex Integration **Redirect URI** as `{BASE_URL}/auth/webex/callback` (for example `http://localhost:5000/auth/webex/callback` for local dev). The value must **exactly** match **`REDIRECT_URI`** in `.env`.
3. **Copy** `src/env.template` to `src/.env` and fill in `CLIENT_ID`, `CLIENT_SECRET`, `ORG_ID`, `PASSPHRASE`, `FROM`, and `SOURCE_IP`. Set **`OAUTH_SCOPES`** to the space-separated scopes your Integration lists (see [developer.webex.com](https://developer.webex.com)). Set `PORT` (and optional `HOST`) as needed. Optionally set **`CLUSTER_ID`** for plain JWT access tokens; otherwise the sample stores `unknown` for cluster. You may omit **`REFRESH_TOKEN`** if you will use browser login first.
4. **Install** dependencies: `cd playbooks/wxcc-token-management-sample/src && npm install`.
5. **Start** the server: `npm start` or `npm run dev` (nodemon). Ensure the process **current working directory** is `src/` so `./db/db.sqlite` resolves correctly.
6. **Obtain tokens** — Open `http://localhost:{PORT}/login` (or your deployed base URL plus `/login`), sign in to Webex, and complete the redirect. You should see a short success message; tokens are stored in SQLite. **Optional:** After a successful login, remove or blank **`REFRESH_TOKEN`** in `.env` if you rely on the database refresh token only.
7. **Watch logs** on startup for database sync and refresh attempts. If no refresh token is in the DB or env, the scheduler **skips** refresh until OAuth completes (no noisy invalid requests).
8. **Test** `GET /api/token` — `auth.js` requires **all** of the following to match your `.env`: `Content-Type` and `Accept` are `application/json`, `x-organization-id` equals `ORG_ID`, `x-from` equals `FROM`, `x-api-phrase` equals `PASSPHRASE`, and the request’s **`req.ip`** equals `SOURCE_IP`.

   From the same machine as the server, try a `curl` (set `PORT` and header values to match your `.env`):

   ```bash
   curl -sS -w "\nHTTP %{http_code}\n" \
     "http://127.0.0.1:${PORT:-5000}/api/token" \
     -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     -H "x-organization-id: YOUR_ORG_ID" \
     -H "x-from: YOUR_FROM" \
     -H "x-api-phrase: YOUR_PASSPHRASE"
   ```

   A **200** response body looks like `{"access_token":"...","token_type":"Bearer","expires_in":...}`. **400** with `{"error":"Malformed Request"}` means a header or IP check failed. **503** with a “no access token” message means the DB has no token yet (complete `/login` or fix scheduler refresh).

   **Local IP tip:** Express sets `req.ip` from the connecting address. If `SOURCE_IP=127.0.0.1` but `curl` still returns 400, your OS may be using IPv6 — set `SOURCE_IP` to `::1` instead, or force IPv4 with `curl` to `http://127.0.0.1:...` as above. For a quick look at what the server sees, set `DEBUG_HEADERS=true` in `.env` and retry (disable after debugging).
9. **Point Flow Designer** (or your integration) at your deployed base URL and configure the same headers and passphrase your service expects.
10. **Optional:** Set `DEBUG_HEADERS=true` or `DEBUG_TOKEN=true` in `.env` only for short-lived debugging (avoid in shared environments).

## Known Limitations

- **Not production-hardened:** No TLS termination, rate limiting, or strong identity for callers beyond the header checks on **`GET /api/token`**. **`GET /login`** is **unauthenticated** by design; do not expose it on untrusted networks without network controls or HTTPS and a deliberate threat model.
- **Token and refresh expiry:** Access and refresh tokens expire per Webex OAuth policy; if refresh fails, complete **`/login`** again or set a new **`REFRESH_TOKEN`** in `.env` or your secret store.
- **Single row:** The sample uses one Sequelize row (`id` 1); multi-org patterns require schema and routing changes.
- **Scheduler interval:** Default **10 hours** is defined in `scheduler/scheduler.js`; tune for your token lifetime and operational rules.
- **Token row shape:** If the access token matches the legacy **three-part** composite form (`access_cluster_org`), `tokenService.updateToken` splits it as upstream did. Otherwise it stores the access token as returned and sets **`org_id`** from **`ORG_ID`** and **`cluster_id`** from **`CLUSTER_ID`** or the placeholder `unknown` — validate against your tenant and WxCC docs.
- **License:** Upstream sample is **MIT** (see `src/LICENSE`). This Playbook’s use is also subject to the repository [LICENSE](../../LICENSE).
- **Webex disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
