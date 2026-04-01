# Upstream Overview — AI Agent Scripted (Doctor's Appointment Booking)

This document summarises the source repository's README content for developer reference. The canonical source is the [ai_agent_scripted_doctors_appointment](https://github.com/WebexSamples/webex-contact-center-flows/tree/main/ai_agent_scripted_doctors_appointment) folder in the `WebexSamples/webex-contact-center-flows` repository.

---

## Labels

Advanced, Voice, AI Agent Studio, Virtual Assistant

---

## Flow Description

This flow facilitates automated scheduling and management of doctor's appointments through a scripted AI agent. It integrates with external systems to check availability, create appointments, look up existing appointments, and cancel appointments. The flow demonstrates how control passes back and forth between the AI agent and the WxCC flow using custom events: the AI agent raises an exit event with appointment data in its metadata; the flow performs HTTP fulfillment and returns the result via a State Event confirm event.

---

## Activities Used in the Flow

| Activity | Purpose |
|---|---|
| **Start (`NewPhoneContact`)** | Initiates the flow when a new call is received |
| **Virtual Agent V2 (`VirtualAgentV2_vej`)** | Manages appointment conversations using the scripted AI agent. Used both to initiate the conversation and to send State Events back to the agent with fulfillment results |
| **Parse (`Parse_t66`)** | Extracts `http_input` (the full metadata JSON) from `VirtualAgentV2_vej.MetaData` after the ENDED edge fires |
| **Case (`Case_9ia`)** | Routes on `VirtualAgentV2_vej.StateEventName` to the appropriate HTTP request (4 branches: check_availability_exit, create_appointment_exit, lookup_appointment_exit, cancel_appointment_exit) |
| **HTTP Request — Check Availability (`HTTPRequest_lnz`)** | POST `/check_availability` — returns available appointment slots |
| **HTTP Request — Create Appointment (`HTTPRequest_dc4`)** | POST `/create_appointment` — books a new appointment and returns confirmation |
| **HTTP Request — Lookup Appointment (`HTTPRequest_l63`)** | POST `/lookup_appointment` — retrieves details of an existing appointment |
| **HTTP Request — Cancel Appointment (`HTTPRequest_nuq`)** | POST `/cancel_appointment` — cancels an existing appointment and returns confirmation |
| **Condition (`Condition_2z5 / _bun / _ecv / _hg7`)** | Evaluates the HTTP status code for each operation (200 = success, otherwise routes to error handling) |
| **Set Variable — confirm event name (`SetVariable_ibj / _3vp / _zb4 / _2vl`)** | Sets `event_name` to the matching confirm event (e.g., `check_availability_confirm_entry`) after a successful HTTP call |
| **Set Variable — stringify event data (`SetVariable_r6r`)** | Sets `event_data_string = {{ event_data }}` to convert the JSON API response to a string for the VAV2 State Event |
| **Play Message (`PlayMessage_l92`)** | Plays a Cisco Cloud TTS error message ("We are experiencing some system errors…") before transferring to queue on VAV2 or HTTP errors |
| **Queue Contact (`QueueContact_y90`)** | Routes caller to the escalation queue for all ESCALATE, error, and HTTP failure paths |
| **Play Music (`PlayMusic_sr1`)** | Hold music played while the caller waits for an available agent |
| **Disconnect Contact (`DisconnectContact_p0y`)** | Ends the interaction on unhandled Case branches or queue errors |

---

## Flow Variables

| Variable | Type | Description |
|---|---|---|
| `event_name` | String | Name of the confirm event sent to the AI Agent via State Event (e.g., `check_availability_confirm_entry`) |
| `event_data` | JSON | Event payload received from or sent to the AI Agent; holds the API response JSON after HTTP fulfillment |
| `event_data_string` | String | String version of `event_data` — the VAV2 State Event `eventData` field only accepts strings |
| `http_input` | String | The full metadata JSON parsed from `VirtualAgentV2_vej.MetaData`; used as the HTTP request body |
| `Global_VoiceName` | String | Determines the voice used for Text-to-Speech (global variable; default: `en-US-Jennifer`) |

---

## Demo Appointment API

All four HTTP activities call a public Cisco demo API at the same base URL:

```
http://ec2-18-225-36-23.us-east-2.compute.amazonaws.com:5003/
```

Each operation uses a POST request with the JSON body from `http_input` (parsed from the AI agent's metadata):

| Operation | Endpoint | Method |
|---|---|---|
| Check availability | `/check_availability` | POST |
| Create appointment | `/create_appointment` | POST |
| Lookup appointment | `/lookup_appointment` | POST |
| Cancel appointment | `/cancel_appointment` | POST |

The API response is captured directly into `event_data` (JSON path `$`) and returned to the agent via the confirm State Event.

> This API is for testing and demonstrations only. It is not a production appointment management system and has no SLA. For a real deployment, replace the `httpRequestUrl` in each HTTP Request activity and update `outputVariableArray` JSON path expressions to match your backend's response schema.

---

## Custom Events (Exit → Confirm Pattern)

The flow uses a bidirectional custom event pattern between the AI agent and Flow Designer:

| AI Agent Exit Event | Triggered When | Flow Confirm Event (sent back) |
|---|---|---|
| `check_availability_exit` | Agent has collected availability search criteria | `check_availability_confirm_entry` |
| `create_appointment_exit` | Agent has collected all booking details | `create_appointment_confirm_entry` |
| `lookup_appointment_exit` | Agent has collected appointment lookup identifier | `lookup_appointment_confirm_entry` |
| `cancel_appointment_exit` | Agent has collected appointment cancellation identifier | `cancel_appointment_confirm_entry` |

The AI agent's metadata (available at `VirtualAgentV2_vej.MetaData`) is parsed into `http_input` and used as the POST body for the HTTP call.

---

## Additional Resources

- [Webex Contact Center Developer Documentation](https://developer.webex-cx.com)
- [Webex Contact Center Flow Designer Guide](https://help.webex.com/en-us/article/n5595zd/Webex-Contact-Center-Setup-and-Administration-Guide)
- [Configure fulfillment for scripted AI agents](https://help.webex.com/en-us/article/mzpuseb)
- [Webex AI Agent Studio Administration Guide](https://help.webex.com/en-us/article/ncs9r37/Webex-AI-Agent-Studio-Administration-guide)
- [Webex Contact Center APIs Developer Community](https://community.cisco.com/t5/contact-center/bd-p/j-disc-dev-contact-center)
- [Webex Developer Portal Support](https://developer.webex-cx.com/support)
