# DocuSign, Cisco Finesse, and Webex Desk Playbook

This Playbook is adapted from the [docusign-finesse-int](https://github.com/wxsd-sales/docusign-finesse-int) sample on GitHub (MIT).

## Use Case Overview

Contact-center agents on **Cisco Finesse** sometimes need a **live video** conversation with a customer on a **Webex Desk** device and, in the same journey, capture a **legally binding signature** without relying on screen share. This sample wires **Finesse Task Routing** (XML) to a small **Node.js** server that mints **Webex** guest tokens, drives **Meetings** and **device xAPI** (`UserInterface.WebView`), and sends **DocuSign** envelopes with **Connect** webhooks so the agent browser sees envelope status in near real time.

**Target persona:** Integration developers or contact-center architects who have access to Finesse, Webex Control Hub, and DocuSign developer credentials.

**Estimated implementation time:** 4–8 hours (OAuth and JWT setup, Finesse endpoint alignment, DocuSign demo vs production accounts, ngrok or HTTPS for webhooks, and Desk xAPI testing).

## Architecture

The **Express** server is the hub: it refreshes a Webex **access token** from a **refresh token**, calls **`/v1/guests/token`** for embedded flows, **POST**s a task XML payload to **`FINESSE_URL`**, lists and updates **meeting participants** via the documented **Meetings API**, and issues **DocuSign** envelopes with **JWT**. DocuSign posts XML to **`/docusign-webhook`**; the server parses status, emits **Socket.IO** events to the agent page, and clears the Desk **WebView** via **xAPI**. Static agent, client, home, and clear pages live next to `server.js` under `src/`; the webpack bundle serves the main meeting UI from `dist/` after `npm run build`.

See the [architecture diagram](diagrams/architecture-diagram.md) for the sequence between agent UI, Node, Webex, Finesse, DocuSign, and the Desk.

## Prerequisites

- **Node.js** 20.x or later and **npm**.
- **Webex** integration (or OAuth app) with **refresh token**, **client ID**, and **client secret** for REST access; org permission to use **Meetings**, **guest issuer**-style guest tokens, and **device xAPI** against registered Desk hardware.
- **Cisco Finesse** environment with a **Task Routing** (or equivalent) **HTTP POST** URL that accepts the sample XML body (you must align `scriptSelector`, tags, and variables with your deployment).
- **DocuSign** developer account with **JWT (RS256)** consent, integration key, user ID, RSA private key file, account ID, and correct **auth** and **REST** base paths (demo vs production).
- **Public HTTPS URL** for this app (**`BASE_URL`**) so DocuSign Connect can reach **`/docusign-webhook`** (e.g. ngrok). Same URL is used for recipient **return** links.
- **Sample PDF** with a **`**signature**`** anchor string for the sign-here tab; this repo includes **`src/sample_doc.pdf`** for the default send flow.
- Optional: **`FINESSE_SESSION_COOKIE`** if your Finesse server requires a session cookie on the task-routing request.
- For more detail and the upstream demo link, see [docs/upstream-overview.md](docs/upstream-overview.md).

## Code Scaffold

Runnable code lives under **`src/`**:

- **`server.js`** — Express + HTTP server, Socket.IO, routes for Finesse task routing, meeting teardown, DocuSign send and webhook, static `dist/` and sibling HTML/CSS/JS.
- **`utils/get-access-token.js`** — Webex OAuth **refresh_token** grant (uses **`WEBEX_API_URL`**).
- **`utils/get-guest-token.js`** — **`POST .../guests/token`** for guest access tokens.
- **`webpack.config.js`** — Builds **`index.html`** / **`index.js`** into **`dist/`**.
- **`env.template`** — Required environment variables; copy to **`.env`** in **`src/`** (do not commit secrets).
- **`sample_doc.pdf`** — Default document for **`/send-document`**.

This is **sample code**, not production-ready: permissive CORS, minimal input validation, and lab-only TLS bypass behind **`FINESSE_ALLOW_INSECURE_TLS`**. Production deployments need authentication on admin routes, webhook signature verification, structured logging, and hardened TLS. See [docs/upstream-overview.md](docs/upstream-overview.md) for differences from the upstream repo.

## Deployment Guide

1. From the repository root, go to the app directory: `cd playbooks/docusign-finesse-int/src`.
2. Install dependencies: `npm install`.
3. Copy environment template: `cp env.template .env` and edit **`.env`** with Webex, Finesse, DocuSign, and **`BASE_URL`** (your public tunnel or deployment URL, no trailing slash issues—use the exact URL DocuSign should call).
4. Place your DocuSign **RSA private key** on disk and set **`DOCUSIGN_PRIVATE_KEY_PATH`** to that path (paths can be absolute).
5. Ensure **`sample_doc.pdf`** remains in **`src/`** or change the path in **`server.js`** to your PDF (keep a **`**signature**`** anchor in the PDF if you use the default tab config).
6. Start a tunnel (e.g. ngrok) pointing to your local port and set **`BASE_URL`** to the HTTPS forwarding URL; configure DocuSign Connect (or demo account defaults) to post to **`{BASE_URL}/docusign-webhook`**.
7. Build the client bundle: `npm run build`.
8. Start the server: `npm run start` (uses **nodemon**; use `node server.js` if you prefer).
9. Open **`http://localhost:3000/agent`** (or **`PORT`**) for the agent UI, **`/client`** for the client view, **`/home`** for home, per upstream behavior.
10. <!-- TODO: verify Finesse XML field names, script selector, and authentication against your specific Finesse and UCCX/PCCE deployment -->

## Known Limitations

- **DocuSign** rate limits, JWT consent, and account type (demo vs production) apply; Connect delivery retries and HMAC verification are not implemented in this sample.
- **Webex** tokens expire; the sample refreshes on a cron cadence and on demand—tune for your security policy.
- **Finesse** XML in this sample is illustrative; **`scriptSelector`**, variables, and authentication (**`FINESSE_SESSION_COOKIE`**) must match your environment.
- **`FINESSE_ALLOW_INSECURE_TLS=true`** disables TLS certificate verification for outbound calls (e.g. lab Finesse). Do **not** use in production.
- The upstream sample did not declare **xml2js** in `package.json`; this playbook adds it for the webhook parser. Dependency tree includes deprecated transitive packages from **`webex`**; run **`npm audit`** and upgrade deliberately for production.
- License: sample adapted from MIT-licensed upstream code; this repository’s terms apply to the Playbook folder—see [LICENSE](../../LICENSE).
- This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
