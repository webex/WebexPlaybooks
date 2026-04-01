# WxCC AI Agent Scripted Package Tracking

> This Playbook is adapted from the [AI Agent Scripted (Package Tracking)](https://github.com/WebexSamples/webex-contact-center-flows/tree/main/ai-agent-scripted-track-package) sample in the WebexSamples/webex-contact-center-flows repository on GitHub.

---

## Use Case Overview

Contact center developers and administrators can use this Playbook to deploy a scripted AI agent that handles inbound package tracking inquiries over voice — without writing any application code. A caller asks about their package; the scripted AI agent collects the package number and raises a custom event. The Webex Contact Center flow then takes over: it parses the package number from the agent's metadata, calls an external package tracking HTTP API, and returns the result to the agent via a State Event so the agent can reply naturally to the caller.

When the caller's intent is resolved or they request a human agent, the flow routes to one of several queues based on the caller's last active intent. Interaction outcomes are tracked in a `CustomAIAgentInteractionOutcome` global variable, enabling custom reports in Webex Analyzer.

**Target persona:** Webex Contact Center developer or administrator building intent-driven voice self-service with external API fulfillment.

**Business outcome:** Deflect routine "where is my package?" calls from the live agent queue, surface real-time shipment status automatically, and generate intent-level analytics — all without standing up a separate fulfillment service.

**Estimated implementation time:** 2–4 hours (assumes an existing WxCC org with AI Agent Studio access and familiarity with Control Hub).

---

## Architecture

The integration uses four Webex components working together:

1. **Webex Contact Center Entry Point** — receives the inbound call and triggers the flow.
2. **Flow Designer** — hosts the scripted AI agent flow defined in `src/ai_agent_scripted_track_package.json`. The flow orchestrates fulfillment and routing; no external runtime code is needed.
3. **Webex AI Agent Studio** — hosts the scripted AI agent (intent-based). The Virtual Agent V2 (VAV2) activity connects to the agent using the native `Webex AI Agent (Scripted)` connector.
4. **External Package Tracking API** — a demo HTTP API (`http://ec2-18-225-36-23.us-east-2.compute.amazonaws.com:5003/track/{packageNumber}`) used by the flow's HTTP activity. Use package number `ABC123456` for testing.

When a call arrives, the flow hands the conversation to the scripted AI agent. When the agent determines the caller wants to track a package and has collected the package number, it raises a custom event — exiting the VAV2 activity via its `Handled` edge. The flow then:
- Parses the package number out of the VAV2 metadata (`Parse_iga`)
- Calls the tracking HTTP API with the package number
- Evaluates the response: found, not found, or HTTP error
- Sends the result back to the agent as a State Event (`eventName` / `eventData`), resuming the VAV2 activity
- After the agent finishes, routes the caller to a queue based on their last intent (`previousIntent`) via a Case activity, or disconnects

If the caller requests a human agent at any point, the VAV2 `Escalated` edge routes them directly to the appropriate queue.

For a visual representation of this data flow, see [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md).

---

## Prerequisites

### Webex Requirements
- A **Webex Contact Center** organization with an active WxCC license.
- **Webex AI Agent Studio** access — the scripted AI agent feature must be enabled for your org. Contact your Cisco account team or check [Webex AI Agent Studio Administration guide](https://help.webex.com/en-us/article/ncs9r37/Webex-AI-Agent-Studio-Administration-guide) for enablement steps.
- A **scripted AI Agent** configured in Webex AI Agent Studio. The `Track Package Scripted` agent template is available to import when creating a new agent in AI Agent Studio. This agent must be configured with the `trackPackage` intent and slot for package number collection.
- **Control Hub** access to configure:
  - An **Entry Point** for inbound voice calls.
  - At least two **Queues** (the sample uses two destinations: one for "Track Package" intent callers and one general escalation queue). Assign a **Team** to each queue.
  - An **Entry Point Mapping** (phone number → entry point).
- **Cisco Cloud Text-to-Speech (TTS)** enabled for the org (used for system error messages before escalation). If TTS is not available, upload a static audio file and update the `PlayMessage` activity accordingly.

### Developer Environment
- A browser with access to [Control Hub](https://admin.webex.com) and the [Flow Designer](https://help.webex.com/en-us/article/nhovcy4/Build-and-manage-flows-with-Flow-Designer).
- A text editor capable of Find & Replace in JSON files (VS Code recommended).
- No local development environment or SDK is required — the flow is deployed entirely via the WxCC web UI.

---

## Code Scaffold

The `src/` directory contains the Webex Contact Center flow definition and its template metadata. There is no runtime application code — this is a configuration-driven deployment.

```
src/
├── ai_agent_scripted_track_package.json   # Importable WxCC flow definition
├── template-body-filled.json              # Flow template metadata (used by the WxCC template library)
└── env.template                           # WxCC configuration values to substitute before import
```

**`ai_agent_scripted_track_package.json`** is a complete Flow Designer export. It defines the following key activities:

| Activity | Type | Description |
|---|---|---|
| `NewPhoneContact` | Start | Flow entry point triggered by an inbound call |
| `SetVariable_i1b` | Set Variable | Sets `CustomAIAgentInteractionOutcome` to log interaction state |
| `VirtualAgentV2_anz` | Virtual Agent V2 | Connects to the scripted AI agent via `Webex AI Agent (Scripted)` connector. Outputs: `Handled` (custom event raised), `Escalated` (human requested), `error` |
| `Parse_iga` | Parse | Extracts `PackageNumber` from the VAV2 metadata after `Handled` fires |
| `HTTPRequest_8l3` | HTTP Request | Calls the package tracking API: `GET /track/{{PackageNumber}}` |
| `Condition_ase` | Condition | Branches on whether the HTTP response contains valid package data |
| `SetVariable_*` | Set Variable (x4) | Configures `packageResp`, `eventName`, `eventData`, and `eventDataJSON` for the State Event |
| `VirtualAgentV2_anz` (resume) | Virtual Agent V2 | Re-entered via State Event to send tracking result back to the agent |
| `Case_wnh` | Case | Routes to different queues based on `previousIntent` (e.g., "Track Package") |
| `QueueContact_abk` / `QueueContact_9hx` | Queue Contact | Routes to one of two agent queues |
| `PlayMusic_z4w` | Play Music | Hold music while caller waits in queue |
| `PlayMessage_l1j` | Play Message | Cisco TTS error message on system faults |
| `DisconnectContact_xgw` | Disconnect | Ends the interaction |

**`template-body-filled.json`** is the metadata wrapper used by the WxCC Flow Designer template library (category, labels, description, and the embedded flow JSON). It is provided for reference; you only need `ai_agent_scripted_track_package.json` for direct import.

**`env.template`** lists the org-specific configuration values that must be substituted in `ai_agent_scripted_track_package.json` before importing. See [src/env.template](src/env.template) for the full list and sample values.

> **Important:** The JSON files in `src/` contain UUIDs from a Cisco sample org. These are not functional in your org and **must** be replaced with your own values before importing. See the Deployment Guide for step-by-step instructions.

For additional details on activity configuration, flow variable descriptions, and the demo package tracking API, see [docs/upstream-overview.md](docs/upstream-overview.md).

---

## Deployment Guide

### Part 1 — Set Up the Scripted AI Agent in Webex AI Agent Studio

1. Log in to [Webex AI Agent Studio](https://wxcc.cisco.com) (or access it from Control Hub under **Contact Center > AI Agent Studio**).
2. Click **Create Agent** and select the **Track Package Scripted** template (available in the template library). Name it (e.g., `TrackPackage-Scripted`).
3. Review the agent's configured intents. The `trackPackage` intent must include a slot for collecting the package number.
4. Publish the agent. Copy the **AI Agent ID** — you will need this when editing the flow JSON. The ID appears in the agent's detail page URL or via the API.

### Part 2 — Configure Control Hub

5. In [Control Hub](https://admin.webex.com), navigate to **Contact Center**.
6. Create or confirm **two Queues** under **Customer Experience > Queues**:
   - A "Track Package" intent queue (e.g., `Queue-TrackPackage`) — for callers routed by the Case activity when their last intent was package tracking.
   - A general escalation queue (e.g., `Queue-General`) — for all other intents and direct escalations.
   - For each queue: assign a **Team**, set routing type to **Longest Available Agent**, and copy the **Queue ID** from the queue detail URL.
7. Create or confirm your **Entry Point**: go to **Customer Experience > Entry Points**, create an entry point of type **Telephony**, and note the Entry Point name.
8. Set up an **Entry Point Mapping**: assign your PSTN phone number to the entry point under **Customer Experience > Entry Point Mappings**.

### Part 3 — Prepare the Flow JSON

9. Open `src/ai_agent_scripted_track_package.json` in a text editor (VS Code recommended for JSON formatting).
10. Replace the following sample values with your org's values (see `src/env.template` for the full list with sample UUIDs):
    - `virtualAgentId` (in `VirtualAgentV2_anz` activity properties) — replace with your AI Agent ID from Step 4.
    - `virtualAgentId_name` and `virtualAgentId:name` — replace with your agent's display name (e.g., `TrackPackage-Scripted(TrackPackage-Scripted-UniqueId)`).
    - `destination` in `QueueContact_abk` — replace with your "Track Package" queue ID from Step 6.
    - `destination` in `QueueContact_9hx` — replace with your general escalation queue ID from Step 6.
    - Note: the top-level `orgId` field does **not** need to be replaced — Flow Designer automatically re-assigns the org ID on import.
11. Save the updated `ai_agent_scripted_track_package.json`.

### Part 4 — Import and Publish the Flow

12. In Control Hub, navigate to **Contact Center > Flows**.
13. Click **Import Flow** and upload your updated `ai_agent_scripted_track_package.json`.
14. Open the imported flow in Flow Designer. Verify that:
    - The `VirtualAgentV2_anz` activity shows your scripted AI agent in the **Virtual Agent** field.
    - The two `QueueContact` activities show your respective queue names.
15. If you are **not** using Cisco TTS, click the `PlayMessage_l1j` activity and replace the TTS prompt with a static audio file.
16. Click **Validate** in Flow Designer to check for configuration errors. Resolve any reported issues.
17. Click **Publish Flow** to make it live.

### Part 5 — Map the Flow to the Entry Point

18. In Control Hub, go to **Customer Experience > Entry Points**, open your entry point, and set the **Flow** field to the imported flow.
19. Save the entry point configuration.

### Part 6 — Test

20. Dial the phone number mapped to your entry point.
21. When the scripted agent greets you, say a package tracking phrase (e.g., "I want to track my package"). Provide the package number `ABC123456` when prompted. Verify the agent responds with the tracking status and estimated delivery date.
22. Make a second call and say "I need to speak to an agent." Verify the caller is placed in the queue.
23. Make a third call and allow the agent to finish the conversation naturally. Verify the call disconnects cleanly.
24. In Webex Analyzer, verify that `CustomAIAgentInteractionOutcome` is populated with the expected interaction states (e.g., `handled`, `escalated`).

---

## Known Limitations

- **Sample UUIDs must be replaced.** The flow JSON shipped in `src/` was exported from a Cisco sample org. The `orgId`, `virtualAgentId`, and both queue `destination` UUIDs are not valid in any other org. Importing without updating these values will result in validation errors or a non-functional flow.
- **Cisco TTS required for default error message.** The `PlayMessage_l1j` activity uses Cisco Cloud Text-to-Speech. If your org does not have TTS enabled, you must replace it with a static audio file or enable TTS in Control Hub before publishing.
- **Demo package tracking API.** The HTTP activity calls a public Cisco demo API at `http://ec2-18-225-36-23.us-east-2.compute.amazonaws.com:5003/track/{packageNumber}`. This API is provided for testing and demonstrations only — it is not a production logistics system, has no SLA, and may be unavailable without notice. To connect to a real carrier API, update the `httpRequestUrl` in `HTTPRequest_8l3` and adjust the JSON path expressions in the output variable mapping.
- **Intent-based routing uses `previousIntent` variable.** The Case activity routes callers based on the `previousIntent` flow variable populated by the scripted agent. If you modify the agent's intent names, you must also update the `menuLinks_input` values in the `Case_wnh` activity properties to match.
- **No outbound or digital channel support.** This flow is designed for inbound voice only. Adapting it for chat, email, or outbound campaigns requires a separate flow design.
- **No transcript storage by default.** The `VirtualAgentV2_anz` activity has `transcript: true` set, which enables transcript logging in WxCC Analyzer, but downstream transcript processing (e.g., export to an external system) is not included in this flow.
- **License.** This Playbook is adapted from sample code published under the [Cisco Sample Code License v1.1](../../LICENSE). The sample code may be used and modified only in conjunction with Cisco products and services. It may not be used to replicate or compete with a Cisco product.
- **Webex disclaimer.** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
