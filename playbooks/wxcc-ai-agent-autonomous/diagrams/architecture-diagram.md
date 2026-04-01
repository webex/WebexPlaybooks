# Architecture Diagram — WxCC AI Agent Autonomous Package Tracking

This diagram shows the end-to-end call flow from the moment a customer dials in through resolution or human escalation.

```mermaid
sequenceDiagram
    participant Caller as Caller
    participant EP as WxCC Entry Point
    participant FD as Flow Designer
    participant VAV2 as Virtual Agent V2
    participant AIAS as Webex AI Agent Studio
    participant FF as Fulfillment Action
    participant Queue as Agent Queue
    participant Agent as Human Agent

    Caller->>EP: Inbound voice call
    EP->>FD: NewPhoneContact event triggers flow
    FD->>VAV2: Start Virtual Agent V2 activity
    VAV2->>AIAS: Connect via Webex AI Agent (Autonomous) connector

    loop Conversation
        Caller->>AIAS: Speaks query ("Where is my package?")
        AIAS->>FF: Invoke package-tracking fulfillment action
        FF-->>AIAS: Return tracking result
        AIAS-->>Caller: Respond with tracking info or follow-up question
    end

    alt Conversation ends normally
        AIAS-->>VAV2: ENDED signal
        VAV2-->>FD: Output: ENDED
        FD->>Caller: DisconnectContact
    else Caller requests human agent
        AIAS-->>VAV2: ESCALATE signal
        VAV2-->>FD: Output: ESCALATE
        FD->>Queue: QueueContact (Queue-1, Longest Available Agent)
        FD->>Caller: PlayMusic (hold loop)
        Queue->>Agent: Route to available agent
        Agent-->>Caller: Agent answers call
    else VAV2 system error
        VAV2-->>FD: Output: error
        FD->>Caller: PlayMessage (Cisco TTS error message)
        FD->>Queue: QueueContact (Queue-1)
        FD->>Caller: PlayMusic (hold loop)
        Queue->>Agent: Route to available agent
        Agent-->>Caller: Agent answers call
    end
```

## Component Summary

| Component | Role |
|---|---|
| WxCC Entry Point | Receives the inbound PSTN call and routes to the flow |
| Flow Designer | Orchestrates the call using the `ai_agent_autonomous` flow |
| Virtual Agent V2 | WxCC activity that bridges the voice call to AI Agent Studio |
| Webex AI Agent Studio | Hosts the autonomous AI agent with actions and knowledge base |
| Fulfillment Action | Executes package lookup logic (via Webex Connect or webhook) |
| Agent Queue (`Queue-1`) | Holds the call when a human agent is needed |
| Human Agent | Handles escalated or error-path calls |

## Key Flow Decision Points

- **ENDED** — the AI agent determines the caller's need has been met and signals end of conversation; the flow disconnects the call.
- **ESCALATE** — the caller explicitly requests a human (or the AI agent determines it cannot resolve the query); the flow routes to the queue.
- **error** — a system-level fault in the Virtual Agent V2 activity; the flow plays a TTS apology message and routes to the queue as a fallback.
