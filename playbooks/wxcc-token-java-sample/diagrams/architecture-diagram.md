# Architecture — WxCC Java OAuth token sample

OAuth2 authorization code flow for a browser user against Webex APIs, with the access token exposed for API experimentation.

```mermaid
sequenceDiagram
  participant User as Browser
  participant App as SpringBootApp
  participant Webex as WebexOAuth

  User->>App: GET /
  App->>User: Redirect to login
  User->>Webex: Authorize (Webex identity)
  Webex->>User: Redirect with auth code
  User->>App: GET login/oauth2/code/webexcc
  App->>Webex: POST access_token (code plus self_contained_token)
  Webex->>App: Access token
  App->>User: Session established, redirect to index
  User->>App: GET /userinfo
  App->>User: JSON user claims and Bearer token
```

For narrative context, see the **Architecture** section in [README.md](../README.md).
