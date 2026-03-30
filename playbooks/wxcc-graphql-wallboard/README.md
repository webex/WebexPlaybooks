# Webex Contact Center GraphQL wallboard Playbook

This Playbook is adapted from the [graphql-wallboard-sample](https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/reporting-samples/graphql-wallboard-sample) in the Webex Contact Center API samples repository on GitHub.

## Use Case Overview

Operations and engineering teams often want a **live wallboard** of contact-center metrics (calls by entry point, agent and queue statistics, active tasks) without building a full analytics product. This sample shows how to use the **Webex Contact Center Search API (GraphQL)** from a small **Node.js** app and simple browser charts.

**Target persona:** WxCC developers or admins who are comfortable running Node locally and pasting a short-lived developer token for a proof of concept.

**Estimated implementation time:** 2–4 hours (configure environment variables, install dependencies, adjust query time ranges if needed, verify charts against your tenant).

## Architecture

You run an **Express** server that serves static wallboard pages from `src/views` and JSON endpoints for each chart. When a chart loads, the server resolves **org ID** and **access token**: in the default **dev** path, `controller/decide.js` reads `ENVIRONMENT` and `ORG_ID` from the process environment, then the token helper calls **`/dev-token`** with **Basic auth** (`NAME` / `PASS` from the environment). That route returns **`DEV_TOKEN`** from the environment (so the token is never embedded in client-side code). Wallboard controllers then **POST** GraphQL queries to **`{WXCC_API_BASE}/search`** with your org ID and `Authorization: Bearer <token>`. Each wallboard JSON response includes **`wallboard_lookback_days`** for chart legends (same as `WALLBOARD_LOOKBACK_DAYS` in `.env`).

See the [architecture diagram](diagrams/architecture-diagram.md) for the browser, Express, and Search API flow.

## Prerequisites

- **Webex Contact Center** tenant; a [Contact Center developer sandbox](https://developer.webex.com/create/docs/sandbox_cc) is suitable for testing.
- **Org ID** for your tenant (Control Hub or developer portal).
- **Access token** with permissions appropriate for Search / reporting (the upstream sample expects an admin-class token from the developer workflow; obtain from [developer.webex.com](https://developer.webex.com) while signed in as a WxCC admin user). Store it as **`DEV_TOKEN`** in `.env`.
- **`NAME` and `PASS`** — Any consistent Basic-auth username and password; required so server-side calls to `/dev-token` can authenticate (see `src/env.template`).
- **API cluster URL** matching your org, for example `https://api.wxcc-us1.cisco.com` or `https://api.wxcc-eu1.cisco.com` (set as `WXCC_API_BASE` in `src/env.template`).
- **Node.js** 18+ recommended (ES modules and `node-fetch` v3), and **npm**.
- **Optional:** MongoDB and basic-auth credentials if you use the upstream **production** token routes instead of `DEV_TOKEN` (see [docs/upstream-overview.md](docs/upstream-overview.md)).

## Code Scaffold

Runnable code lives under **`src/`**:

- **`server.js`** — Express entrypoint, CORS, static files, wallboard and token helper routes.
- **`controller/wallboard/*.js`** — GraphQL query strings and `fetch` to the Search API (via `controller/wxccApi.js` for the base URL).
- **`controller/decide.js`** — Chooses dev vs production token source from `ENVIRONMENT` and `ORG_ID` in the process environment.
- **`routes/`** — HTTP routes for wallboard JSON and optional token management.
- **`views/`** — HTML, CSS, and client scripts for the wallboard UI.
- **`env.template`** — Required variables; copy to `.env` in `src/` (do not commit secrets).

This is **sample code**, not a production integration: simplified token handling, fixed CORS allow list, and a rolling Search query window (default **7 days**, set `WALLBOARD_LOOKBACK_DAYS` in `.env`). See [docs/upstream-overview.md](docs/upstream-overview.md) for upstream video, demo link, and API limits.

## Deployment Guide

1. **Clone** this repository and stay on your working branch (for example `playbook/wxcc-graphql-wallboard`) or open `playbooks/wxcc-graphql-wallboard/` from an existing clone.
2. **Copy** `playbooks/wxcc-graphql-wallboard/src/env.template` to `playbooks/wxcc-graphql-wallboard/src/.env`.
3. **Edit** `.env`: set `ORG_ID`, `DEV_TOKEN`, `NAME`, `PASS`, `ENVIRONMENT=dev`, `URL` to the base URL where the app will listen (for example `http://localhost:3000`), and `WXCC_API_BASE` to your WxCC API host (no trailing slash).
4. **Install** dependencies: `cd playbooks/wxcc-graphql-wallboard/src && npm install`.
5. **Start** the server from `src/`: `npm run dev` (nodemon) or `npm start` (both preload `config-env.js` so `.env` in `src/` is applied reliably).
6. **Open** a browser at `http://localhost:3000` (or your `PORT` if set) and load the wallboard; charts call back into the same origin for JSON data.
7. **If charts are empty or error:** Confirm the token is valid, `WXCC_API_BASE` matches your region, and that your tenant has traffic in the configured lookback window (default **7 days**). Set `WALLBOARD_LOOKBACK_DAYS` in `.env` to change it; restart the server and refresh the browser (see [docs/upstream-overview.md](docs/upstream-overview.md)).
8. **CORS:** If you access the UI from another origin, add that origin to the whitelist in `server.js` or you will see CORS errors in the browser.
9. **Before you open a PR**, run repo validation from the WebexPlaybooks root:

   ```bash
   ./scripts/validate-playbook-local.sh playbooks/wxcc-graphql-wallboard
   ```

10. **Secret hygiene:** Keep `.env` out of git; use only `env.template` in commits.

## Known Limitations

- **Query windows:** Wallboard queries use a rolling `from`/`to` range from `wallboardQueryTimeRange()` in `src/controller/wxccApi.js`. Default is **7 days**; set `WALLBOARD_LOOKBACK_DAYS` in `.env` for a longer or shorter window (subject to [Search API](https://developer.webex.com/webex-contact-center/docs/api/v1/search) limits).
- **Token lifetime:** `DEV_TOKEN` is short-lived; expect to refresh it from the developer portal when API calls return 401.
- **Rate limits:** Subject to Webex and WxCC API limits; the sample does not implement backoff.
- **CORS:** Only listed origins in `server.js` are allowed; adjust for your deployment hostname or tunnel.
- **`URL` vs listen address:** Token helpers call `/dev-token` (and related routes) on the base URL in `URL`; set `URL` to match where the app is reachable (host and port).
- **Optional Mongo flow:** Not documented step-by-step here; the upstream repo supports storing tokens in MongoDB with basic-auth protected routes for advanced demos.
- **License:** This Playbook is covered by the Webex Playbooks repository [LICENSE](../../LICENSE). The upstream sample is licensed separately (see the [samples repo](https://github.com/WebexSamples/webex-contact-center-api-samples)).
- **Disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
