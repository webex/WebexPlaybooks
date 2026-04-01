# Architecture Diagram — Cisco UCM to Webex Calling Migration

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Migration Operator
    participant EnvFile as .env File
    participant Script as main.py
    participant UCMReader as ucm_reader module
    participant UCM as Cisco UCM<br/>(AXL SOAP API)
    participant WxcSDK as wxc_sdk<br/>AsWebexSimpleApi
    participant WebexCalling as Webex Calling API<br/>(api.ciscospark.com)

    Admin->>EnvFile: Set AXL_HOST, AXL_USER, AXL_PASSWORD,<br/>WEBEX_ACCESS_TOKEN, GMAIL_ID
    Admin->>Script: python main.py

    Script->>WxcSDK: validate_access_token()<br/>Bearer WEBEX_ACCESS_TOKEN
    WxcSDK->>WebexCalling: GET /v1/people?displayName=xyz
    WebexCalling-->>WxcSDK: 200 OK (token valid)
    WxcSDK-->>Script: Token validated

    Script->>UCMReader: UCMReader(AXL_HOST, AXL_USER, AXL_PASSWORD)
    Note over UCMReader,UCM: HTTP Basic auth over HTTPS (AXL port 443/8443)
    UCMReader->>UCM: SOAP listUser (AXL)
    UCM-->>UCMReader: User records (name, mailid, telephoneNumber, primaryExtension)
    UCMReader-->>Script: List[User]

    Script->>Script: Filter users by NPA prefix and validate<br/>(mailid present, extension matches telephoneNumber)

    par Parallel API calls via asyncio.gather
        Script->>WxcSDK: licenses.list_gen()
        WxcSDK->>WebexCalling: GET /v1/licenses
        WebexCalling-->>WxcSDK: Calling license list
        WxcSDK-->>Script: calling_licenses[]

        Script->>WxcSDK: locations.list(name='SJC')
        WxcSDK->>WebexCalling: GET /v1/locations?name=SJC
        WebexCalling-->>WxcSDK: Location record
        WxcSDK-->>Script: sjc_location

        Script->>WxcSDK: telephony.phone_numbers()
        WxcSDK->>WebexCalling: GET /v1/telephony/config/numbers
        WebexCalling-->>WxcSDK: Available TNs and extension owners
        WxcSDK-->>Script: available_tns[], owners{}
    end

    loop For each UCM user (up to PARALLEL_TASKS concurrent)
        Script->>WxcSDK: people.list(email=webex_email)
        WxcSDK->>WebexCalling: GET /v1/people?email=...
        WebexCalling-->>WxcSDK: Existing user check
        alt User does not exist and TN/extension available
            Script->>WxcSDK: people.create(email, displayName, firstName, lastName)
            WxcSDK->>WebexCalling: POST /v1/people
            WebexCalling-->>WxcSDK: New user (personId)
            Script->>WxcSDK: people.update(personId, extension, locationId,<br/>license, phoneNumber)
            WxcSDK->>WebexCalling: PUT /v1/people/{personId}?callingData=true
            WebexCalling-->>WxcSDK: Updated user record
        else READONLY=True or conflict
            Script->>Script: Log skip reason
        end
    end

    Script->>Admin: Log file (main.log) + console summary
```

## Notes

- **Authentication:** UCM AXL uses HTTP Basic auth (`AXL_USER`/`AXL_PASSWORD`) over HTTPS. Webex Calling uses a Bearer token (`WEBEX_ACCESS_TOKEN`).
- **Parallel execution:** `asyncio.gather` runs up to `PARALLEL_TASKS` (default: 10) user provisioning coroutines concurrently to reduce wall-clock migration time.
- **READONLY guard:** When `READONLY = True` in `main.py`, the `people.create` and `people.update` calls are skipped. All validation and logging still runs, enabling a safe dry run.
- **Dial plan migration flow** (`read_gdpr.py`) follows the same UCM AXL pattern but writes directly to a CSV file rather than calling the Webex API.
