# Upstream Overview — AI Agent Scripted (Package Tracking)

This document summarises the source repository's README content for developer reference. The canonical source is the [ai-agent-scripted-track-package](https://github.com/WebexSamples/webex-contact-center-flows/tree/main/ai-agent-scripted-track-package) folder in the `WebexSamples/webex-contact-center-flows` repository.

---

## Labels

Advanced, Voice, AI Agent Studio, Virtual Assistant, Intent based agent handover, Queue routing

---

## Flow Description

This flow handles voice interactions related to package tracking using a scripted virtual agent. It demonstrates the simplest way to perform fulfillment for a scripted agent. In addition, the flow demonstrates queueing customers to different agent queues based on the last active intent and custom reports for AI Agents in Analyzer.

---

## Activities Used in the Flow

| Activity | Purpose |
|---|---|
| **Start** | Initiates the flow when a new call is received |
| **Set Interaction Outcome Variable** | Updates `CustomAIAgentInteractionOutcome` global variable to store the latest state of the interaction |
| **AI Agent Interaction (VirtualAgentV2)** | Manages package tracking inquiries using scripted interactions. The same activity is used to initiate the conversation and to send State Events to the AI agent |
| **Parse Package Details** | Extracts the package number from the metadata provided by the virtual agent |
| **HTTP Request for Package Info** | Sends a GET request to the logistics API to retrieve package status and estimated delivery. Use `ABC123456` as a sample package number |
| **Conditional Logic** | Determines the response based on the package status or the HTTP status code of the API call |
| **Set Response Variables** | Configures responses to communicate whether the package was found or the delivery details |
| **Play Message** | Provides system error messages using Cisco Text-to-Speech, in cases of system errors |
| **Case Activity** | Guides the flow based on the previous intent, deciding on routing to specific queues |
| **Queue to Agent** | Manages queueing logic for escalation to human agents |
| **Play Music** | Hold music played during queueing when the caller awaits agent connection |
| **Disconnect** | Ends the interaction after completion of tasks or if escalated to a human agent |

---

## Flow Variables

| Variable | Type | Description |
|---|---|---|
| `eventName` | String | Name of the event sent to the AI Agent |
| `eventData` | String | Event payload sent to the AI Agent |
| `eventDataJSON` | JSON | JSON-formatted event data used in the VAV2 eventData expression |
| `PackageNumber` | String | Package number extracted from the VAV2 metadata |
| `packStatus` | String | Status of the package based on the HTTP response |
| `estimatedDelivery` | String | Estimated delivery date and time for the package based on the HTTP response |
| `packageResp` | String | Response sent back to the customer based on HTTP activity response |
| `statuscode` | String | HTTP status code from the package tracking API response |
| `previousIntent` | String | The caller's last active intent — used by the Case activity to route to the correct queue |
| `CustomAIAgentInteractionOutcome` | String | Logs the state of interaction: `abandoned`, `handled`, `escalated`, or `errored` — based on the customer's interaction with the AI agent. Used to build custom reports in Analyzer |
| `Global_VoiceName` | String | Determines the voice used for text-to-speech (global variable) |

---

## Demo Package Tracking API

The HTTP activity calls a public Cisco demo API:

```
GET http://ec2-18-225-36-23.us-east-2.compute.amazonaws.com:5003/track/{packageNumber}
x-api-key: default-dev-key
```

**Sample package number for testing:** `ABC123456`

**Response JSON path expressions used in the flow:**
- `$.status` → mapped to `packStatus`
- `$.estimated_delivery` → mapped to `estimatedDelivery`

> This API is for testing and demonstrations only. It is not a production logistics system and has no SLA. For a real deployment, replace the `httpRequestUrl` in `HTTPRequest_8l3` and update the JSON path expressions to match your carrier API's response schema.

---

## Custom Analyzer Reports

The `CustomAIAgentInteractionOutcome` variable is set at multiple points in the flow to capture the interaction lifecycle. Refer to [Manage custom reports for AI agents](https://help.webex.com/en-us/article/ncs9r37/Webex-AI-Agent-Studio-Administration-guide#Manage-custom-reports-for-AI-agents) in the AI Agent Studio Administration guide for instructions on building visualizations from this variable in Webex Analyzer.

---

## Additional Resources

- [Webex Contact Center Developer Documentation](https://developer.webex-cx.com)
- [Webex Contact Center Flow Designer Guide](https://help.webex.com/en-us/article/n5595zd/Webex-Contact-Center-Setup-and-Administration-Guide)
- [Configure fulfillment for scripted AI agents](https://help.webex.com/en-us/article/mzpuseb)
- [Manage custom reports for AI agents](https://help.webex.com/en-us/article/ncs9r37/Webex-AI-Agent-Studio-Administration-guide#Manage-custom-reports-for-AI-agents)
- [Webex Contact Center APIs Developer Community](https://community.cisco.com/t5/contact-center/bd-p/j-disc-dev-contact-center)
