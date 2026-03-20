# Guest-to-Guest Meeting Verification

This Playbook is adapted from the [Guest-to-Guest Meeting Sample](https://github.com/WebexSamples/g2g-meeting-sample) on GitHub.

## Use Case Overview

You need to **validate that a Webex service app can facilitate guest-to-guest (G2G) meetings**: meetings where participants join as guests without full Webex accounts, orchestrated through the Meetings API. This matters when you are building flows such as telehealth, support, or education where a trusted app creates the meeting, issues join links, and coordinates host and guest entry.

**Target persona:** Developers who have (or are obtaining) a **Webex sandbox** and a **service app access token** for G2G facilitator scenarios, and who want a repeatable API test sequence plus an optional way to open join URLs in the browser.

**Estimated implementation time:** 2–4 hours (sandbox access, service app setup, Postman import, and one end-to-end run through the collection).

The materials here are **sample scaffolding** for learning and verification, not a production integration.

## Architecture

A **service app access token** authorizes calls to the **Webex Meetings API** (`webexapis.com`). The **Postman collection** in `/src` walks through meeting preferences, scheduling options, meeting creation, guest creation, and join/start links. Optionally, **`runChromeTab.js`** runs a small HTTP server on localhost; when Postman (or another client) requests a URL shaped like `/myConf?conf=<encoded-meeting-url>`, the helper opens **Google Chrome** with that meeting URL so you do not have to paste links manually.

See the Mermaid diagram in [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md) for the request flow.

**Authentication:** The bearer token is never embedded in the repo. Use Postman variables and/or `src/env.template` for local scripts.

## Prerequisites

- [**Webex Guest to Guest Sandbox**](https://developer.webex.com/create/docs/g2g-sandbox): request a sandbox org from that documentation for building and testing G2G apps.
- **Service app access token** with permissions appropriate for the Meetings API flows you run (as documented for your facilitator app).
- **Postman** (or another HTTP client) to import and run `guest-to-guest_verification_test.postman_collection.json`.
- **Node.js 18+** if you use `check-meeting-preferences.js` or `runChromeTab.js`.
- **Google Chrome** on **macOS** if you use `runChromeTab.js` (the helper uses the `open -a` command). On Linux or Windows, run the meeting URLs manually or adapt the launch command locally.
- **Org and policy settings** that allow guest access and the G2G behavior you are testing (including Join Before Host / lobby behavior as described in the upstream sample).

## Code Scaffold

Under **`/src/`**:

| File | Purpose |
|------|---------|
| `guest-to-guest_verification_test.postman_collection.json` | Main workflow: meeting preferences through host/guest join links (copied from the upstream sample). |
| `check-meeting-preferences.js` | Minimal Node script: `GET https://webexapis.com/v1/meetingPreferences` using `WEBEX_ACCESS_TOKEN`. Confirms token and Meetings scope without running the full Postman sequence. |
| `runChromeTab.js` | Local HTTP server; opens Chrome with the URL extracted from the request path (macOS). `PORT` and `CHROME_APP_NAME` are configurable via environment variables. |
| `env.template` | Lists environment variables for the Node scripts (copy values into your shell or a local `.env` workflow—do not commit secrets). |
| `package.json` | Scripts: `npm run check-preferences`, `npm run chrome-tab`. No runtime npm dependencies (uses Node built-ins and `fetch`). |

This code **does not** implement token refresh, persistent storage, security hardening, or multi-tenant isolation. It **does** demonstrate documented Meetings API usage patterns aligned with the upstream Postman collection.

## Deployment Guide

1. **Obtain a service app access token** for your G2G facilitator scenario, following Cisco/Webex documentation for service apps and your sandbox org.
2. **Clone or open this Playbook** and go to `playbooks/g2g-meeting-sample/src/`.
3. **Import the Postman collection** `guest-to-guest_verification_test.postman_collection.json` into Postman.
4. **Create a Postman environment** with at least:
   - **Access Token** (or the variable name your imported collection expects—match the collection’s variables): your service app bearer token.
   - **Meeting ID** and **Meeting Password**: leave empty initially; the collection’s scripts populate them as you run requests in order.
5. **Run the collection requests in sequence** as documented in the upstream sample (meeting preferences → scheduling options → create meeting → join links and guests → host start link). Stop and fix any 401/403 before continuing.
6. **Optional — browser helper:** In a terminal, from `src/`, set `PORT` if you need a port other than 3000 (default). Optionally set `CHROME_APP_NAME` (default `Google Chrome`). Run:
   - `npm run chrome-tab`
   Configure Postman (or your client) so requests that should open a tab target `http://127.0.0.1:<PORT>/myConf?conf=<url-encoded-meeting-url>` as in the original sample.
7. **Optional — API smoke test without Postman:** Export `WEBEX_ACCESS_TOKEN` in your shell, then run:
   - `npm run check-preferences`
   Expect HTTP 200 and a JSON body from meeting preferences. If this fails, fix the token or scopes before relying on the full collection.
8. **Verify in the meeting client** that host and guests behave as expected (lobby, JBH, audio/video). If both guests remain in the lobby, revisit Control Hub / facilitator configuration per the upstream troubleshooting notes.

## Known Limitations

- **Sandbox and licensing:** Guest-to-guest facilitator behavior depends on **org configuration**, **sandbox availability**, and **meeting policies**. Not all options may match production orgs.
- **Token lifecycle:** Service app tokens expire; this sample does not implement refresh or secure secret storage—use your own token management for anything beyond testing.
- **Rate limits:** Webex API rate limits apply; the Postman sequence issues multiple calls in quick succession.
- **`runChromeTab.js`:** Intended for **macOS** and local development only; it executes a shell command to open Chrome—review before use in locked-down environments.
- **License:** The original sample is under the **Cisco Sample Code License**; redistribution and use are subject to that license. This Playbook repository’s overall terms are described in the playbook repo [LICENSE](../../LICENSE).
- **Disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
