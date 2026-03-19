# Architecture

Sequence for validating guest-to-guest (G2G) meetings: Postman drives the Webex Meetings API; optional local helper opens join/start URLs in Chrome when Postman requests hit the helper.

```mermaid
sequenceDiagram
  participant Dev as Developer
  participant Postman as Postman
  participant Api as WebexMeetingsAPI
  participant Helper as runChromeTab_localServer
  participant Browser as Chrome

  Dev->>Postman: Configure service app access token
  Postman->>Api: meetingPreferences schedulingOptions meetings joinLinks guests
  Api-->>Postman: meetingId passwords join URLs
  Postman->>Helper: HTTP GET path with encoded meeting URL
  Helper->>Browser: Open join or start URL
  Browser->>Api: Join meeting as guest or host
```

For a token smoke test without Postman, the developer can run `node check-meeting-preferences.js` against `GET /v1/meetingPreferences` using the same bearer token.
