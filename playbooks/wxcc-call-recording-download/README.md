# Webex Contact Center Call Recording Download Playbook

This Playbook is adapted from the [Call Recording Download sample](https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/call-recording-samples/call-recording-download-sample) in the WebexSamples `webex-contact-center-api-samples` repository on GitHub.

## Use Case Overview

When a contact center finishes a recorded interaction, operations and compliance teams often need that audio on internal storage or downstream systems. This integration shows how Webex Contact Center (WxCC) can notify your app when a capture is ready (`capture:available`), how to obtain a short-lived download URL via the [Captures API](https://developer.webex.com/webex-contact-center/docs/api/v1/captures) (for example `POST /v1/captures/query`), and how to persist the file under a local `recordings` folder.

**Target persona:** WxCC developers or solution engineers building webhook receivers and experimenting with recording retrieval.

**Estimated implementation time:** About 2–4 hours (integration registration, tunnel, webhook subscription, first successful download).

## Architecture

The sample is a small Express server. Unauthenticated `GET /` serves a short HTML landing page with an overview and a **Sign in with Webex** control that starts OAuth at `/login`. The app runs the Webex OAuth 2.0 authorization code flow and keeps the access token **in server memory only** (lost on restart). After login, `GET /` serves a small HTML dashboard to **list** existing WxCC webhook subscriptions for that token and **register** a `capture:available` subscription using a pasted HTTPS tunnel URL. WxCC delivers `capture:available` events to `POST /webhook` on a public HTTPS URL (for local dev, typically via a tunnel such as ngrok). The handler calls WxCC `POST /v1/captures/query` with `Authorization: Bearer <access_token>` and your `ORG_ID`, reads the recording storage URL from the response, streams the file, and writes it under `FILE_PATH` (default `./recordings`).

Authentication for API calls uses the same OAuth token obtained from `webexapis.com`. The WxCC API host is configurable (`WXCC_API_BASE`) so you can target your cluster region.

See the [architecture diagram](diagrams/architecture-diagram.md) for a sequence view.

## Prerequisites

- **Webex Contact Center:** Org with recording/capture features enabled as required for your tenant; ability to subscribe to webhooks (see [Using Webhooks](https://developer.webex.com/docs/using-webhooks) and the [Subscriptions API](https://developer.webex.com/docs/api/v1/subscriptions), as linked from the [Webex Contact Center developer overview](https://developer.webex.com/webex-contact-center/docs/webex-contact-center)).
- **Webex integration:** Register an integration (for example from [Webex for Developers](https://developer.webex.com/) or [Webex Contact Center developer resources](https://developer.webex.com/webex-contact-center/docs/webex-contact-center)) with redirect URI matching this app (for example `http://localhost:5000/auth/webex/callback`). Scopes used in code: `cjp:config`, `cjp:config_read`, `cjp:config_write` (align with your org policy).
- **Org ID:** Set `ORG_ID` in environment variables to your WxCC organization identifier used by the captures API.
- **Public HTTPS URL for webhooks:** For local testing, a tunnel (for example [ngrok](https://ngrok.com/)) exposing the app port. Production deployments use your stable HTTPS endpoint.
- **Node.js:** LTS recommended; npm for dependencies.
- **Network:** Outbound HTTPS from the app to `webexapis.com`, your WxCC API base, and the recording storage URL returned by the API.

For background on WxCC webhooks and subscriptions, see the [webhook samples](https://github.com/WebexSamples/webex-contact-center-api-samples) in the same upstream monorepo (for example getting-started webhook examples referenced in the upstream README).

## Code Scaffold

Under `src/`:

- **`server.js`** — Express routes: `GET /` serves `dist/dashboard.html` when authenticated, else `dist/index.html` (landing), registered before static so `/` is not swallowed by static. JSON APIs: `GET /api/session`, `GET /api/subscriptions` (proxies WxCC list), `POST /api/register-subscription` (normalize tunnel URL to `…/webhook`, then `POST` WxCC `/v1/subscriptions`). Static `dist/` (landing also at `/index.html`), `/login`, OAuth callback, `POST /webhook` for `capture:available`, optional logging for other webhook types.
- **`dist/dashboard.html`** — Post-login page: session summary, subscription table with refresh, form to register `capture:available` with an HTTPS tunnel URL.
- **`dist/index.html`** — Public landing: what the sample does, prerequisites summary, **Sign in with Webex** link to `/login` (the upstream repo did not ship a `dist` folder).
- **`package.json`** — Dependencies (`express`, `axios`, `dotenv`, `url`). Install with `npm install` from `src/` (this sample does not ship a lockfile).
- **`recordings/`** — Target directory for downloads (empty except `.gitkeep`).
- **`env.template`** — Required and optional variables; copy to `.env` in `src/` (do not commit secrets).

The code does **not** verify signed webhooks, persist tokens, refresh tokens, or implement multi-tenant scheduling. For production patterns (token refresh, persistence), explore other samples under [WebexSamples/webex-contact-center-api-samples](https://github.com/WebexSamples/webex-contact-center-api-samples).

An alternate **GCP upload** script exists upstream (`GCPCallRecordingDownload.js`) but is not vendored here; it required hardcoded bucket configuration and is unsuitable as-is—see the [upstream folder](https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/call-recording-samples/call-recording-download-sample) if you want to adapt it.

## Deployment Guide

1. **Clone** the Webex Playbooks repository and open `playbooks/wxcc-call-recording-download/`.
2. **Register a Webex integration** with redirect URI `http://localhost:5000/auth/webex/callback` (or your chosen origin and port). Add OAuth scopes **`cjp:config`**, **`cjp:config_read`**, and **`cjp:config_write`** (same as in `server.js`; change only if your org requires different scopes).
3. **Copy** `src/env.template` to `src/.env` and set `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI`, `ORG_ID`, and optionally `PORT`, `WXCC_API_BASE`, and `FILE_PATH`.
4. **Install dependencies:** From `src/`, run `npm install`.
5. **Start the server:** From `src/`, run `npm start` (or `node server.js`). Confirm it listens on your `PORT` (default `5000` if unset).
6. **Start a tunnel** to that port (for example `ngrok http 5000`) and note the HTTPS forwarding URL.
7. **Complete OAuth once:** In a browser, open `http://localhost:<PORT>/` and use **Sign in with Webex**, or go directly to `http://localhost:<PORT>/login`. Sign in so the server stores an access token in memory. You need a token with **`cjp:config_write`** (and the other integration scopes) so the dashboard can register subscriptions for your org.
8. **Register a WxCC webhook subscription** from the dashboard so WxCC can deliver `capture:available` events to this sample’s `POST /webhook` handler. After login you are at `http://localhost:<PORT>/`. The page lists existing subscriptions for your token and has a field for your **HTTPS** tunnel URL (for example the ngrok forwarding URL). Submit to register; the app appends `/webhook` if you paste only the host root. The URL must be HTTPS, publicly reachable, and must not include query parameters. Use **Refresh** to reload the list after registering.
9. **Generate a recording** in your WxCC environment so a `capture:available` event is sent. Watch the **terminal where the server is running**: it logs when a webhook is received, when the captures API is called, and when a file is saved (or errors if the token is missing or a step fails). Confirm a file also appears under `recordings/` (or your `FILE_PATH`).

<!-- TODO: verify this step against your specific environment --> If your cluster is not US1, set `WXCC_API_BASE` to the API base URL for your region (no trailing slash).

## Known Limitations

- **In-memory tokens:** Access token is lost on process restart; you must visit `/login` again unless you add persistence and refresh (see other samples in the [upstream monorepo](https://github.com/WebexSamples/webex-contact-center-api-samples)).
- **Subscription UI:** The dashboard only **lists** and **registers** subscriptions; it does not delete or update them. Duplicate registration or WxCC validation errors appear in the UI or server logs.
- **Webhook verification:** The sample does not validate signed webhooks; add verification before production use.
- **Rate limits:** Subject to Webex and WxCC API limits; no throttling or backoff in the sample.
- **Async file write:** The handler responds after starting the download stream; very large files may still be writing when the HTTP response completes.
- **License:** This Playbook is provided under the Webex Playbooks repository license. See the repo [LICENSE](../../LICENSE). The original sample uses ISC; check the upstream repo for terms if you copy additional files.
- **Disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
