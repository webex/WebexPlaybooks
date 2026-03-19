# Webex Contact Center Audio Files Integration Playbook

This Playbook is adapted from the [Webex Contact Center Audio Files Integration](https://github.com/WebexSamples/audio_files_int_wxcc) sample on GitHub.

## Use Case Overview

This integration lets Webex Contact Center (WxCC) administrators manage organization-level audio files (`.wav`) used for queue hold music and routing strategies. A full-stack MERN (MongoDB, Express, React, Node.js) sample demonstrates how to call the WxCC Audio Files API to upload, list, update, and delete audio files that play to customers while they wait in queue or during other contact center flows.

**Target persona:** WxCC administrators or developers who need to provision and maintain hold music and queue audio via API instead of (or in addition to) the Control Hub UI.

**Estimated implementation time:** 2–4 hours (OAuth setup, backend and frontend run, first upload).

## Architecture

The sample uses a browser-based React app as the UI. The user signs in with Webex (OAuth 2.0 authorization code flow). The backend exchanges the authorization code for access and refresh tokens, stores the user and tokens in MongoDB, and uses the access token to call the Webex Contact Center Audio Files API on behalf of that user. All create/list/update/delete operations go through the backend so that client credentials and tokens never run in the browser.

Data flow: **User** → **React app** (login redirect) → **Webex OAuth** → **Backend** (code exchange, token storage) → **WxCC Audio Files API** (CRUD). The backend also syncs listed audio file metadata into MongoDB for the UI.

See the [architecture diagram](diagrams/architecture-diagram.md) for a Mermaid view of this flow.

## Prerequisites

- **Webex / WxCC:** Webex org with Contact Center; administrator role (or equivalent) to manage audio files. Use a [Contact Center developer sandbox](https://developer.webex.com/create/docs/sandbox_cc) if needed.
- **Webex Integration:** A registered integration (e.g. from [Webex for Developers](https://developer.webex.com/) or [Webex Contact Center](https://developer.webex.com/webex-contact-center/docs/webex-contact-center)) with:
  - **Scopes:** `cjp:config_read`, `cjp:config_write`, `openid`, `email`, `profile` (and `spark:kms` if required by your WxCC region).
  - **Redirect URI:** e.g. `http://localhost:5173/oauth` for local dev.
- **MongoDB:** Local instance or cloud (e.g. [MongoDB Atlas](https://www.mongodb.com/atlas)); used for user and cached audio file metadata.
- **Node.js:** Version 14+ (LTS recommended).
- **Network:** Backend must reach `webexapis.com` (OAuth/token, userinfo) and the WxCC API base (e.g. `api.wxcc-us1.cisco.com` or your cluster’s base URL).

## Code Scaffold

The `/src` tree mirrors the original sample:

- **`backend/`** — Express server: OAuth code exchange, user and audio-file routes, Mongoose models, and calls to the WxCC Audio Files API (list, create, patch, delete).
- **`frontend/`** — React (Vite) app with Chakra UI: Home (login), OAuth callback, Audiofiles list, Upload, and Update pages; state via Zustand.

The code demonstrates authenticating with Webex, calling the documented WxCC Audio Files endpoints, and handling multipart uploads for new files. It is **not** production-hardened: error handling is minimal, token refresh is not implemented, and secrets must be supplied via environment variables (see `src/env.template`). Use it as a starting point and harden (refresh, validation, rate limiting, etc.) for production.

## Deployment Guide

1. **Clone this Playbook** (or the Webex Playbooks repo) and open `playbooks/audio-files-int-wxcc/`.
2. **Register a Webex integration** with scopes `cjp:config_read`, `cjp:config_write`, `openid`, `email`, `profile` and redirect URI `http://localhost:5173/oauth` (or your frontend origin + path).
3. **Create a MongoDB database** and obtain a connection string (e.g. MongoDB Atlas).
4. **Copy `src/env.template`** to `src/.env` (or set the same variables in your environment). Fill in:
   - `MONGO_URI`, `PORT`, `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI`, and optionally `WXCC_API_BASE` (defaults to `https://api.wxcc-us1.cisco.com` if unset).
5. **Install backend dependencies:** From `playbooks/audio-files-int-wxcc/src`: `npm install`.
6. **Start the backend:** From `src`: `npm run dev` (listens on `PORT`, e.g. 5000).
7. **Install frontend dependencies:** From `src/frontend`: `npm install`.
8. **Configure OAuth URL in the frontend:** In `frontend/src/pages/Home.jsx`, set the authorize URL to use your integration’s `CLIENT_ID` and the same `REDIRECT_URI` and scopes as in step 2.
9. **Start the frontend:** From `src/frontend`: `npm run dev` (e.g. http://localhost:5173).
10. **Open the app in a browser,** sign in with Webex, then use the Audio Files and Upload pages to list and upload `.wav` files to your WxCC organization.

<!-- TODO: verify this step against your specific environment --> If your WxCC cluster uses a different API base URL, set `WXCC_API_BASE` in `.env` accordingly.

## Known Limitations

- **Rate limits:** Subject to Webex and WxCC API rate limits; the sample does not implement throttling or backoff.
- **Token expiry:** Access tokens expire; the sample does not implement refresh. Re-authenticate when the token is no longer valid.
- **Audio format:** Only `.wav` uploads are demonstrated; other formats (if supported by the API) are not shown.
- **License:** This Playbook is provided under the Webex Playbooks repository license. See the repo [LICENSE](../../LICENSE). The original sample’s license may differ; check the source repo for commercial use.
- **Disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
