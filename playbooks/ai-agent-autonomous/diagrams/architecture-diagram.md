# Architecture — Autonomous AI Agent (Package Tracking)

High-level flow for the vendored Flow Designer sample: inbound voice enters WxCC, the flow invokes the autonomous AI agent via VAV2, then either completes in the AI path or escalates to a human agent queue.

```mermaid
flowchart LR
  subgraph entry [Inbound]
    Caller[Caller]
  end

  subgraph wxcc [Webex Contact Center]
    EP[Entry point / Flow]
    VAV2[Virtual Agent V2]
    PM[Play Message]
    Q[Queue to Agent]
    MU[Play Music]
    DC[Disconnect]
  end

  subgraph ai [AI]
    Agent[Autonomous AI Agent\npackage tracking + KB]
  end

  subgraph human [Human]
    Live[Live agent]
  end

  Caller --> EP
  EP --> VAV2
  VAV2 <--> Agent
  VAV2 -->|escalation or error path| PM
  PM --> Q
  Q --> MU
  Q --> Live
  VAV2 --> DC
  Q --> DC
```
