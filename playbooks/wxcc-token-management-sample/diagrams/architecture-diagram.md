# WxCC token management sample

```mermaid
sequenceDiagram
    participant FD as FlowDesignerOrClient
    participant App as NodeExpressApp
    participant DB as SQLiteSequelize
    participant OAuth as WebexOAuthTokenEndpoint

    Note over App: Startup and every N hours
    App->>OAuth: POST /v1/access_token grant_type=refresh_token
    OAuth->>App: access_token refresh_token expires_in
    App->>DB: upsert tokens row

    FD->>App: GET /api/token with x-organization-id x-from x-api-phrase
    App->>App: auth.js validates headers vs env
    App->>DB: read access token
    App->>FD: JSON token payload
```

- **Refresh path:** `scheduler/scheduler.js` calls `https://webexapis.com/v1/access_token` using `CLIENT_ID`, `CLIENT_SECRET`, and `REFRESH_TOKEN` from the environment, then persists the result via `service/tokenService.js`.
- **Read path:** `server.js` exposes `GET /api/token` only when `auth.js` accepts the caller (org ID, `FROM`, `PASSPHRASE` as `x-api-phrase`, `SOURCE_IP`, and JSON content types).
- **Storage:** Default SQLite file at `src/db/db.sqlite` (see `db/db.js` and `env.template`).
