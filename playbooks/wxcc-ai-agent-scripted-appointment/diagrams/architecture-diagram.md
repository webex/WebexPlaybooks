# Architecture Diagram — WxCC AI Agent Scripted Doctor's Appointment Booking

This diagram shows the end-to-end call flow from the moment a customer dials in through multi-event fulfillment, or human escalation.

```mermaid
sequenceDiagram
    participant Caller as Caller
    participant EP as WxCC Entry Point
    participant FD as Flow Designer
    participant VAV2 as Virtual Agent V2
    participant AIAS as Webex AI Agent Studio
    participant API as Appointment API
    participant Queue as Agent Queue
    participant Agent as Human Agent

    Caller->>EP: Inbound voice call
    EP->>FD: NewPhoneContact event triggers flow
    FD->>VAV2: Start VirtualAgentV2_vej (Webex AI Agent Scripted connector)
    VAV2->>AIAS: Connect to scripted AI agent

    loop Conversation
        Caller->>AIAS: Speaks request (e.g. "book an appointment")
        AIAS-->>Caller: Collects details via intent/slot interaction
    end

    alt Agent raises a custom event (ENDED edge)
        AIAS-->>VAV2: Custom exit event with StateEventName + MetaData
        VAV2-->>FD: Output: ENDED
        FD->>FD: Parse_t66 — extract http_input from VAV2 MetaData

        alt StateEventName == check_availability_exit
            FD->>API: HTTPRequest_lnz POST /check_availability
            API-->>FD: Available slots response
            alt HTTP 200
                FD->>FD: SetVariable_ibj — event_name = check_availability_confirm_entry
            else HTTP error
                FD->>Caller: PlayMessage_l92 (TTS error)
                FD->>Queue: QueueContact_y90
            end
        else StateEventName == create_appointment_exit
            FD->>API: HTTPRequest_dc4 POST /create_appointment
            API-->>FD: Booking confirmation response
            alt HTTP 200
                FD->>FD: SetVariable_3vp — event_name = create_appointment_confirm_entry
            else HTTP error
                FD->>Caller: PlayMessage_l92 (TTS error)
                FD->>Queue: QueueContact_y90
            end
        else StateEventName == lookup_appointment_exit
            FD->>API: HTTPRequest_l63 POST /lookup_appointment
            API-->>FD: Appointment details response
            alt HTTP 200
                FD->>FD: SetVariable_zb4 — event_name = lookup_appointment_confirm_entry
            else HTTP error
                FD->>Caller: PlayMessage_l92 (TTS error)
                FD->>Queue: QueueContact_y90
            end
        else StateEventName == cancel_appointment_exit
            FD->>API: HTTPRequest_nuq POST /cancel_appointment
            API-->>FD: Cancellation confirmation response
            alt HTTP 200
                FD->>FD: SetVariable_2vl — event_name = cancel_appointment_confirm_entry
            else HTTP error
                FD->>Caller: PlayMessage_l92 (TTS error)
                FD->>Queue: QueueContact_y90
            end
        else Unrecognised StateEventName (default/error branch)
            FD->>FD: DisconnectContact_p0y
        end

        FD->>FD: SetVariable_r6r — event_data_string = event_data (stringify JSON)
        FD->>VAV2: Resume via State Event (event_name + event_data_string)
        VAV2->>AIAS: Deliver confirm event with API result
        AIAS-->>Caller: Respond with appointment result

        AIAS-->>VAV2: Conversation ends (next ENDED or ESCALATE)

    else Caller requests human agent
        AIAS-->>VAV2: ESCALATE signal
        VAV2-->>FD: Output: ESCALATE
        FD->>Queue: QueueContact_y90 (escalation queue)
        FD->>Caller: PlayMusic_sr1 (hold loop)
        Queue->>Agent: Route to available agent
        Agent-->>Caller: Agent answers call

    else VAV2 system error
        VAV2-->>FD: Output: error
        FD->>Caller: PlayMessage_l92 (Cisco TTS error message)
        FD->>Queue: QueueContact_y90 (escalation queue)
        FD->>Caller: PlayMusic_sr1 (hold loop)
        Queue->>Agent: Route to available agent
        Agent-->>Caller: Agent answers call
    end
```

## Component Summary

| Component | Role |
|---|---|
| WxCC Entry Point | Receives the inbound PSTN call and routes to the flow |
| Flow Designer | Orchestrates multi-event fulfillment, State Event exchange, and queue routing |
| Virtual Agent V2 | WxCC activity bridging the voice call to AI Agent Studio (Scripted connector) |
| Webex AI Agent Studio | Hosts the scripted AI agent with appointment intents and slots |
| Appointment API | Demo HTTP API with four endpoints: check availability, create, lookup, and cancel |
| Parse Activity (`Parse_t66`) | Extracts `http_input` from VAV2 MetaData after the ENDED edge fires |
| Case Activity (`Case_9ia`) | Routes flow execution to the correct HTTP request based on `StateEventName` |
| Agent Queue | Holds callers waiting for a human agent on escalation or error paths |
| Human Agent | Handles escalated or error-path calls |

## Key Flow Decision Points

- **ENDED + StateEventName** — the scripted AI agent raises one of four custom exit events; `Case_9ia` selects the matching HTTP endpoint. The flow returns the API result via a confirm State Event, resuming the conversation.
- **ESCALATE** — the caller explicitly requests a human; the flow routes directly to the escalation queue.
- **error** — a system-level fault in the Virtual Agent V2 activity; the flow plays a TTS apology and routes to the escalation queue as a fallback.
- **HTTP non-200** — each Condition activity's `false` branch routes to `PlayMessage_l92` then the escalation queue, ensuring the caller is always handled even when the appointment API is unavailable.
- **Case default/error** — an unrecognised `StateEventName` or Case error routes directly to `DisconnectContact_p0y`.
