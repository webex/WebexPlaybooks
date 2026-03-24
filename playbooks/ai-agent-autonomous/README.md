# Webex Contact Center — Autonomous AI Agent (Package Tracking) Flow Playbook

This Playbook bundles Flow Designer assets from the [`WebexSamples/webex-contact-center-flows`](https://github.com/WebexSamples/webex-contact-center-flows) repository (`ai-agent-autonomous`).

## Use Case Overview

This sample demonstrates an **inbound voice** flow where an **autonomous AI agent** handles **package-tracking** conversations. Callers can complete self-service with the AI or **escalate to a human agent** (including on AI errors). The flow uses **Virtual Agent V2 (VAV2)**, Cisco Text-to-Speech for system messages, queue treatment, and disconnect.

**Target persona:** WxCC administrators, flow authors, and solution architects configuring AI-assisted voice entry in Flow Designer.

**Estimated implementation time:** 4–8 hours (autonomous AI agent configuration in AI Agent Studio, fulfilment, Control Hub entry point and queue setup, flow import and test).

## Architecture

Inbound calls reach **Webex Contact Center** and run a Flow Designer flow. The flow hands the conversation to the **autonomous AI agent** via **VAV2**. On success, the interaction can end in the AI path; on customer request, error, or policy, the flow plays messages, **queues to agent** with hold music, then **disconnects** or completes handoff as designed.

See the [architecture diagram](diagrams/architecture-diagram.md) for a high-level view.

## Prerequisites

- **Webex Contact Center** org with access to **Flow Designer** and permission to create or edit flows.
- **Autonomous AI agent** in **Webex AI Agent Studio** with the appropriate **action** (e.g. package tracking with fulfilment) and **knowledge** documents, per your scenario. Upstream notes that a sample fulfilment flow may be available in **Webex Connect** flow templates.
- **Control Hub:** Entry point, queue, teams, and **entry point mapping** configured for Webex Contact Center.
- **Cisco Text-to-Speech (TTS)** enabled if you rely on dynamic prompts.
- **Audio:** Upload static audio if you are not using Cisco default audio assets.

## Code Scaffold

The `/src/` folder is a vendored copy of the upstream template directory:

- **`ai_agent_autonomous.json`** — Flow export with activity-level structure for this sample (e.g. Start, VAV2, Play Message, Queue to Agent, Play Music, Disconnect).
- **`template-body-filled.json`** — Filled template body for Flow Designer import workflows that use the standard template format.
- **`README.md`** — Upstream description, activity list, and links (AI Agent Studio, Flow Designer guide, developer support).

There is no application runtime (for example `main.js`); operators import and configure these assets in Control Hub / Flow Designer and AI Agent Studio.

## Deployment Guide

1. **Review upstream README** in `/src/README.md` for activity names and behaviour (package tracking, escalation paths).
2. **Configure the autonomous AI agent** in Webex AI Agent Studio: actions, fulfilment, and knowledge documents. Complete any related **Webex Connect** fulfilment flow if your design requires it.
3. In **Control Hub**, ensure **entry points**, **queues**, **teams**, and **entry point mapping** match how you will attach this flow.
4. **Import the flow** in Flow Designer using the JSON your process requires (`ai_agent_autonomous.json` and/or `template-body-filled.json` per your organization’s import procedure).
5. **Bind the flow** to the appropriate entry point and **publish** according to your change-management practice.
6. **Place a test call** through the mapped number or entry point. Verify AI handling, intentional escalation to queue, TTS prompts, and audio behaviour.
7. For product help beyond this Playbook, use [Webex Contact Center developer support](https://developer.webex-cx.com/support) and the [Contact Center developer community](https://community.cisco.com/t5/contact-center/bd-p/j-disc-dev-contact-center).

## Known Limitations

- This is **sample/template** content from Cisco sample code licensing upstream; it is **not** production-hardening guidance. Validate behaviour in your tenant and region.
- **AI agent** behaviour depends on AI Agent Studio configuration, licences, and feature availability; not every activity or option may exist in all WxCC deployments.
- **TTS and audio** requirements and defaults vary by tenant; you may need custom prompts or files.
- Licensing and redistribution of sample assets follow the upstream repository; this Webex Playbooks repo’s **[LICENSE](../../LICENSE)** applies to the Playbook scaffolding (README, APPHUB, diagrams).
- **Webex disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
