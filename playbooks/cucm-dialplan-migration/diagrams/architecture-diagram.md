# Architecture Diagram — Cisco UCM Dial Plan + Webex Calling Integration

The integration operates as a three-stage offline pipeline executed from an administrator workstation. No inbound webhooks or persistent services are required.

```mermaid
sequenceDiagram
    autonumber
    participant Admin as Administrator Workstation
    participant UCM as Cisco UCM<br/>(AXL SOAP :8443)
    participant CSV as Local CSV Files<br/>(read_ucm.csv / normalized.csv)
    participant Config as config.yml<br/>(token cache)
    participant WebexOAuth as Webex OAuth<br/>(webexapis.com)
    participant WxC as Webex Calling API<br/>(Premises PSTN)

    Note over Admin,UCM: Stage 1 — Read patterns from UCM

    Admin->>UCM: read_ucm.py<br/>HTTP Basic Auth over HTTPS
    UCM-->>Admin: ILS learned patterns<br/>(remoteroutingpattern SQL query)
    Admin->>CSV: write read_ucm.csv<br/>(catalog, pattern)

    Note over Admin,CSV: Stage 2 — Normalize patterns

    Admin->>CSV: normalize.py read_ucm.csv
    CSV-->>Admin: raw patterns per catalog
    Admin->>CSV: write normalized.csv<br/>(conflict-resolved, bracket-expanded)

    Note over Admin,WxC: Stage 3 — Provision dial plans in Webex Calling

    Admin->>Config: configure_wxc.py normalized.csv<br/>reads config.yml
    Config-->>Admin: cached tokens (if present)

    alt No valid token cached
        Admin->>WebexOAuth: OAuth 2.0 Authorization Code flow<br/>(redirect_uri: localhost:6001/redirect)
        WebexOAuth-->>Admin: access_token + refresh_token
        Admin->>Config: persist tokens to config.yml
    end

    Admin->>WxC: GET trunks, route groups, dial plans<br/>(Bearer token)
    WxC-->>Admin: existing resources

    loop For each dial plan in config.yml
        Admin->>WxC: POST /telephony/config/premisePstn/dialPlans<br/>(create if missing)
        Admin->>WxC: PUT dial plan patterns<br/>(add new, delete removed — batches of 200)
        WxC-->>Admin: 200 OK
    end

    Admin->>Config: auto-refresh token if expiring
```

## Component Descriptions

| Component | Role |
|---|---|
| Administrator Workstation | Runs the Python CLI scripts; requires network access to UCM (:8443) and Webex APIs |
| Cisco UCM (AXL SOAP) | Source of ILS-learned dial patterns; queried via the Thin AXL SOAP API using SQL queries |
| Local CSV Files | Intermediate data store; `read_ucm.csv` (raw) and `normalized.csv` (processed) |
| config.yml | Stores OAuth token cache and dial plan mapping configuration |
| Webex OAuth | Issues and refreshes access tokens for the Webex Calling API via Authorization Code flow |
| Webex Calling API (Premises PSTN) | Creates and manages dial plans, trunk/route group assignments, and dial patterns |

## Security Notes

- UCM access uses HTTP Basic Auth over HTTPS. TLS certificate validation is **disabled by default** in the upstream code — enable it for production use (see Known Limitations in README.md).
- Webex API access uses short-lived OAuth 2.0 access tokens. Tokens are cached in `config.yml` (not in environment variables) and auto-refreshed using the stored refresh token.
- UCM credentials (`AXL_USER`, `AXL_PASSWORD`) and Webex integration credentials (`TOKEN_INTEGRATION_CLIENT_ID`, `TOKEN_INTEGRATION_CLIENT_SECRET`) are loaded exclusively from environment variables via `python-dotenv`. They must never be committed to source control.
