# WxCC AI Agent Autonomous Package Tracking

> This Playbook is adapted from the [AI Agent Autonomous (Package Tracking)](https://github.com/WebexSamples/webex-contact-center-flows/tree/main/ai-agent-autonomous) sample in the WebexSamples/webex-contact-center-flows repository on GitHub.

---

## Use Case Overview

Contact center developers and administrators can use this Playbook to deploy an autonomous AI agent that handles inbound package tracking inquiries over voice — without writing any code. Callers ask questions in natural language; the AI agent looks up their shipment status and answers follow-up questions using a knowledge base. If the caller requests a human agent or if the AI agent encounters an error, the flow automatically escalates the caller to a live agent queue.

**Target persona:** Webex Contact Center developer or administrator building self-service voice automation.

**Business outcome:** Deflect routine "where is my package?" calls from the live agent queue, reduce average handle time, and provide 24/7 service without staffing increases.

**Estimated implementation time:** 2–4 hours (assumes an existing WxCC org and familiarity with Control Hub).

---

## Architecture

The integration uses three Webex components working together:

1. **Webex Contact Center Entry Point** — receives the inbound call and routes it to the flow.
2. **Flow Designer** — hosts the autonomous AI agent flow defined in `src/ai_agent_autonomous.json`. The flow is configuration-only; no external runtime code is needed.
3. **Webex AI Agent Studio** — hosts the autonomous AI agent, including the package-tracking fulfillment action and the shipping knowledge base. The Virtual Agent V2 (VAV2) activity in Flow Designer connects directly to the AI agent via the native `Webex AI Agent (Autonomous)` connector.

When a call arrives, the flow immediately hands the conversation to the AI agent. The agent dynamically generates responses based on its configured actions and knowledge documents. If the caller says "agent" or a similar escalation phrase at any time — or if the VAV2 activity returns an error — the flow plays a brief TTS message and routes the caller to the `Queue-1` queue, where hold music plays until a human agent is available.

For a visual representation of this data flow, see [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md).

---

## Prerequisites

### Webex Requirements
- A **Webex Contact Center** organization with an active WxCC license.
- **Webex AI Agent Studio** access — the autonomous AI agent feature must be enabled for your org. Contact your Cisco account team or check [Webex AI Agent Studio Administration guide](https://help.webex.com/en-us/article/ncs9r37/Webex-AI-Agent-Studio-Administration-guide) for enablement steps.
- An **autonomous AI Agent** configured in Webex AI Agent Studio with:
  - A package-tracking fulfillment **action** (with a corresponding fulfillment flow — a sample fulfillment flow is available in the Webex Connect flow template library).
  - A **knowledge base** covering general shipping queries (e.g., delivery timelines, lost packages, returns).
- **Control Hub** access to configure:
  - An **Entry Point** for inbound voice calls.
  - A **Queue** (named `Queue-1` in the sample, or your own queue name — the flow JSON must be updated to match).
  - A **Team** assigned to the queue.
  - An **Entry Point Mapping** (phone number → entry point).
- **Cisco Cloud Text-to-Speech (TTS)** enabled for the org (used for the error message before escalation). If TTS is not available, upload a static audio file and update the PlayMessage activity accordingly.

### Developer Environment
- A browser with access to [Control Hub](https://admin.webex.com) and the [Flow Designer](https://help.webex.com/en-us/article/nhovcy4/Build-and-manage-flows-with-Flow-Designer).
- No local development environment or SDK is required — the flow is deployed entirely via the WxCC web UI.

---

## Code Scaffold

The `src/` directory contains the Webex Contact Center flow definition and its template metadata. There is no runtime application code — this is a configuration-driven deployment.

```
src/
├── ai_agent_autonomous.json     # Importable WxCC flow definition
├── template-body-filled.json    # Flow template metadata (used by the WxCC template library)
└── env.template                 # WxCC configuration values to substitute before import
```

**`ai_agent_autonomous.json`** is a complete Flow Designer export. It defines the following activities:
- `NewPhoneContact` — flow entry point triggered by an inbound call.
- `VirtualAgentV2` — bridges the call to the configured autonomous AI agent via the `Webex AI Agent (Autonomous)` connector. Outputs: `ENDED` (conversation complete), `ESCALATE` (caller requested human), `error` (system fault).
- `PlayMessage` — plays a Cisco TTS error message before escalation on system faults.
- `QueueContact` — routes the caller to the human agent queue.
- `PlayMusic` — loops hold music while the caller waits in queue.
- `DisconnectContact` — ends the interaction after the AI agent resolves the query or the caller is transferred.

**`template-body-filled.json`** is the metadata wrapper used by the WxCC Flow Designer template library (category, labels, description, and the embedded flow JSON). It is provided for reference; you only need `ai_agent_autonomous.json` for direct import.

**`env.template`** lists the org-specific configuration values that must be substituted in `ai_agent_autonomous.json` before importing. See [src/env.template](src/env.template) for the full list.

> **Important:** The JSON files in `src/` contain UUIDs from a sample Webex org. These are not functional in your org and **must** be replaced with your own values before importing. See the Deployment Guide for step-by-step instructions.

---

## Deployment Guide

### Part 1 — Set Up Webex AI Agent Studio

1. Log in to [Webex AI Agent Studio](https://wxcc.cisco.com) (or access it from Control Hub under **Contact Center > AI Agent Studio**).
2. Create an **Autonomous AI Agent**:
   - Name it (e.g., `TrackPackage`).
   - Add a **package tracking action** with its fulfillment webhook or Webex Connect fulfillment flow. A sample fulfillment flow is available in the Webex Connect template library under "AI Agent Autonomous."
   - Add a **knowledge base** covering general shipping and delivery FAQs.
3. Publish the AI agent. Copy the **AI Agent ID** — you will need this when editing the flow JSON.

### Part 2 — Configure Control Hub

4. In [Control Hub](https://admin.webex.com), navigate to **Contact Center**.
5. Create or confirm your **Queue**: go to **Customer Experience > Queues**, create a queue (e.g., `Queue-1`), assign a Team, and set routing type to **Longest Available Agent**. Copy the **Queue ID** from the queue details.
6. Create or confirm your **Entry Point**: go to **Customer Experience > Entry Points**, create an entry point of type **Telephony**, and note the Entry Point name.
7. Set up an **Entry Point Mapping**: assign your PSTN phone number to the entry point under **Customer Experience > Entry Point Mappings**.

### Part 3 — Prepare the Flow JSON

8. Open `src/ai_agent_autonomous.json` in a text editor.
9. Replace the following sample UUIDs with your org's values (see `src/env.template` for the full list of fields):
   - `virtualAgentId` — replace with your AI Agent ID from Step 3.
   - `destination` (in `QueueContact_68a`) — replace with your Queue ID from Step 5.
   - `orgId` — replace with your Webex org ID (find it in Control Hub under **Account > Organization ID**).
10. Save the updated `ai_agent_autonomous.json`.

<!-- TODO: verify that orgId replacement is required or if Flow Designer re-assigns it on import -->

### Part 4 — Import and Publish the Flow

11. In Control Hub, navigate to **Contact Center > Flows**.
12. Click **Import Flow** and upload your updated `ai_agent_autonomous.json`.
13. Open the imported flow in Flow Designer. Verify that:
    - The `VirtualAgentV2` activity shows your AI agent (`TrackPackage` or your chosen name) in the **Virtual Agent** field.
    - The `QueueContact` activity shows your queue name in the **Queue** field.
14. If you are **not** using Cisco TTS, click the `PlayMessage` activity and replace the TTS prompt with a static audio file.
15. Click **Validate** in Flow Designer to check for configuration errors. Resolve any reported issues.
16. Click **Publish Flow** to make it live.

### Part 5 — Map the Flow to the Entry Point

17. In Control Hub, go to **Customer Experience > Entry Points**, open your entry point, and set the **Flow** field to the imported flow.
18. Save the entry point configuration.

### Part 6 — Test

19. Dial the phone number mapped to your entry point.
20. Speak a package tracking query (e.g., "Where is my package?"). Verify the AI agent responds correctly.
21. Say "I need to speak to an agent" and verify the caller is placed in the queue.
22. Terminate the AI agent conversation naturally and verify the call disconnects cleanly.

---

## Known Limitations

- **Sample UUIDs must be replaced.** The flow JSON shipped in `src/` was exported from a Cisco sample org. The `virtualAgentId`, queue `destination` UUID, and `orgId` are not valid in any other org. Importing without updating these values will result in validation errors or a non-functional flow.
- **Cisco TTS required for default error message.** The `PlayMessage` activity uses Cisco Cloud Text-to-Speech. If your org does not have TTS enabled, you must replace it with a static audio file or enable TTS in Control Hub before publishing.
- **Static audio file for hold music.** The `PlayMusic` activity uses `defaultmusic_on_hold_cisco_opus_no_1.wav`, which is a Cisco-provided default. If you have custom hold music requirements, upload your audio file and update the activity.
- **No transcript storage by default.** The `VirtualAgentV2` activity has `transcript: true` set, which enables transcript logging in WxCC Analyzer, but downstream transcript processing (e.g., export to an external system) is not included in this flow.
- **No outbound or digital channel support.** This flow is designed for inbound voice only. Adapting it for chat, email, or outbound campaigns requires a separate flow design.
- **License.** This Playbook is adapted from sample code published under the [Cisco Sample Code License v1.1](../../LICENSE). The sample code may be used and modified only in conjunction with Cisco products and services. It may not be used to replicate or compete with a Cisco product.
- **Webex disclaimer.** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
