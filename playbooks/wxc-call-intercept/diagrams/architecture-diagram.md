# Architecture — Webex Calling call intercept CLI

This diagram shows how the sample CLI authenticates, resolves a user, and reads or updates **call intercept** via **Webex** APIs.

```mermaid
sequenceDiagram
    participant Admin as AdminOrDeveloper
    participant CLI as call_intercept.py
    participant Token as TokenSource
    participant Webex as WebexAPIS

    Admin->>CLI: Run with user email optional on/off
    alt CLI token or WEBEX_ACCESS_TOKEN
        CLI->>Token: Use provided access token string
    else OAuth integration env vars
        CLI->>Token: build_integration TOKEN_INTEGRATION_*
        Token->>Webex: OAuth authorize redirect localhost:6001
        Admin->>Token: Browser completes login consent
        Token-->>CLI: Access token cached in local YAML
    end
    CLI->>Webex: People list filter by email
    Webex-->>CLI: person_id
    CLI->>Webex: person_settings.call_intercept.read
    Webex-->>CLI: intercept enabled state
    alt Optional on or off argument
        CLI->>Webex: person_settings.call_intercept.configure
        Webex-->>CLI: Success
        CLI->>Webex: person_settings.call_intercept.read
        Webex-->>CLI: Updated state
    end
    CLI-->>Admin: Print on or off set to on/off
```

Note: Sequence labels use simplified endpoint names; the **wxc_sdk** maps these to documented REST resources.
