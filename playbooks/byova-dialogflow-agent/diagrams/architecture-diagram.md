# Architecture Diagram — BYOVA Dialogflow CX Gateway

This diagram shows the full call flow from an inbound caller through Webex Contact Center, the BYOVA gRPC gateway, and Google Dialogflow CX.

```mermaid
sequenceDiagram
    autonumber
    participant Caller
    participant WxCC as WxCC<br/>BYOVA Entry Point
    participant Gateway as BYOVA Gateway<br/>(Python gRPC, port 50051)
    participant Router as VirtualAgentRouter
    participant Connector as DialogflowCXConnector
    participant Dialogflow as Google Dialogflow CX
    participant Monitor as Monitoring Dashboard<br/>(Flask HTTP, port 8080)

    Note over WxCC,Gateway: Gateway must be publicly reachable on port 50051

    WxCC->>Gateway: gRPC ListVirtualAgents(customer_org_id)
    Gateway->>Router: get_all_available_agents()
    Router-->>Gateway: ["Dialogflow CX Agent"]
    Gateway-->>WxCC: ListVAResponse(virtual_agents)

    Caller->>WxCC: Inbound voice call → BYOVA entry point
    WxCC->>Gateway: gRPC ProcessCallerInput — SESSION_START event
    Gateway->>Router: route_request → start_conversation
    Router->>Connector: start_conversation(conversation_id)
    Connector->>Dialogflow: DetectIntent("hi") + OutputAudioConfig(8kHz MULAW)
    Dialogflow-->>Connector: Welcome message text + synthesized audio
    Connector-->>Gateway: session_start_response(audio_content)
    Gateway-->>WxCC: VoiceVAResponse(prompts[audio], FINAL)
    WxCC-->>Caller: AI welcome greeting played

    loop Caller speaks — audio stream
        WxCC->>Gateway: gRPC ProcessCallerInput — audio_input (640 bytes/80ms, 8kHz MULAW)
        Gateway->>Router: route_request → send_message(audio)
        Router->>Connector: _handle_audio_input
        Note over Connector: Accumulate audio 2.5–5 seconds before sending
        Connector->>Dialogflow: DetectIntent(combined_audio, OutputAudioConfig)
        Dialogflow-->>Connector: Intent + fulfillment text + synthesized audio (8kHz MULAW)
        Connector-->>Gateway: agent_response + audio
        Gateway-->>WxCC: VoiceVAResponse(prompts[text+audio], FINAL)
        WxCC-->>Caller: AI voice response played
    end

    alt Virtual agent ends session
        Dialogflow-->>Connector: Session end intent detected
        Connector-->>Gateway: message_type="goodbye"
        Gateway-->>WxCC: VoiceVAResponse(output_events=[SESSION_END])
        WxCC-->>Caller: Call ends
    else Virtual agent escalates to live agent
        Dialogflow-->>Connector: Transfer intent detected
        Connector-->>Gateway: message_type="transfer"
        Gateway-->>WxCC: VoiceVAResponse(output_events=[TRANSFER_TO_AGENT])
        WxCC->>WxCC: Route caller to agent queue
    end

    Note over Gateway,Monitor: Operators can monitor gateway health at any time
    Monitor->>Gateway: HTTP GET /health
    Gateway-->>Monitor: {"status": "healthy", "active_sessions": N}
    Monitor->>Gateway: HTTP GET /api/connections
    Gateway-->>Monitor: Connection events and active conversations
    Monitor->>Gateway: HTTP GET /api/status
    Gateway-->>Monitor: Router info, loaded connectors, available agents
```

## Component Descriptions

| Component | Technology | Port | Purpose |
|-----------|-----------|------|---------|
| **WxCC BYOVA Entry Point** | Webex Contact Center | — | Receives inbound calls; routes to BYOVA-configured virtual agent |
| **BYOVA Gateway** | Python 3.8+, gRPC (grpcio) | 50051 | Implements `VoiceVirtualAgent` gRPC service; bridges WxCC ↔ AI backend |
| **VirtualAgentRouter** | Python | — | Loads connector plugins from `config.yaml`; routes calls by agent ID |
| **DialogflowCXConnector** | Google Cloud Dialogflow CX SDK | — | Converts WxCC audio to Dialogflow API calls; handles auth (ADC / OAuth / SA key) |
| **Google Dialogflow CX** | Google Cloud | HTTPS | Natural language understanding; intent detection; SSML/audio response synthesis |
| **Monitoring Dashboard** | Flask (Python) | 8080 | HTTP endpoints + browser UI for session tracking and health checks |

## Audio Format Details

WxCC sends caller audio in **8kHz G.711 μ-law (MULAW)** format at ~640 bytes per 80ms chunk. The connector:

1. **Accumulates** chunks for 2.5–5 seconds (configurable via `min_audio_seconds` / `max_audio_seconds`)
2. **Detects format** automatically based on chunk size (640-byte chunks = WxCC; larger = test files)
3. **Converts** if the target connector requires a different format (e.g., 16kHz LINEAR_16)
4. **Sends** to Dialogflow CX `DetectIntent` with the configured `InputAudioConfig`
5. **Receives** synthesized speech from Dialogflow in 8kHz MULAW (compatible with WxCC telephony)

## Authentication Flow (Dialogflow CX)

```mermaid
flowchart LR
    A[Gateway starts] --> B{Which auth config?}
    B -->|service_account_key set| C[Load SA key JSON file\nroles/dialogflow.client]
    B -->|oauth_client_id + secret set| D[Load cached pickle token\nor run OAuth browser flow]
    B -->|No auth params| E[Application Default Credentials\ngcloud auth app-default login\nor GCP workload identity]
    C --> F[DialogflowCX SessionsClient initialized]
    D --> F
    E --> F
```
