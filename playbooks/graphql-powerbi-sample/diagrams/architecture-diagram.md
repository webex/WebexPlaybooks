# Architecture — WxCC GraphQL to Power BI

This diagram shows how the sample connects Microsoft Power BI to the Webex Contact Center GraphQL Search API through a local Spring Boot app.

```mermaid
sequenceDiagram
  participant PBI as PowerBI_or_tool
  participant App as SpringBoot_app
  participant WebexOAuth as Webex_OAuth
  participant WxCC as WxCC_GraphQL_Search

  Note over App,WebexOAuth: First-time or expired token
  PBI->>App: HTTP_GET_root_with_query_params
  App->>WebexOAuth: Redirect_user_authorize
  WebexOAuth-->>App: Authorization_code_callback
  App->>WebexOAuth: POST_access_token
  WebexOAuth-->>App: Access_and_refresh_tokens

  Note over PBI,WxCC: Data pull
  PBI->>App: HTTP_GET_for_table_JSON_or_CSV
  App->>WxCC: POST_search_GraphQL
  WxCC-->>App: Reporting_JSON
  App-->>PBI: Flattened_rows_response
```

OAuth uses `webexapis.com`. GraphQL Search calls use the configured `DATA_CENTER_URL` (for example `https://api.wxcc-us1.cisco.com`).
