# Upstream Overview — dialogflow-sample

Adapted from:
[WebexSamples/webex-contact-center-api-samples / dialogflow-sample](https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/dialogflow-sample)
(Cisco Sample Code License v1.1)

---

## CX vs ES — Which Sample Should I Use?

| | **Dialogflow CX** | **Dialogflow ES** |
|---|---|---|
| **Generation** | Current (recommended for new projects) | Legacy / Essentials (maintenance mode) |
| **Deploy target** | Google Cloud Functions (standalone HTTP function) | Firebase Cloud Functions via Dialogflow ES Inline Editor |
| **Dependencies** | None — Node.js built-in `https` only | `dialogflow-fulfillment`, `firebase-functions`, `node-fetch` |
| **Caller context channel** | CX session parameters (passed by WxCC Virtual Agent Voice node) | `originalDetectIntentRequest.payload` in the Dialogflow webhook envelope |
| **Response format** | Raw `fulfillment_response` JSON | `dialogflow-fulfillment` SDK (`agent.add()`, `agent.context.set()`) |
| **Multi-turn flows** | CX pages and route groups | Dialogflow ES output contexts + followup events |
| **Pick this if…** | Starting a new project, want fewer dependencies, or your team standardizes on CX | You have an existing Dialogflow ES agent to extend, or you need the ES intent-routing SDK helpers |

> **Note:** Google has placed Dialogflow ES in maintenance mode. For new deployments,
> Google recommends [migrating to Dialogflow CX](https://cloud.google.com/dialogflow/cx/docs/concept/migration).

---

## Dialogflow CX Sample

### Video walkthrough
[Watch: Integrating Webex Contact Center with Google Dialogflow CX](https://app.vidcast.io/share/91531cc2-1a3e-4733-83c0-4310742cab53)

### Reference documentation
- [Dialogflow CX documentation](https://cloud.google.com/dialogflow/cx/docs)
- [Virtual Agent Voice in Webex Contact Center](https://help.webex.com/en-us/article/n6gaghu/Virtual-Agent-Voice-in-Webex-Contact-Center)

### What is included in the upstream sample
- `inline-editor.js` — Cloud Function webhook; handles Dialogflow CX fulfillment requests and returns `fulfillment_response` JSON
- `DF_CX_Flow.json` — Importable WxCC flow for the demo
- `Virtual_agent.zip` — Exportable Dialogflow CX virtual agent to import into your CX console

### Google Cloud Console setup (CX)
1. Create a Google Cloud project (or use an existing one).
2. Enable the **Dialogflow CX API** and **Cloud Functions API** in the project.
3. In the [Dialogflow CX console](https://dialogflow.cloud.google.com/cx), create a new agent in your project.
4. Restore the virtual agent: **Manage → Restore** → upload `src/dialogflow-cx-sample/Virtual_agent.zip`.
5. Create a Cloud Function (2nd gen, HTTP trigger, Node.js 18, region of your choice).
6. Paste `src/dialogflow-cx-sample/inline-editor.js` as the entry point (`acc_balance`).
7. Add runtime environment variable `MOCK_API_URL_CX` pointing to your balance API.
8. In the CX console, go to **Manage → Webhooks** and add a webhook pointing to the Cloud Function URL.
9. Attach the webhook to the relevant page or route group in your CX flow.

### Importing the WxCC flow (CX)
1. In **Webex Control Hub → Contact Center → Flows**, click **Import**.
2. Upload `src/dialogflow-cx-sample/DF_CX_Flow.json`.
3. In the imported flow, update the **Virtual Agent Voice** node to point to your Dialogflow CX agent.
4. Publish the flow and assign it to your entry point.

---

## Dialogflow ES Sample

### Video walkthrough
[Watch: Working with data on Google Dialogflow ES with Webex Contact Center](https://app.vidcast.io/share/491d0e41-99ab-44cf-a48b-18949c406d73)

### Reference documentation
- [Dialogflow ES reference](https://cloud.google.com/dialogflow/es/docs/reference)
- [Webex Contact Center developer documentation](https://developer.webex.com/webex-contact-center/docs/webex-contact-center)
- [Dialogflow Fulfillment Node.js library](https://github.com/dialogflow/dialogflow-fulfillment-nodejs)

### What is included in the upstream sample
- `inline-editor.js` — Firebase Cloud Function fulfillment; reads WxCC caller context from `originalDetectIntentRequest.payload`, performs CRM lookup, drives multi-turn conversation
- `CCAI_Flow_DialogFlowES.json` — Importable WxCC flow for the demo
- `package.json` — Firebase + Dialogflow fulfillment dependencies (updated to Node 18 in this Playbook)

### Google Cloud / Firebase setup (ES)
1. Create a Google Cloud project and link it to a Firebase project.
2. Enable the **Dialogflow ES API** and **Firebase** in the project.
3. In the [Dialogflow ES console](https://dialogflow.cloud.google.com/), create a new agent linked to your Firebase project.
4. In the ES console, go to **Fulfillment** and enable **Inline Editor**.
5. Replace the default `index.js` with the contents of `src/dialogflow-es-sample/inline-editor.js`.
6. Replace the default `package.json` with the contents of `src/dialogflow-es-sample/package.json`.
7. Update the `MOCK_API_URL_ES` reference in `inline-editor.js` to use your CRM endpoint, or set it as a Firebase environment variable:
   ```bash
   firebase functions:config:set crm.api_url="https://your-crm.example.com/api/customers"
   ```
   Then read it in code as `functions.config().crm.api_url`.
8. Click **Deploy** in the Inline Editor. Firebase deploys the function automatically.

### Importing the WxCC flow (ES)
1. In **Webex Control Hub → Contact Center → Flows**, click **Import**.
2. Upload `src/dialogflow-es-sample/CCAI_Flow_DialogFlowES.json`.
3. In the imported flow, update the **Virtual Agent Voice** node to point to your Dialogflow ES agent.
4. Publish the flow and assign it to your entry point.

### How WxCC passes caller context to Dialogflow ES
Webex Contact Center injects caller metadata into the Dialogflow webhook request body under:

```json
{
  "originalDetectIntentRequest": {
    "payload": {
      "name": "Caller Name",
      "email": "caller@example.com",
      "reason": "billing inquiry",
      "pin": "12345"
    }
  }
}
```

The fulfillment code reads each field from `request.body.originalDetectIntentRequest.payload`. You can add additional fields to the WxCC Virtual Agent Voice node configuration and they will appear in the same `payload` object.

---

## Upstream Disclaimer

> These samples are meant to be used as demos and to understand how to integrate Webex Contact Center with Google Dialogflow. When building a production-grade solution, consider the overall architecture and design with a security-first approach. These samples only provide working starter code; many layers have been simplified to focus on the Webex Contact Center use cases.

---

## Support

- **Webex Contact Center Developer Support:** https://developer.webex.com/explore/support
- **Developer Community:** https://community.cisco.com/t5/contact-center/bd-p/j-disc-dev-contact-center
