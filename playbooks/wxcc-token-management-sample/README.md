# Webex Contact Center token management sample Playbook

This Playbook is adapted from the [token-app-sample](https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/token-management-samples/token-app-sample) in the Webex Contact Center API samples repository on GitHub.

## Use Case Overview

Integrations that call **Webex Contact Center** or **Webex platform APIs** from **Flow Designer** (or other server-side callers) need a **durable access token** without embedding long-lived secrets in the flow. This sample shows a small **Node.js** service that **refreshes OAuth tokens** on a schedule, **stores** them in **SQLite**, and exposes a **guarded HTTP endpoint** so only expected callers can retrieve the current access token.

**Target persona:** WxCC developers or integration engineers comfortable running Node locally or on a small VM, configuring OAuth client credentials, and aligning HTTP headers with Flow Designer egress rules.

**Estimated implementation time:** 2–4 hours (register or reuse an Integration, obtain a refresh token, configure environment variables, align `SOURCE_IP` with your datacenter, verify refresh logs and `GET /api/token`).

This is **not** the same pattern as the [service-app-token-getter](../service-app-token-getter/README.md) Playbook, which targets **Webex Service Apps** and **Teams-oriented** OAuth and webhooks.

## Architecture

You run an **Express** server (`src/server.js`) that registers **`GET /api/token`**. Callers must send headers validated in `src/auth.js`: `Content-Type: application/json`, `Accept: application/json`, `x-organization-id` matching `ORG_ID`, `x-from` matching `FROM`, `x-api-phrase` matching `PASSPHRASE`, and a source IP matching `SOURCE_IP` (Flow Designer egress per [Webex Contact Center security settings](https://help.webex.com/en-us/article/3srgv1/Security-Settings-for-Webex-Contact-Center)). On success, the server returns **only** `access_token`, `token_type`, and `expires_in` (not the refresh token or full DB row).

In parallel, **`src/scheduler/scheduler.js`** runs at startup and on a **fixed interval** (default **10 hours** in code). It posts to **`https://webexapis.com/v1/access_token`** with **`grant_type=refresh_token`**, using **`CLIENT_ID`**, **`CLIENT_SECRET`**, and **`REFRESH_TOKEN`** from the environment, then **upserts** tokens in the database through **`src/service/tokenService.js`**.

See the [architecture diagram](diagrams/architecture-diagram.md) for the Flow Designer, Express, OAuth, and database flow.

## Prerequisites

- **Webex Contact Center**–enabled org and permission to create or use a **Webex Integration** (client ID and secret) with scopes appropriate for the APIs you will call after obtaining a token.
- **Refresh token** from an OAuth authorization flow (developer workflow or your own redirect application). This vendored server **does not** implement a browser `/auth/webex/callback` route; see [docs/upstream-overview.md](docs/upstream-overview.md).
- **Org ID** for `ORG_ID` (Control Hub or developer portal).
- **Node.js** 18+ recommended and **npm**.
- **Network:** Callers of `GET /api/token` must reach your service; for Flow Designer, configure **`SOURCE_IP`** to match documented egress addresses for your region.
- **Optional:** [Contact Center developer sandbox](https://developer.webex.com/create/docs/sandbox_cc) for learning.

## Code Scaffold

Runnable code lives under **`src/`**:

- **`server.js`** — Express app, `GET /api/token`, loads `dotenv` at startup.
- **`auth.js`** — Header checks that gate access to the token endpoint.
- **`scheduler/scheduler.js`** — Interval job and refresh call to Webex OAuth token URL.
- **`service/tokenService.js`** — Sequelize helpers to read and upsert the token row.
- **`models/Token.js`** — Token model (single-row sample, `id` 1).
- **`db/db.js`** — Sequelize connection; default **SQLite** file `./db/db.sqlite` (override with `DB_STORAGE` / `DB_DIALECT` in `.env` if you extend the sample).
- **`package.json`** — Dependencies include `express`, `sequelize`, `sqlite3`, `axios`, `toad-scheduler`, `dotenv`.
- **`env.template`** — Required variables; copy to **`.env`** in **`src/`** (do not commit secrets).

This is **sample code**, not a production integration: simplified authentication, single logical token row, local SQLite, and fixed scheduler interval. Sensitive values are **not** logged by default; see [docs/upstream-overview.md](docs/upstream-overview.md) for upstream video, support links, and the `REDIRECT_URI` note.

## Deployment Guide

1. **Clone** this repository and open `playbooks/wxcc-token-management-sample/` (or use your PR branch that contains this folder).
2. **Copy** `src/env.template` to `src/.env` and fill in `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`, `ORG_ID`, `PASSPHRASE`, `FROM`, and `SOURCE_IP`. Set `PORT` (and optional `HOST`) as needed.
3. **Install** dependencies: `cd playbooks/wxcc-token-management-sample/src && npm install`.
4. **Start** the server: `npm start` or `npm run dev` (nodemon). Ensure the process **current working directory** is `src/` so `./db/db.sqlite` resolves correctly.
5. **Watch logs** on startup for database sync and refresh attempts. Fix `REFRESH_TOKEN` or client credentials if the refresh call fails.
6. **Test** `GET /api/token` with the required headers from a client whose IP matches `SOURCE_IP` (or adjust `SOURCE_IP` for your test host). Use `Content-Type: application/json` and `Accept: application/json` even for GET if your client library allows, matching `auth.js`.
7. **Point Flow Designer** (or your integration) at your deployed base URL and configure the same headers and passphrase your service expects.
8. **Optional:** Set `DEBUG_HEADERS=true` or `DEBUG_TOKEN=true` in `.env` only for short-lived debugging (avoid in shared environments).

## Known Limitations

- **Not production-hardened:** No TLS termination, rate limiting, or strong identity for callers beyond the header checks in this sample.
- **Token and refresh expiry:** Access and refresh tokens expire per Webex OAuth policy; if refresh fails, obtain a new refresh token and update `.env` or your secret store.
- **Single row:** The sample uses one Sequelize row (`id` 1); multi-org patterns require schema and routing changes.
- **Scheduler interval:** Default **10 hours** is defined in `scheduler/scheduler.js`; tune for your token lifetime and operational rules.
- **Upstream parsing:** `tokenService.updateToken` derives `cluster_id` and `org_id` from the access token string format returned in the original sample; validate against current API behavior in your tenant.
- **License:** Upstream sample is **MIT** (see `src/LICENSE`). This Playbook’s use is also subject to the repository [LICENSE](../../LICENSE).
- **Webex disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
