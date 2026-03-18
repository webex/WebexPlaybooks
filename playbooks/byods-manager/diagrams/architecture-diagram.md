# BYODS Manager — Architecture

The diagram below shows how the BYODS Manager integrates with the Webex Admin API for local and optional Lambda-based token extension.

```mermaid
sequenceDiagram
    participant Admin as Developer / Admin
    participant Script as data-sources.py / extend_data_source.py
    participant TokenMgr as TokenManager
    participant WebexAPI as Webex Admin API (webexapis.com)
    participant Optional as Optional: AWS Lambda + Secrets Manager

    Admin->>Script: Run script (list / register / update / extend)
    Script->>TokenMgr: get_service_app_token()
    
    alt Local: token-config.json
        TokenMgr->>TokenMgr: Load token-config.json
    else Lambda: AWS Secrets Manager
        TokenMgr->>Optional: get_secret_value(secret_name)
        Optional-->>TokenMgr: JSON config (serviceApp + tokenManager)
    end

    TokenMgr->>WebexAPI: POST /v1/access_token (service app token)
    WebexAPI-->>TokenMgr: Service App access token

    Script->>WebexAPI: GET /v1/dataSources (or POST/PUT /v1/dataSources[/id])
    Note over WebexAPI: Uses Bearer Service App token
    WebexAPI-->>Script: Data sources list or updated resource

    Script-->>Admin: Display result or confirm success
```

- **Trigger:** User runs the script (or EventBridge triggers Lambda on a schedule).
- **Authentication:** TokenManager loads credentials from local `token-config.json` or AWS Secrets Manager, then obtains a Service App access token from Webex.
- **API calls:** Script uses that token to call Webex Data Source APIs (list, register, update, extend).
- **Response:** Results are shown in the CLI (or returned in Lambda response).
