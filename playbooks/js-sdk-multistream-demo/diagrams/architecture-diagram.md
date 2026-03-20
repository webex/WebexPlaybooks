# Architecture

Browser React app loads the Webex JS SDK and Space Widget from CDN scripts, reads configuration from Create React App environment variables, initializes meetings with multistream, and embeds Teams messaging for the configured space.

```mermaid
sequenceDiagram
  participant User as User
  participant Browser as BrowserReactApp
  participant CDN as WebexCDN
  participant Webex as WebexCloud

  User->>Browser: Open app (npm start)
  Browser->>CDN: Load Webex UMD and Space Widget bundles
  CDN-->>Browser: window.Webex, window.webex.widget
  Note over Browser: Read REACT_APP_* from bundled env
  Browser->>Browser: Webex.init with access token
  Browser->>Webex: meetings.register
  Browser->>Webex: meetings.create(SIP_URL)
  Webex-->>Browser: Meeting object
  Browser->>Browser: spaceWidget(spaceId) for messaging
  User->>Browser: Join Meeting
  Browser->>Webex: joinWithMedia (enableMultistream)
  Webex-->>Browser: Remote audio/video layout events
```

For local development, all secrets are supplied via `.env.local` as `REACT_APP_*` variables; they are compiled into the client bundle (lab use only).
