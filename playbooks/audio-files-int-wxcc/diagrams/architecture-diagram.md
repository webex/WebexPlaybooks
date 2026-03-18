# Architecture Diagram — Audio Files Integration

```mermaid
sequenceDiagram
    participant User
    participant ReactApp as React App (Frontend)
    participant WebexOAuth as Webex OAuth / User Info
    participant Backend as Express Backend
    participant MongoDB
    participant WxCCAPI as WxCC Audio Files API

    User->>ReactApp: Open app, click Login
    ReactApp->>WebexOAuth: Redirect (authorize, client_id, redirect_uri, scope)
    WebexOAuth->>User: Sign in / consent
    WebexOAuth->>ReactApp: Redirect to /oauth?code=...
    ReactApp->>Backend: POST /api/users (code)
    Backend->>WebexOAuth: POST /access_token (code, client_id, client_secret, redirect_uri)
    WebexOAuth->>Backend: access_token, refresh_token
    Backend->>WebexOAuth: GET /userinfo (Bearer token)
    WebexOAuth->>Backend: user info (email, org, etc.)
    Backend->>MongoDB: Store/update User (tokens, orgId)
    Backend->>ReactApp: 200 { email }

    User->>ReactApp: Go to Audio Files or Upload
    ReactApp->>Backend: GET /api/audiofiles?email=... or POST multipart
    Backend->>MongoDB: Find user by email (get accessToken, orgId)
    Backend->>WxCCAPI: GET /organization/{orgId}/v2/audio-file (or POST/PATCH/DELETE)
    Note over Backend,WxCCAPI: Authorization: Bearer accessToken
    WxCCAPI->>Backend: JSON (list) or success
    Backend->>MongoDB: Sync audio file metadata (list flow)
    Backend->>ReactApp: JSON response
    ReactApp->>User: List / upload result
```

- **Trigger:** User opens the app and signs in with Webex (OAuth 2.0 authorization code).
- **Authentication:** Backend exchanges the code for tokens at `webexapis.com`, stores them in MongoDB, and uses the access token for all WxCC API calls.
- **API calls:** Backend calls the Webex Contact Center Audio Files API (list, create, update, delete) using the organization ID and Bearer token from the stored user.
