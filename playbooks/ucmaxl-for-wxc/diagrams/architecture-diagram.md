# Architecture Diagram — UCM AXL Inventory Export for Webex Calling Migration Planning

```mermaid
sequenceDiagram
    autonumber
    participant Admin as Admin<br/>(Python script)
    participant UCM as Cisco UCM<br/>(AXL SOAP API)
    participant WxC as Webex Calling<br/>(Numbers API)
    participant CSV as ucm_device_audit.csv

    Admin->>UCM: AXLHelper(ucm_host, auth=(user, password))
    UCM-->>Admin: SOAP session established (HTTPS/8443)

    Admin->>UCM: executeSQLQuery — JOIN device + devicenumplanmap + numplan + typemodel
    UCM-->>Admin: Phone records (name, model, firmware, device pool, primary DN)

    Admin->>UCM: executeSQLQuery — JOIN device + registrationdynamic
    UCM-->>Admin: Registration state per device (Registered / Unregistered)

    Admin->>WxC: GET /v1/telephony/config/numbers<br/>(Bearer WEBEX_ACCESS_TOKEN, paginated)
    WxC-->>Admin: List of Webex Calling numbers (E.164 + subscriberNumber)

    loop For each UCM phone
        Admin->>Admin: match primary DN against<br/>Webex Calling subscriberNumber
        Note over Admin: Status: MATCH / NO_MATCH / NO_DN
    end

    Admin->>CSV: Write row per device<br/>(device_name, model, firmware, device_pool,<br/>primary_dn, registration_state, webex_status)
    CSV-->>Admin: ucm_device_audit.csv written
```

## Component Descriptions

| Component | Role |
|-----------|------|
| **Cisco UCM (AXL SOAP API)** | On-premises Unified Communications Manager. Exposes the Administrative XML (AXL) web service on port 8443. The `executeSQLQuery` method allows direct read access to the UCM Informix database. |
| **ucmaxl AXLHelper** | Python helper library that wraps `zeep` (SOAP client) to simplify AXL connections, version detection, and SQL batch pagination. |
| **Webex Calling Numbers API** | REST endpoint `GET /v1/telephony/config/numbers` that returns all phone numbers (DIDs and extensions) provisioned in the Webex Calling org, paginated at up to 1,000 per page. |
| **Admin (Python script)** | `main.py` — orchestrates the two-phase read (UCM inventory + Webex Calling numbers), performs DN matching, and writes the CSV report. |

## Authentication Flow

```mermaid
flowchart LR
    UCM_creds["UCM_USER / UCM_PASSWORD\n(HTTP Basic Auth)"] --> AXLHelper
    AXLHelper -->|"HTTPS POST /axl/ (SOAP)"| UCM_node["UCM Publisher\nport 8443"]

    WxC_token["WEBEX_ACCESS_TOKEN\n(Bearer)"] --> requests_session["requests.get()"]
    requests_session -->|"HTTPS GET /v1/telephony/config/numbers"| WxC_api["Webex Calling\nNumbers API"]
```
