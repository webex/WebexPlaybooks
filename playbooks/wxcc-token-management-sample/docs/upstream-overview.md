# Upstream token-app-sample notes

Material below summarizes the
[token-app-sample](https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/token-management-samples/token-app-sample)
folder in **WebexSamples/webex-contact-center-api-samples** (MIT License, Copyright Cisco
DevNet). Use it together with the root [README](../README.md) in this Playbook.

## What the upstream sample demonstrates

- **OAuth refresh:** `POST https://webexapis.com/v1/access_token` with
  `grant_type=refresh_token`, using `CLIENT_ID`, `CLIENT_SECRET`, and `REFRESH_TOKEN`
  from the environment.
- **Persistence:** Sequelize with **SQLite** (`./db/db.sqlite` by default).
- **Scheduling:** [toad-scheduler](https://www.npmjs.com/package/toad-scheduler) runs
  refresh on an interval (default **10 hours** in code).
- **HTTP API:** `GET /api/token` returns the stored access token when request headers
  match values in `auth.js` (org, sender, passphrase, source IP, content types).

## Extensions in this Playbook (not in upstream Express app)

- **`GET /login`** and **`GET /auth/webex/callback`** — Browser **OAuth 2.0
  authorization-code** flow: redirect to Webex authorize, exchange `code` for tokens,
  persist via `tokenService.updateToken`. Uses **`REDIRECT_URI`**, **`OAUTH_SCOPES`**,
  and a short-lived **`oauth_state`** cookie for CSRF protection on the callback.
- **Scheduler refresh source:** Prefers **`refresh_token`** stored in SQLite after OAuth;
  falls back to **`REFRESH_TOKEN`** in `.env` if the database has none; **no-op** if
  neither is set (avoids failed refresh calls before first login).

## Video and tutorials

- [REFRESH Token Management and Calling WebexCC API from Flow Designer](https://app.vidcast.io/share/c5876929-2d94-40b6-96e5-ae541b42b413)
- [WebexCC Postman tutorial](https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/postman-sample) (repo sibling)
- [OAuth 2.0](https://oauth.net/2/)

## `REDIRECT_URI` in env template

Register this URI on your Webex Integration so it matches **`REDIRECT_URI`** in `.env`
exactly (including scheme, host, port, and path **`/auth/webex/callback`**).

## Support (upstream)

- [Webex Contact Center Developer Support](https://developer.webex.com/explore/support)
- [Webex Contact Center APIs Developer Community](https://community.cisco.com/t5/contact-center/bd-p/j-disc-dev-contact-center)

## Disclaimer (from upstream README)

Samples are for learning and demos, not production. Plan for multi-org token storage,
secret management, and network controls before production use.
