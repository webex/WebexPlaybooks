# WxCC AI Agent Scripted Doctor's Appointment Booking

> This Playbook is adapted from the [AI Agent Scripted (Doctor's Appointment Booking)](https://github.com/WebexSamples/webex-contact-center-flows/tree/main/ai_agent_scripted_doctors_appointment) sample in the WebexSamples/webex-contact-center-flows repository on GitHub.

---

## Use Case Overview

Contact center developers and administrators can use this Playbook to deploy a scripted AI agent that handles inbound doctor's appointment calls over voice — covering availability checks, booking, lookups, and cancellations — without writing any application code. A caller describes what they need (e.g., "I want to book an appointment"); the scripted AI agent collects the relevant details and raises a custom event. The Webex Contact Center flow then takes over: it parses the appointment data from the agent's metadata, calls the appropriate external appointment management API endpoint, and returns the result to the agent via a State Event so the agent can respond naturally to the caller.

When the caller's intent cannot be resolved by the AI agent or they request a human, the flow routes them to an agent queue. Unlike simpler single-event flows, this Playbook demonstrates a **multi-event fulfillment pattern** where a single flow handles four distinct appointment operations driven by the `StateEventName` returned by the Virtual Agent V2 activity.

**Target persona:** Webex Contact Center developer or administrator building intent-driven voice self-service for healthcare appointment management.

**Business outcome:** Deflect routine scheduling calls (check availability, book, look up, cancel) from the live agent queue, deliver real-time appointment management through a natural-language interface, and reduce handle times for clinical staff — all without standing up a separate middleware service.

**Estimated implementation time:** 2–4 hours (assumes an existing WxCC org with AI Agent Studio access and familiarity with Control Hub).

---

## Architecture

The integration uses four Webex components working together:

1. **Webex Contact Center Entry Point** — receives the inbound call and triggers the flow.
2. **Flow Designer** — hosts the scripted AI agent flow defined in `src/ai_agent_scripted_doctors_appointment.json`. The flow orchestrates multi-event fulfillment and routing; no external runtime code is needed.
3. **Webex AI Agent Studio** — hosts the scripted AI agent (intent-based). The Virtual Agent V2 (VAV2) activity connects to the agent using the native `Webex AI Agent (Scripted)` connector.
4. **External Appointment Management API** — a demo HTTP API (`http://ec2-18-225-36-23.us-east-2.compute.amazonaws.com:5003/`) used by the flow's HTTP activities. It exposes four endpoints: `/check_availability`, `/create_appointment`, `/lookup_appointment`, and `/cancel_appointment`.

When a call arrives, the flow hands the conversation to the scripted AI agent. As the caller expresses their need and the agent collects the required information, the agent raises one of four custom exit events — each exiting the VAV2 activity via its `ENDED` edge with a `StateEventName`. The flow then:

- Parses the full event metadata out of `VirtualAgentV2_vej.MetaData` into `http_input` (`Parse_t66`)
- Routes on `StateEventName` via a Case activity (`Case_9ia`) to the appropriate HTTP request
- Calls the matching appointment API endpoint (POST with JSON body from `http_input`)
- Evaluates the HTTP response code (200 = success, otherwise error)
- Sets `event_name` to the corresponding confirm event and `event_data_string` to the API response
- Resumes the VAV2 activity via a State Event, passing the API result back to the agent
- The agent delivers the result to the caller and ends the conversation

If the caller requests a human agent at any point, the VAV2 `ESCALATE` edge routes them directly to the escalation queue. System errors in the VAV2 activity trigger a TTS error message followed by queue transfer.

For a visual representation of this data flow, see [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md).

---

## Prerequisites

### Webex Requirements
- A **Webex Contact Center** organization with an active WxCC license.
- **Webex AI Agent Studio** access — the scripted AI agent feature must be enabled for your org. Contact your Cisco account team or check the [Webex AI Agent Studio Administration guide](https://help.webex.com/en-us/article/ncs9r37/Webex-AI-Agent-Studio-Administration-guide) for enablement steps.
- A **scripted AI Agent** configured in Webex AI Agent Studio. The `Doctor's appointment` agent template is available to import when creating a new agent in AI Agent Studio. This agent must be configured with intents for checking availability, booking, looking up, and cancelling appointments, along with the relevant slots for collecting appointment details.
- **Control Hub** access to configure:
  - An **Entry Point** for inbound voice calls.
  - At least one **Queue** for human escalation. Assign a **Team** to the queue.
  - An **Entry Point Mapping** (phone number → entry point).
- **Cisco Cloud Text-to-Speech (TTS)** enabled for the org (used for system error messages before escalation). If TTS is not available, upload a static audio file and update the `PlayMessage_l92` activity accordingly.

### Developer Environment
- A browser with access to [Control Hub](https://admin.webex.com) and the [Flow Designer](https://help.webex.com/en-us/article/nhovcy4/Build-and-manage-flows-with-Flow-Designer).
- A text editor capable of Find & Replace in JSON files (VS Code recommended).
- No local development environment or SDK is required — the flow is deployed entirely via the WxCC web UI.
- APIs for an external appointment management system if replacing the demo API with a real backend. The demo API accepts JSON POST bodies and returns JSON responses; your real API must follow the same contract or you must update the HTTP activity URLs and response variable mappings.

---

## Code Scaffold

The `src/` directory contains the Webex Contact Center flow definition and its template metadata. There is no runtime application code — this is a configuration-driven deployment.

```
src/
├── ai_agent_scripted_doctors_appointment.json   # Importable WxCC flow definition
├── template-body-filled.json                    # Flow template metadata (used by the WxCC template library)
└── env.template                                 # WxCC configuration values to substitute before import
```

**`ai_agent_scripted_doctors_appointment.json`** is a complete Flow Designer export. It defines the following key activities:

| Activity | Type | Description |
|---|---|---|
| `NewPhoneContact` | Start | Flow entry point triggered by an inbound call |
| `VirtualAgentV2_vej` | Virtual Agent V2 | Connects to the scripted AI agent via `Webex AI Agent (Scripted)` connector. Outputs: `ENDED` (custom event raised by agent), `ESCALATE` (human requested), `error` |
| `Parse_t66` | Parse | Extracts `http_input` from `VirtualAgentV2_vej.MetaData` after `ENDED` fires |
| `Case_9ia` | Case | Branches on `VirtualAgentV2_vej.StateEventName` to route to the correct HTTP request (4 branches) |
| `HTTPRequest_lnz` | HTTP Request | POST `/check_availability` — checks available appointment slots |
| `HTTPRequest_dc4` | HTTP Request | POST `/create_appointment` — books a new appointment |
| `HTTPRequest_l63` | HTTP Request | POST `/lookup_appointment` — retrieves an existing appointment |
| `HTTPRequest_nuq` | HTTP Request | POST `/cancel_appointment` — cancels an existing appointment |
| `Condition_2z5` / `_bun` / `_ecv` / `_hg7` | Condition | Evaluates HTTP status code (200 = success) for each operation |
| `SetVariable_ibj` / `_3vp` / `_zb4` / `_2vl` | Set Variable | Sets `event_name` to the matching confirm event (e.g., `check_availability_confirm_entry`) |
| `SetVariable_r6r` | Set Variable | Sets `event_data_string = {{ event_data }}` (stringifies the JSON API response for VAV2) |
| `VirtualAgentV2_vej` (resume) | Virtual Agent V2 | Re-entered via State Event to deliver the API result to the agent |
| `QueueContact_y90` | Queue Contact | Routes caller to the escalation queue on `ESCALATE`, error, or HTTP failure |
| `PlayMusic_sr1` | Play Music | Hold music while caller waits in queue |
| `PlayMessage_l92` | Play Message | Cisco TTS error message on VAV2 system faults |
| `DisconnectContact_p0y` | Disconnect | Ends the interaction on unhandled case branches or queue errors |

**`template-body-filled.json`** is the metadata wrapper used by the WxCC Flow Designer template library (category, labels, description, and the embedded flow JSON). It is provided for reference; you only need `ai_agent_scripted_doctors_appointment.json` for direct import.

**`env.template`** lists the org-specific configuration values that must be substituted in `ai_agent_scripted_doctors_appointment.json` before importing. See [src/env.template](src/env.template) for the full list and sample values.

> **Important:** The JSON files in `src/` contain UUIDs from a Cisco sample org. These are not functional in your org and **must** be replaced with your own values before importing. See the Deployment Guide for step-by-step instructions.

For additional details on activity configuration, flow variable descriptions, and the demo appointment API endpoints, see [docs/upstream-overview.md](docs/upstream-overview.md).

---

## Deployment Guide

### Part 1 — Set Up the Scripted AI Agent in Webex AI Agent Studio

1. Log in to [Webex AI Agent Studio](https://wxcc.cisco.com) (or access it from Control Hub under **Contact Center > AI Agent Studio**).
2. Click **Create Agent** and select the **Doctor's appointment** template (available in the template library). Name it (e.g., `DoctorsAppointment-Scripted`).
3. Review the agent's configured intents. The agent must support intents for the four operations: check availability, create appointment, look up appointment, and cancel appointment. Each intent should include the relevant slots (e.g., preferred date/time, patient name, appointment ID).
4. Publish the agent. Copy the **AI Agent ID** — you will need this when editing the flow JSON. The ID appears in the agent's detail page URL or via the Webex Contact Center API (`GET /v1/ai-agents`).

### Part 2 — Configure Control Hub

5. In [Control Hub](https://admin.webex.com), navigate to **Contact Center**.
6. Create or confirm a **Queue** under **Customer Experience > Queues** for human escalation (e.g., `Queue-Appointments`). Assign a **Team**, set routing type to **Longest Available Agent**, and copy the **Queue ID** from the queue detail URL.
7. Create or confirm your **Entry Point**: go to **Customer Experience > Entry Points**, create an entry point of type **Telephony**, and note the Entry Point name.
8. Set up an **Entry Point Mapping**: assign your PSTN phone number to the entry point under **Customer Experience > Entry Point Mappings**.

### Part 3 — Prepare the Flow JSON

9. Open `src/ai_agent_scripted_doctors_appointment.json` in a text editor (VS Code recommended for JSON formatting).
10. Replace the following sample values with your org's values (see `src/env.template` for the full list with sample UUIDs):
    - `virtualAgentId` (in `VirtualAgentV2_vej` activity properties) — replace `67e336b5a6c03ef8f93243ac` with your AI Agent ID from Step 4.
    - `virtualAgentId_name` and `virtualAgentId:name` — replace `Doctor's appointment(Doctor's_appointment-HnN5NhTs)` with your agent's display name (e.g., `DoctorsAppointment-Scripted(DoctorsAppointment-Scripted-UniqueId)`).
    - `destination` in `QueueContact_y90` — replace `8a9e96e9-4b59-478b-9f64-76a29fa1bb58` with your queue ID from Step 6.
    - `destination_name` and `destination:name` in `QueueContact_y90` — replace `Queue-1` with your queue's display name.
    - Note: the top-level `orgId` field does **not** need to be replaced — Flow Designer automatically re-assigns the org ID on import.
11. **Optional:** If you are connecting to a real appointment management API instead of the demo API, update the `httpRequestUrl` in each of the four `HTTPRequest_*` activities to point to your endpoints. Also update the response variable mappings in `outputVariableArray` to match your API's response schema.
12. Save the updated `ai_agent_scripted_doctors_appointment.json`.

### Part 4 — Import and Publish the Flow

13. In Control Hub, navigate to **Contact Center > Flows**.
14. Click **Import Flow** and upload your updated `ai_agent_scripted_doctors_appointment.json`.
15. Open the imported flow in Flow Designer. Verify that:
    - The `VirtualAgentV2_vej` activity shows your scripted AI agent in the **Virtual Agent** field.
    - The `QueueContact_y90` activity shows your queue name.
    - The four HTTP Request activities show the correct endpoint URLs.
16. If you are **not** using Cisco TTS, click the `PlayMessage_l92` activity and replace the TTS prompt with a static audio file.
17. Click **Validate** in Flow Designer to check for configuration errors. Resolve any reported issues.
18. Click **Publish Flow** to make it live.

### Part 5 — Map the Flow to the Entry Point

19. In Control Hub, go to **Customer Experience > Entry Points**, open your entry point, and set the **Flow** field to the imported flow.
20. Save the entry point configuration.

### Part 6 — Test

21. Dial the phone number mapped to your entry point.
22. When the scripted agent greets you, say "I want to check appointment availability." Provide the requested details when prompted. Verify the agent responds with available time slots from the API.
23. Make a second call and say "I want to book an appointment." Provide details and verify the agent confirms the booking.
24. Make a third call and say "I want to look up my appointment." Verify the agent retrieves the appointment details.
25. Make a fourth call and say "I want to cancel my appointment." Verify the agent confirms the cancellation.
26. Make a fifth call and say "I need to speak to an agent." Verify the caller is placed in the queue.
27. Make a sixth call, say nothing or trigger an unrecognised intent, and verify the TTS error message plays before the caller is transferred to the queue.

<!-- TODO: verify the demo API endpoint base URL and test payloads with your AI agent template's slot names before go-live -->

---

## Known Limitations

- **Sample UUIDs must be replaced.** The flow JSON shipped in `src/` was exported from a Cisco sample org. The `orgId`, `virtualAgentId`, and the queue `destination` UUID are not valid in any other org. Importing without updating these values will result in validation errors or a non-functional flow.
- **Cisco TTS required for default error message.** The `PlayMessage_l92` activity uses Cisco Cloud Text-to-Speech. If your org does not have TTS enabled, you must replace it with a static audio file or enable TTS in Control Hub before publishing.
- **Demo appointment API.** The four HTTP activities call a public Cisco demo API at `http://ec2-18-225-36-23.us-east-2.compute.amazonaws.com:5003/`. This API is provided for testing and demonstrations only — it is not a production appointment management system, has no SLA, and may be unavailable without notice. To connect to a real backend, update the `httpRequestUrl` in each HTTP Request activity and adjust the JSON path expressions in the output variable mapping to match your API's response schema.
- **Multi-event pattern requires matching agent intents.** The Case activity (`Case_9ia`) routes based on the `StateEventName` value emitted by the scripted AI agent. The four exit event names (`check_availability_exit`, `create_appointment_exit`, `lookup_appointment_exit`, `cancel_appointment_exit`) must exactly match the custom events configured in your AI Agent Studio agent. If you rename any intent events in the agent, you must also update the `menuLinks_input` values in `Case_9ia`.
- **Single escalation queue.** Unlike some flows that route callers to intent-specific queues, this flow uses a single queue (`QueueContact_y90`) for all escalations and errors. To add intent-based routing, replace `QueueContact_y90` with a Case activity followed by multiple queue activities.
- **No outbound or digital channel support.** This flow is designed for inbound voice only. Adapting it for chat, email, or outbound campaigns requires a separate flow design.
- **No transcript storage by default.** The `VirtualAgentV2_vej` activity has `transcript: true` set, which enables transcript logging in WxCC Analyzer, but downstream transcript processing (e.g., export to an external system) is not included in this flow.
- **License.** This Playbook is adapted from sample code published under the [Cisco Sample Code License v1.1](../../LICENSE). The sample code may be used and modified only in conjunction with Cisco products and services. It may not be used to replicate or compete with a Cisco product.
- **Webex disclaimer.** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
