# Architecture Diagram — Webex Finesse Agent Presence Sync

This diagram shows the two operating modes of the integration: **Gadget mode** (recommended) and **Server mode**.

```mermaid
sequenceDiagram
    autonumber
    participant WebexApp as Webex App (Agent)
    participant WebexCloud as Webex Cloud (Mercury WS)
    participant Server as Node.js Server
    participant FinesseServer as Cisco Finesse Server
    participant FinesseDesktop as Finesse Agent Desktop (Browser)

    note over Server,WebexCloud: Startup — subscription initialization
    Server->>WebexCloud: Authenticate with Bot access token
    WebexCloud-->>Server: Token validated, SDK initialized
    Server->>FinesseServer: GET /finesse/api/Users (Basic Auth — admin token)
    FinesseServer-->>Server: XML user list (loginName → loginId mapping)
    loop For each configured agent (FINESSE_USERS)
        Server->>WebexCloud: presence.subscribe(webexUserId, TTL=600s)
        WebexCloud-->>Server: Subscription confirmed
        Server->>WebexCloud: presence.list([webexUserId])
        WebexCloud-->>Server: Current presence snapshot
        Server->>Server: Store presence in presenceHash
        note over Server: Re-subscribe every 5 min to maintain TTL
    end

    note over WebexApp,FinesseDesktop: Runtime — presence change event
    WebexApp->>WebexCloud: Agent status changes (DND / Call / Meeting / etc.)
    WebexCloud-->>Server: Mercury WS event: apheleia.subscription_update
    Server->>Server: Map Webex user ID → Finesse loginId
    Server->>Server: Evaluate new presence status

    alt Gadget Mode (GADGET_MODE=true — recommended)
        note over Server,FinesseDesktop: Gadget mode uses Socket.io push
        FinesseDesktop->>Server: Socket.io connect + register {id: finesseLoginId}
        Server->>FinesseDesktop: Socket.io emit "message" (presence data)
        FinesseDesktop->>FinesseDesktop: Evaluate presence status in gadget JS
        alt Webex DND / Call / Meeting / Presenting / Unavailable
            FinesseDesktop->>FinesseServer: Finesse JS API: user.setState("NOT_READY", reasonCode)
            note right of FinesseDesktop: Reason codes: "Webex DND", "Webex Call",<br/>"Webex Meeting", "Webex Unavailable"
        else Presence cleared
            FinesseDesktop->>FinesseServer: Finesse JS API: user.setState("READY")
        end
    else Server Mode (GADGET_MODE=false)
        note over Server,FinesseServer: Server mode uses direct REST API call
        alt Webex DND or active Webex Meeting
            Server->>FinesseServer: PUT /finesse/api/User/:id (NOT_READY — supervisor token)
        else Presence cleared
            Server->>FinesseServer: PUT /finesse/api/User/:id (READY — supervisor token)
        end
        FinesseServer-->>Server: HTTP 202 Accepted
    end
```

## Component Descriptions

| Component | Role |
|-----------|------|
| **Webex App (Agent)** | The agent's Webex desktop or mobile client. Presence changes here (DND, call, meeting) are the trigger. |
| **Webex Cloud (Mercury WS)** | Webex's real-time event infrastructure. The Node.js server subscribes to presence events via a persistent WebSocket connection using the internal `apheleia` event channel. |
| **Node.js Server** | The integration bridge. Subscribes to Webex presence, loads the Finesse user map, and either pushes via Socket.io (gadget mode) or calls the Finesse REST API (server mode). |
| **Cisco Finesse Server** | The contact center desktop platform. Exposes a REST API for reading and setting agent state. In gadget mode, also hosts the gadget framework used by the agent desktop. |
| **Finesse Agent Desktop (Browser)** | The agent's browser running the Finesse desktop. In gadget mode, loads the `WebexPresenceConnector` gadget, which connects to the Node.js server via Socket.io and calls the Finesse client-side JS API to set agent state directly. |

## Authentication Summary

| Credential | Used By | Purpose |
|-----------|---------|---------|
| `WEBEX_ACCESS_TOKEN` (Bot token) | Node.js Server → Webex Cloud | Authenticates SDK, subscribes to presence events |
| `FINESSE_ADMIN_TOKEN` (Basic Auth) | Node.js Server → Finesse REST API | Reads agent user list on startup; reads current agent state (server mode) |
| `FINESSE_SUPERVISOR_TOKEN` (Basic Auth) | Node.js Server → Finesse REST API | Sets agent state in server mode only |
| Finesse gadget session | Finesse Desktop → Finesse Server | The gadget runs in the agent's authenticated Finesse session; no extra credentials needed for gadget mode state changes |
