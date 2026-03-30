# WxCC GraphQL wallboard

```mermaid
sequenceDiagram
    participant Browser as OperatorBrowser
    participant App as ExpressApp
    participant Search as WxCC_Search_API

    Browser->>App: GET / (static wallboard UI)
    Browser->>App: GET /callCountByEntryPoint (JSON)
    App->>App: decide() reads ORG_ID from process env
    Note over App: ENVIRONMENT dev uses DEV_TOKEN from env
    App->>Search: POST WXCC_API_BASE/search orgId query
    Search->>App: GraphQL task aggregations
    App->>Browser: JSON for charts
```

- **UI:** Express serves static assets from `src/views` and JSON under routes such as `/callCountByEntryPoint`.
- **Token path (dev):** With `ENVIRONMENT=dev`, tokens come from `DEV_TOKEN` in the environment (see `controller/secured/tokenFromDev.js`). Optional MongoDB routes exist for an alternate upstream flow.
- **Search API:** Wallboard controllers call the documented GraphQL Search endpoint at `{WXCC_API_BASE}/search?orgId=...` with `Authorization: Bearer <token>`.
