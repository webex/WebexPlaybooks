# Webex Contact Center token service (Firebase) Playbook

This Playbook is adapted from the [token-service-sample](https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/token-management-samples/token-service-sample) in the Webex Contact Center API samples repository on GitHub.

## Use Case Overview

**Webex Contact Center** flows and cloud integrations (for example Flow Designer HTTP activities, JDS, or Webex Connect) often need a **callable HTTPS endpoint** that returns a **current Webex access token** without storing client secrets inside the flow. This sample deploys a **Google Cloud Function** backed by **Firestore** so token storage and refresh run next to Google Cloud/Firebase infrastructure.

**Target persona:** Developers or integration engineers who already use **Google Cloud** and **Firebase**, can register a **Webex Integration**, and are comfortable deploying functions and editing Firestore documents.

**Estimated implementation time:** 2–4 hours (GCP/Firebase project, deploy function with `TOKEN_PASSPHRASE`, deploy Firestore rules, register Integration redirect URI, run `/init`, paste OAuth client fields into Firestore, complete browser OAuth, verify GET with `?name=` and header).

**Compared to [wxcc-token-management-sample](../wxcc-token-management-sample/README.md):** that Playbook uses **Express + SQLite** on infrastructure you operate. This Playbook uses **managed Cloud Functions + Firestore** when you want a **serverless** URL for cloud-to-cloud calls.

## Architecture

An **HTTP-triggered Cloud Function** (`exports.tokenService` in [`src/index.js`](src/index.js)) handles three paths:

1. **`/callback`** — OAuth redirect from Webex; exchanges `code` for tokens using `clientId`, `clientSecret`, and `redirectUri` read from the Firestore document named by the OAuth `state` parameter (your token name).
2. **`/init`** — **Setup only:** creates or merges a `tokens/{name}` document with empty OAuth client fields. Do not call in production after configuration is complete (see [docs/upstream-overview.md](docs/upstream-overview.md)).
3. **GET** (root path with query `name`) — Validates header **`x-token-passphrase`** against environment variable **`TOKEN_PASSPHRASE`**, loads the token document, returns the access token if it has more than **two hours** left, otherwise refreshes via **`https://webexapis.com/v1/access_token`** if the refresh token is still valid (at least **two minutes** remaining per upstream logic).

**Firestore** holds per-token OAuth client credentials and tokens. **firestore.rules** denies direct client SDK access so data is intended to be maintained via the Admin SDK inside the function or the Firebase console.

See the [architecture diagram](diagrams/architecture-diagram.md) for the sequence view.

## Prerequisites

- **Google Cloud** project and billing appropriate for **Cloud Functions** and **Firestore** ([creating projects](https://cloud.google.com/resource-manager/docs/creating-managing-projects)).
- **Firebase** linked to the project ([Firebase Console](https://console.firebase.google.com)), Firestore in **Native** mode.
- **Node.js** 18 aligned with [`src/package.json`](src/package.json) for local packaging or CI checks (deployment is still to Cloud Functions).
- **Webex** org with **Contact Center** and rights to create or use a **Webex Integration** (client ID and secret); redirect URI must match your function URL + `/callback`.
- **Postman** or **curl** (or your flow’s HTTP client) to call `/init`, test token retrieval, and set headers.
- Optional: upstream [setup video and links](docs/upstream-overview.md).

## Code Scaffold

Runnable sample code lives under **`src/`**:

- **`index.js`** — Cloud Function entry; OAuth callback, `/init`, and token GET/refresh.
- **`package.json`** — `firebase-admin` dependency and Node 18 engine hint.
- **`firestore.rules`** — Deny direct client reads/writes on `tokens/{id}`; deploy with Firebase rules deploy.
- **`env.template`** — Documents **`TOKEN_PASSPHRASE`** and Firestore-held fields (not a `.env` file for GCP; set variables in the function configuration).
- **`LICENSE`** — Upstream MIT (David Finnegan, 2023).

Additional upstream context (video, API JSON examples, `/init` warning, support links) is in [docs/upstream-overview.md](docs/upstream-overview.md).

This is **sample code**: a single shared passphrase protects the token endpoint, **CORS** allows any origin, and there is no per-caller identity or audit trail beyond Cloud logging.

## Deployment Guide

1. **Create** a Firebase/GCP project with **Firestore** and enable the **Cloud Functions** API as required by your console workflow.
2. **Deploy Firestore rules** from [`src/firestore.rules`](src/firestore.rules) using the Firebase CLI or console (replace default rules in dev projects carefully).
3. **Create** an HTTP Cloud Function (1st gen matches the `exports.tokenService` style) with source from [`src/`](src/): upload or connect a repo, set runtime **Node.js 18**, entry point **`tokenService`**, trigger **HTTP** (allow unauthenticated invoke at the Google layer only if you accept that model; the app still requires **`x-token-passphrase`**).
4. **Set** environment variable **`TOKEN_PASSPHRASE`** on the function to a long random string; record the same value for callers. See [`src/env.template`](src/env.template).
5. **Note** the function’s **HTTPS URL** (including any region path). Register **`{functionBaseUrl}/callback`** as the **Redirect URI** on your Webex Integration.
6. **Initialize** a token document: send **GET** `{functionBaseUrl}/init?name=YOUR_TOKEN_NAME` with header **`x-token-passphrase: YOUR_PASSPHRASE`** (adjust if your host/path layout differs; the function must see `req.path === "/init"`). Confirm a Firestore document **`tokens/YOUR_TOKEN_NAME`** appears.
7. **Edit** that document in the **Firebase console** and set **`clientId`**, **`clientSecret`**, and **`redirectUri`** (must match the Integration redirect URI exactly).
8. **Open** the Webex **authorization URL** for your Integration in a browser; set query parameter **`state`** to **`YOUR_TOKEN_NAME`** (not the placeholder `set_state_here`). Sign in and approve; you should see a success JSON from **`{functionBaseUrl}/callback`**.
9. **Test** token retrieval: **GET** `{functionBaseUrl}?name=YOUR_TOKEN_NAME` with header **`x-token-passphrase`** (root path, not `/init` or `/callback`). Expect `{"status":"200","token":"..."}`.
10. **Wire** Webex Contact Center flows or other callers to the same URL and headers; enforce TLS and network controls appropriate to your environment.

<!-- If your Cloud Functions URL layout does not expose `/init` and `/callback` as paths, adjust routing in the Google console (e.g. rewrite rules) or adapt `req.path` checks in code to match your trigger URL pattern. -->

## Known Limitations

- **Not production-hardened:** Shared passphrase only; no per-client identity, OAuth for admin setup is not separately gated, **`Access-Control-Allow-Origin: *`**, and secrets in Firestore require console access control and monitoring.
- **Token expiry:** When the **refresh token** expires, repeat the browser authorization flow. Access tokens are refreshed when less than two hours remain (upstream behavior).
- **`/init` risk:** Running **`/init`** after tokens exist can damage configuration—use only during setup ([upstream note](docs/upstream-overview.md)).
- **License:** Sample derives from MIT-licensed upstream code; see [`src/LICENSE`](src/LICENSE). This Playbook’s repository [LICENSE](../../LICENSE) applies to Playbook packaging and edits.
- **Disclaimer:** This Playbook is a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
