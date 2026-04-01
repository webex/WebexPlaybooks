# Architecture Diagram — WxCC AI Agent Scripted Package Tracking

This diagram shows the end-to-end call flow from the moment a customer dials in through fulfillment, intent-based routing, or human escalation.

```mermaid
sequenceDiagram
    participant Caller as Caller
    participant EP as WxCC Entry Point
    participant FD as Flow Designer
    participant VAV2 as Virtual Agent V2
    participant AIAS as Webex AI Agent Studio
    participant API as Package Tracking API
    participant Queue as Agent Queue
    participant Agent as Human Agent

    Caller->>EP: Inbound voice call
    EP->>FD: NewPhoneContact event triggers flow
    FD->>FD: SetVariable — CustomAIAgentInteractionOutcome = "started"
    FD->>VAV2: Start VirtualAgentV2 activity (Webex AI Agent Scripted connector)
    VAV2->>AIAS: Connect to scripted AI agent

    loop Conversation
        Caller->>AIAS: Speaks query ("Where is my package?")
        AIAS-->>Caller: Collects package number via intent/slot
    end

    alt Caller provides package number (trackPackage intent)
        AIAS-->>VAV2: Raises custom event (Handled edge)
        VAV2-->>FD: Output: Handled
        FD->>FD: Parse_iga — extract PackageNumber from VAV2 metadata
        FD->>API: HTTPRequest GET /track/PackageNumber
        API-->>FD: Return status and estimatedDelivery

        alt Package found
            FD->>FD: SetVariable — packageResp with tracking details
        else Package not found
            FD->>FD: SetVariable — packageResp = "No package found"
        else HTTP error
            FD->>FD: SetVariable — packageResp = error message
        end

        FD->>FD: Set eventName and eventData for State Event
        FD->>VAV2: Resume via State Event (send packageResp back to agent)
        VAV2->>AIAS: Deliver State Event with tracking result
        AIAS-->>Caller: Respond with package status or delivery estimate

        AIAS-->>VAV2: Conversation ends (ENDED)
        VAV2-->>FD: Output: ENDED
        FD->>FD: Case_wnh — branch on previousIntent
        alt previousIntent == "Track Package"
            FD->>Queue: QueueContact_abk (Track Package queue)
        else Other intent
            FD->>Queue: QueueContact_9hx (General queue)
        end
        FD->>Caller: PlayMusic (hold loop)
        Queue->>Agent: Route to available agent
        Agent-->>Caller: Agent answers call

    else Caller requests human agent
        AIAS-->>VAV2: Escalated signal
        VAV2-->>FD: Output: Escalated
        FD->>FD: SetVariable — CustomAIAgentInteractionOutcome = "escalated"
        FD->>Queue: QueueContact_9hx (General escalation queue)
        FD->>Caller: PlayMusic (hold loop)
        Queue->>Agent: Route to available agent
        Agent-->>Caller: Agent answers call

    else VAV2 system error
        VAV2-->>FD: Output: error
        FD->>FD: SetVariable — CustomAIAgentInteractionOutcome = "errored"
        FD->>Caller: PlayMessage_l1j (Cisco TTS error message)
        FD->>Queue: QueueContact_9hx (General escalation queue)
        FD->>Caller: PlayMusic (hold loop)
        Queue->>Agent: Route to available agent
        Agent-->>Caller: Agent answers call
    end
```

## Component Summary

| Component | Role |
|---|---|
| WxCC Entry Point | Receives the inbound PSTN call and routes to the flow |
| Flow Designer | Orchestrates fulfillment, State Event exchange, and intent routing |
| Virtual Agent V2 | WxCC activity bridging the voice call to AI Agent Studio (Scripted connector) |
| Webex AI Agent Studio | Hosts the scripted AI agent with intents and slots |
| Package Tracking API | Demo HTTP API returning package status and estimated delivery |
| Case Activity (`Case_wnh`) | Routes callers to different queues based on `previousIntent` |
| Agent Queue (Track Package) | Holds callers whose last intent was package tracking |
| Agent Queue (General) | Holds callers on escalation or other intents |
| Human Agent | Handles escalated or error-path calls |

## Key Flow Decision Points

- **Handled** — the scripted AI agent raises a custom event (caller has provided a package number); the flow extracts the number, calls the tracking API, and returns the result via State Event.
- **Escalated** — the caller explicitly requests a human; the flow routes directly to the general escalation queue.
- **error** — a system-level fault in the Virtual Agent V2 activity; the flow plays a TTS apology and routes to the general queue as a fallback.
- **Case branch** — after the agent concludes, the `previousIntent` variable determines which queue the caller is routed to, enabling separate handling for different inquiry types.
- **CustomAIAgentInteractionOutcome** — set at each state transition; used to build custom interaction outcome reports in Webex Analyzer.
