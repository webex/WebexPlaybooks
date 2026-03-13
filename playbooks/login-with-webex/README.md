# Login with Webex Playbook

This Playbook is adapted from the [Login with Webex](https://github.com/WebexSamples/login-with-webex) sample on GitHub.

## Use Case Overview

Add "Sign in with Webex" to your web application so users can authenticate using their Webex account instead of creating new credentials. This reduces friction for organizations already using Webex and provides a trusted identity layer for apps that integrate with Webex Teams, Meetings, or other Webex products.

**Target persona:** Developers building web apps (SPAs, dashboards, internal tools) that need to identify users via Webex.

**Business value:** Users sign in once with Webex; your app receives verified identity claims (email, name, user ID) without managing passwords or user databases.

**Estimated implementation time:** 1–2 hours.

## Architecture

Login with Webex uses OpenID Connect (OIDC) over OAuth 2.0. This Playbook demonstrates two flows:

1. **ID Token flow** (`openid3.html`): Simple implicit flow returning an ID token directly. Best for demos and minimal setups.
2. **Authorization Code + PKCE** (`pkce.html`): More secure flow for public clients. The PKCE demo uses an interactive form; in production, perform the token exchange server-side.

The server serves static demo pages and injects `WEBEX_CLIENT_ID` via `/config.js` for the ID Token flow. See the diagram in [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md).

## Prerequisites

- **Webex Developer Account:** Create one at [developer.webex.com](https://developer.webex.com).
- **Webex Integration:** Create an Integration (OAuth client) in the Webex Developer Portal with:
  - Redirect URIs: `http://localhost:3000/openid3.html`, `http://localhost:3000/pkce.html`
  - Scopes: `openid`, `email` (minimum for Login with Webex)
- **Node.js:** v14 or higher.
- **Network:** Outbound HTTPS to `webexapis.com` (no inbound webhooks required).

## Code Scaffold

```
src/
├── main.js          # Express server; serves public/ and /config.js
├── env.template     # Environment variable template (copy to .env)
└── public/          # Demo pages from original repo
    ├── index.html   # Navigation (ID Token | PKCE)
    ├── openid3.html # ID Token flow demo
    ├── pkce.html    # PKCE flow demo
    ├── pkce.js      # PKCE implementation (CryptoJS)
    ├── common.js    # JWT parsing, shared utilities
    ├── main.css     # Styling
    ├── juno.jpg     # Demo image
    └── webexlogo.png
```

The code demonstrates:

- ID Token flow: redirect to Webex authorize with `response_type=id_token`; parse JWT from hash fragment.
- PKCE flow: generate code verifier/challenge, authorize, exchange code for tokens, fetch UserInfo.
- Client ID injection via `/config.js` (server-side; no hardcoded credentials).

The PKCE demo exposes the client secret in the browser for demonstration only. In production, perform the token exchange server-side.

## Deployment Guide

1. **Create a Webex Integration**
   - Go to [developer.webex.com](https://developer.webex.com) and sign in.
   - Create an Integration (or use an existing one).
   - Add Redirect URIs: `http://localhost:3000/openid3.html`, `http://localhost:3000/pkce.html`.
   - Note the Client ID and Client Secret.

2. **Install dependencies**
   - From the Playbook folder: `cd playbooks/login-with-webex && npm install`

3. **Configure**
   - Copy `src/env.template` to `src/.env` (or set environment variables).
   - Set `WEBEX_CLIENT_ID` (required for ID Token flow; PKCE flow uses form input).

4. **Run the server**
   - `npm start` (or `node src/main.js`)

5. **Test the flows**
   - Open `http://localhost:3000` in a browser.
   - **ID Token:** Click "Open ID Connect - ID Token", then "Login". Complete Webex login.
   - **PKCE:** Click "Open ID Connect - PKCE". Enter Client ID and Secret, generate PKCE codes, and follow the steps.

6. **Production considerations**
   - Perform PKCE token exchange server-side; never expose the client secret in the browser.
   - Verify ID token signature and claims (`iss`, `aud`, `exp`) before trusting the token.
   - Use HTTPS and update redirect URIs to your production URLs.

## Known Limitations

- **PKCE demo exposes client secret:** The PKCE demo performs the token exchange in the browser for educational purposes. Never do this in production; use server-side token exchange.
- **No token refresh:** Access tokens expire. This sample does not implement refresh token handling.
- **No ID token verification:** The sample parses the ID token but does not verify its JWT signature. Production apps should validate per OIDC spec.
- **License:** The original sample is under the [Cisco Sample Code License](https://github.com/WebexSamples/login-with-webex/blob/main/LICENSE). This Playbook is provided under the [Webex Playbooks repository LICENSE](../../LICENSE).
- **Webex disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
