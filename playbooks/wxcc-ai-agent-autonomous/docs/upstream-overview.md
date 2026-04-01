# Upstream Source Notes

**Source repository:** [WebexSamples/webex-contact-center-flows](https://github.com/WebexSamples/webex-contact-center-flows/tree/main/ai-agent-autonomous)

This document preserves reference notes from the upstream sample that are useful for developers adapting the flow for their own org.

---

## Original Sample Description

**Name:** AI Agent Autonomous (Package Tracking)

**Labels:** Advanced, Voice, Inbound, Virtual Assistant

**Description:** This flow utilizes an autonomous AI agent to manage voice interactions related to package tracking. The flow provides an option to escalate to human agents when necessary or on AI Agent errors.

---

## Original Pre-requisites (from upstream README)

- An autonomous AI Agent configured with the appropriate action (along with fulfilment) and knowledge documents. A sample fulfilment flow is available in Webex Connect flow templates.
- Entry Point, Queue, Teams, and Entry Point Mapping configured in the Control Hub settings page for Webex Contact Center.
- Cisco Text-to-Speech (TTS) is enabled for generating custom messages dynamically.
- Upload static audio files if you are not using Cisco's default audio.

---

## Activities Used in the Flow

**Start (New Phone Contact)**
- This activity marks the beginning of the flow, triggered by a new call.

**Virtual Agent V2 (VAV2)**
- The activity responsible for the interaction between the flow and the AI Agent. The same activity is used to initiate the conversation and to send state events to the AI agent.

**Play Message**
- Provides system messages using Cisco Text-to-Speech. Used to play an error message before escalation to a human agent in case of VAV2 activity errors.

**Queue to Agent**
- Manages queueing logic for escalation to human agents.

**Play Music**
- Hold music played during queueing when the caller awaits agent connection.

**Disconnect**
- Ends the interaction after completion of tasks or if escalated to a human agent.

---

## Error Handling

The flow includes error management strategies to handle unexpected issues gracefully, ensuring the caller is informed and redirected appropriately.

---

## Additional Resources

- [Set up Autonomous Agents on Webex AI Agent Studio](https://help.webex.com/en-us/article/ncs9r37/Webex-AI-Agent-Studio-Administration-guide#Set-up-autonomous-AI-agent)
- [Webex Contact Center Flow Designer Guide](https://help.webex.com/en-us/article/nhovcy4/Build-and-manage-flows-with-Flow-Designer)
- [Webex Developer Portal Support](https://developer.webex-cx.com/support)
- [Webex Contact Center APIs Developer Community](https://community.cisco.com/t5/contact-center/bd-p/j-disc-dev-contact-center)

---

## template-body-filled.json

`src/template-body-filled.json` is the WxCC Flow Designer template library metadata wrapper. It includes:
- `category`: Cisco
- `labels`: Advanced, Voice, Inbound, Virtual Assistant
- `featureFlagName`: `flow-control-draft-templates`
- `flow`: the embedded flow JSON (same content as `ai_agent_autonomous.json`, but serialized as a string within the metadata structure)

This file is used when contributing flows to the WxCC template library. For direct import into Flow Designer, use `ai_agent_autonomous.json` instead.
