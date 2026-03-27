# Webex Contact Center call recording export

This diagram summarizes how the Spring Boot sample authenticates with Webex Contact Center, calls the Capture API for call recording metadata and URLs, and writes audio to a configured storage backend.

```mermaid
sequenceDiagram
  participant Operator as Operator
  participant App as SpringBootApp
  participant WebexCC_OAuth as WebexCC_OAuth
  participant WxCC_Capture_API as WxCC_Capture_API
  participant Storage as Storage

  Operator->>App: Open UI and select date range
  App->>WebexCC_OAuth: Authorization code and token exchange
  WebexCC_OAuth-->>App: Access token
  App->>WxCC_Capture_API: Organization and Capture API requests
  WxCC_Capture_API-->>App: Recording metadata and media URLs
  App->>Storage: Persist WAV files or objects
  App-->>Operator: HTML summary and downloads
```
