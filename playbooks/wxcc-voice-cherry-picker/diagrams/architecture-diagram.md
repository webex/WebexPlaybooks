# Architecture Diagram — WxCC Voice Cherry Picker

This diagram shows the two main interaction paths: **call arrival** (real-time notification from the WxCC Flow) and **call claim / conference** (agent-initiated via the widget).

```mermaid
sequenceDiagram
    autonumber
    participant Caller
    participant WxCCFlow as WxCC Flow Engine
    participant Server as Cherry Picker Server (Node.js)
    participant AgentDesktop as Agent Desktop Widget (Browser)
    participant TasksAPI as WxCC Tasks API
    participant CallingAPI as Webex Calling API

    note over WxCCFlow,Server: Call Arrival — real-time notification path
    Caller->>WxCCFlow: Inbound voice call to Entry Point
    WxCCFlow->>Server: HTTP POST / (ANI, DNIS, InteractionId, OrgId, SIP Headers)
    Server->>Server: Cache call metadata by InteractionId (TTL 1hr)
    Server->>AgentDesktop: Socket.io emit to OrgId room

    note over AgentDesktop,TasksAPI: Widget Initialization — reconcile existing queue
    AgentDesktop->>TasksAPI: GET /v1/tasks?from={epoch} (every 5 seconds)
    TasksAPI-->>AgentDesktop: Task list with InteractionIds and status
    AgentDesktop->>Server: POST /callerIds (batch resolve ANI/DNIS for task IDs)
    Server-->>AgentDesktop: Cached caller metadata (ANI, DNIS, caller name)
    AgentDesktop->>AgentDesktop: Render filterable call card list (Queued/Assigned/Abandoned/Completed)

    note over AgentDesktop,TasksAPI: Path A — Agent claims a call (idle agent)
    AgentDesktop->>TasksAPI: POST /v1/tasks/{taskId}/assign (agent Bearer token)
    TasksAPI-->>AgentDesktop: 200 OK — call delivered to agent

    note over AgentDesktop,CallingAPI: Path B — Agent conferences a queued call (agent already on a call)
    AgentDesktop->>TasksAPI: POST /v1/tasks/{currentTaskId}/transfer (to hold extension)
    AgentDesktop->>TasksAPI: POST /v1/tasks/{currentTaskId}/wrapup
    AgentDesktop->>Server: Socket.io emit transfer-hold (track caller number for merge)
    AgentDesktop->>TasksAPI: POST /v1/tasks/{queuedTaskId}/assign
    note over AgentDesktop: Agent sees "Merge Calls" panel appear
    AgentDesktop->>Server: Socket.io emit transfer-merge (signal merge readiness)
    AgentDesktop->>CallingAPI: POST /v1/telephony/conference (callIds: [previousCallId, currentCallId])
    CallingAPI-->>AgentDesktop: Conference established — both calls merged
```

## Component Descriptions

| Component | Role |
|-----------|------|
| **Caller** | The inbound caller arriving at the WxCC Entry Point. |
| **WxCC Flow Engine** | Executes the Flow Builder flow. An HTTP Request node fires a webhook on `NewPhoneContact` to notify the Cherry Picker server before routing to the queue. |
| **Cherry Picker Server** | A Node.js Express + Socket.io server that receives flow webhooks, caches caller metadata in a TTL in-memory store, and pushes updates to connected widget clients. Also exposes `/callerIds` for bulk ANI/DNIS lookup and `/transfer-hold` for the conference hold-polling flow. |
| **Agent Desktop Widget** | A custom Web Component (`sa-ds-voice-sdk`) loaded in the Agent Desktop navigation panel. Uses `@wxcc-desktop/sdk` for agent identity and access token. Connects to the server via Socket.io and to the WxCC Tasks API directly using the agent's Bearer token. |
| **WxCC Tasks API** | The documented WxCC REST API (`/v1/tasks`) used to list queued calls and to assign or transfer tasks. All calls are authenticated with the agent's OAuth access token from `@wxcc-desktop/sdk`. |
| **Webex Calling API** | Used in the conference path to merge two active calls via `POST /v1/telephony/conference`. Authenticated with the agent's Webex Calling access token from `Desktop.agentContact.SERVICE.webexCalling`. |

## Authentication Summary

| Credential | Used By | Purpose |
|-----------|---------|---------|
| Agent OAuth access token (from `@wxcc-desktop/sdk`) | Widget → WxCC Tasks API | `GET /v1/tasks`, `POST /v1/tasks/{id}/assign`, `/transfer`, `/wrapup` |
| Agent Webex Calling token (from `Desktop.agentContact.SERVICE.webexCalling`) | Widget → Webex Calling API | `POST /v1/telephony/conference` — merge two call legs |
| No server-side auth | Cherry Picker Server | The server does not authenticate incoming flow webhooks. For production, add a shared secret or token validation on `POST /` |

## Data Flow Notes

- **Socket.io rooms** are scoped to `OrgId` so agents only receive calls from their own WxCC org when the server is shared.
- **Dual notification paths**: calls appear immediately via Socket.io when the Flow is configured, and are also discovered on the 5-second polling interval as a fallback. The widget deduplicates by `InteractionId`.
- **Conference flow** relies on the Webex Mercury WebSocket (`event:telephony_calls.received`) to detect when the transferred call rings back, enabling automatic call ID resolution for the conference request.
