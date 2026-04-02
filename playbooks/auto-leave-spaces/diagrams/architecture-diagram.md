# Architecture

Real-time **conversation.activity** events can drive **Rooms** lookups and **Memberships** changes after a title matches the block list and **`hide_direct`** or **`leave_group_spaces`** is enabled in YAML.

```mermaid
sequenceDiagram
    participant Script as "auto_leave.py"
    participant WDM as "Webex WDM API"
    participant WS as "Webex WebSocket"
    participant RoomsAPI as "Webex Rooms API"
    participant MembershipsAPI as "Webex Memberships API"

    Script->>WDM: List or create device
    WDM-->>Script: webSocketUrl
    Script->>WS: TLS connect
    Script->>WS: Send Bearer token
    loop Conversation events
        WS-->>Script: conversation.activity
        Note over Script: post or add when you join, skip your own activity
        Script->>RoomsAPI: GET room details
        alt Title matches block list regex
            opt hide_direct is true and space is direct
                Script->>MembershipsAPI: Update membership to hide
            end
            opt leave_group_spaces is true and space is group
                Script->>MembershipsAPI: Delete membership to leave
            end
        end
    end
```

OAuth tokens are obtained via the **wxc-sdk** integration helper (browser flow when not in Docker, or printed auth URL in Docker). Tokens refresh on a timer and the WebSocket is re-authorized after refresh.

If both YAML flags are **`false`**, a matching title only produces logs (no **Memberships** calls). The **`opt`** blocks in the diagram are the only branches where the app mutates membership.
