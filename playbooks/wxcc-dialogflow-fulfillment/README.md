# Google Dialogflow Virtual Agent Fulfillment for Webex Contact Center

> This Playbook is adapted from the [webex-contact-center-api-samples / dialogflow-sample](https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/dialogflow-sample) on GitHub.

---

## Use Case Overview

Contact center developers who need to add AI-powered self-service to Webex Contact Center (WxCC) voice flows often face the same question up front: **which Google Dialogflow generation should I use — CX or ES?**

This Playbook answers that question and provides working fulfillment webhook samples for **both** variants. Each sample is a Google Cloud Functions webhook that a WxCC virtual agent node calls during a voice interaction. The webhook looks up caller context (name, email, reason, account balance) from a downstream system and returns a structured fulfillment response that the Dialogflow agent speaks back to the caller.

**Target persona:** WxCC flow developer or integration engineer who is evaluating Dialogflow or adding a new self-service use case to an existing WxCC deployment.

**Estimated implementation time:** 2–4 hours per sample (shorter if you already have a Google Cloud project and a Dialogflow agent).

### Which sample should I use?

| | **Dialogflow CX** (`src/dialogflow-cx-sample/`) | **Dialogflow ES** (`src/dialogflow-es-sample/`) |
|---|---|---|
| **Dialogflow generation** | CX (current, recommended for new projects) | ES (legacy, Essentials) |
| **WxCC integration path** | Virtual Agent Voice → Webhook fulfillment (Cloud Function) | Virtual Agent Voice → Inline Editor (Firebase Cloud Functions) |
| **Runtime / deploy target** | Google Cloud Functions (standalone HTTP function) | Dialogflow ES Inline Editor (Firebase Cloud Functions) |
| **Dependencies** | None — uses Node.js built-in `https` module only | `dialogflow-fulfillment`, `firebase-functions`, `node-fetch` |
| **Webex CC data access** | Via `req.body` from the CX webhook request | Via `originalDetectIntentRequest.payload` in the ES fulfillment protocol |
| **Complexity** | Lower — single webhook, no framework | Moderate — Firebase + Dialogflow fulfillment SDK |
| **Pick this if…** | Starting a new project, prefer a lighter dependency footprint, or your org standardizes on CX | You have an existing Dialogflow ES agent you are extending, or you need the ES fulfillment SDK's intent routing helpers |

---

## Architecture

Both samples follow the same high-level pattern: an inbound call hits a WxCC flow, a **Virtual Agent Voice** node hands off to a Dialogflow agent, and the agent calls a webhook (Cloud Function) to fetch real data before responding to the caller. The two paths differ in which Dialogflow generation is used and how the webhook is hosted.

See the annotated diagrams in [/diagrams/architecture-diagram.md](diagrams/architecture-diagram.md) for a side-by-side view of the CX and ES data flows.

**CX path:** The Dialogflow CX agent triggers a webhook page or route group. WxCC sends caller metadata as custom parameters. The Cloud Function (`acc_balance`) calls a backend API to retrieve an account balance and returns a `fulfillment_response` object.

**ES path:** The Dialogflow ES agent calls the fulfillment webhook on the `Default Welcome Intent`. WxCC sends caller metadata in `originalDetectIntentRequest.payload`. The Firebase Cloud Function reads `name`, `email`, `reason`, and `pin` from that payload, performs a CRM lookup using the PIN, and returns a spoken confirmation via the `dialogflow-fulfillment` SDK.

Authentication between WxCC and Dialogflow is handled by the Google Cloud project's service account that owns the Dialogflow agent. No Webex credentials are required in the fulfillment webhook itself.

---

## Prerequisites

### Webex Contact Center
- Active **Webex Contact Center** tenant with **Virtual Agent Voice** feature enabled
- Admin access to **Webex Control Hub** and the **Flow Designer**
- An entry point configured in WxCC for the demo flow

### Google Cloud / Dialogflow
- **Dialogflow CX sample:** Google Cloud project with a Dialogflow CX agent; Cloud Functions API enabled; `gcloud` CLI configured with deploy permissions
- **Dialogflow ES sample:** Google Cloud project with a Dialogflow ES agent; Firebase project linked to the same Google Cloud project; Firebase CLI (`firebase-tools`) installed and authenticated; Node.js 18+ and npm installed locally

### Developer environment
- Node.js 18+ (CX sample uses built-in `https`; ES sample requires Firebase toolchain)
- npm (ES sample only)
- A downstream backend API or mock that returns account/CRM data (the samples ship with a Postman mock URL; replace with your own before using in any real environment)

---

## Code Scaffold

The source code under `/src/` is organized into two sub-folders, one per Dialogflow generation. You only need to deploy the one that matches your environment.

```
src/
├── dialogflow-cx-sample/
│   ├── inline-editor.js        # Cloud Function webhook for Dialogflow CX
│   ├── package.json            # Functions Framework devDependency + start/deploy scripts
│   ├── DF_CX_Flow.json         # Importable WxCC flow for the CX demo
│   └── Virtual_agent.zip       # Exportable Dialogflow CX virtual agent (import via Manage → Restore)
├── dialogflow-es-sample/
│   ├── inline-editor.js        # Firebase Cloud Function for Dialogflow ES
│   ├── package.json            # Firebase + Dialogflow fulfillment dependencies
│   └── CCAI_Flow_DialogFlowES.json  # Importable WxCC flow for the ES demo
└── env.template                # Required environment variables for both samples
```

**What the code demonstrates:**
- How to receive a Dialogflow webhook request from Webex Contact Center
- How to read caller context (CX: from request body fields; ES: from `originalDetectIntentRequest.payload`)
- How to call a downstream API and incorporate the result in the spoken fulfillment response
- How to return the correct fulfillment response shape for each Dialogflow generation

**What the code does NOT do:**
- Production error handling, retry logic, or circuit breaking
- Authentication/signature validation on incoming webhook requests
- Multi-tenant token management
- Persistent logging or metrics

For upstream notes, Vidcast walkthroughs, and Dialogflow console setup steps, see [docs/upstream-overview.md](docs/upstream-overview.md).

---

## Deployment Guide

### CX Sample

1. **Import the WxCC flow.** In Webex Control Hub → Flow Designer, import `src/dialogflow-cx-sample/DF_CX_Flow.json`. Publish the flow and assign it to your entry point.

2. **Create a Dialogflow CX agent.** In the Google Cloud console, create a new Dialogflow CX agent. Import the sample virtual agent (`src/dialogflow-cx-sample/Virtual_agent.zip`) via **Manage → Restore** in the CX console.

3. **Set your environment variables.** Copy `src/env.template` to `src/.env` and fill in the `MOCK_API_URL_CX` value with the URL of your account balance API.

4. **Deploy the Cloud Function.** From the Google Cloud console, create a new Cloud Function (HTTP trigger, Node.js 18+). Paste the contents of `src/dialogflow-cx-sample/inline-editor.js` into the inline editor. Set `MOCK_API_URL_CX` as an environment variable in the function's runtime configuration. Note the function's trigger URL.

5. **Configure the Dialogflow CX webhook.** In the CX console, go to **Manage → Webhooks** and add a new webhook pointing to the Cloud Function trigger URL from step 4.

6. **Attach the webhook to a route.** In the CX flow builder, select the page or route group where you want the account balance lookup to happen. Set the fulfillment to call the webhook created in step 5.

7. **Test the flow.** Call the WxCC entry point. The caller should hear the account balance spoken back by the Dialogflow agent.

---

### ES Sample

1. **Import the WxCC flow.** In Webex Control Hub → Flow Designer, import `src/dialogflow-es-sample/CCAI_Flow_DialogFlowES.json`. Publish the flow and assign it to your entry point.

2. **Create a Dialogflow ES agent.** In the Dialogflow ES console, create a new agent linked to your Google Cloud project and Firebase project.

3. **Enable the Inline Editor.** In the ES console, go to **Fulfillment** and turn on the **Inline Editor**. This activates Firebase Cloud Functions for the agent.

4. **Set your environment variables.** Copy `src/env.template` to `src/.env` and fill in `MOCK_API_URL_ES` with the URL of your CRM lookup API (query parameter: `pin`).

5. **Paste fulfillment code.** In the Inline Editor, replace the default `index.js` content with the contents of `src/dialogflow-es-sample/inline-editor.js`. Replace the default `package.json` content with `src/dialogflow-es-sample/package.json`. Update the `MOCK_API_URL_ES` reference in the code to read from `process.env.MOCK_API_URL_ES`.

6. **Set Firebase environment config.** Run `firebase functions:config:set crm.api_url="<your-crm-url>"` and update the fulfillment code to read from `functions.config().crm.api_url` if you prefer Firebase-style config over `process.env`.

7. **Deploy via the Inline Editor.** Click **Deploy** in the Dialogflow ES Fulfillment page. Firebase deploys the function automatically.

8. **Configure WxCC Virtual Agent.** In Webex Control Hub, configure the Virtual Agent Voice node in your flow to point to the Dialogflow ES agent created in step 2.

9. **Test the flow.** Call the WxCC entry point. The caller should hear a personalized greeting using the name, email, reason, and account details passed from WxCC through Dialogflow.

<!-- TODO: verify Inline Editor Firebase deployment steps against current Google Cloud console UI — the ES Inline Editor UI has changed across Dialogflow ES versions -->

---

## Known Limitations

- **Mock backend URLs:** Both samples ship with hardcoded Postman/MockAPI URLs that are not guaranteed to remain available. Replace `MOCK_API_URL_CX` and `MOCK_API_URL_ES` in your deployed functions with real backend endpoints before any real-world use.
- **Dialogflow ES deprecation:** Dialogflow ES (Essentials) is in maintenance mode. Google recommends migrating to Dialogflow CX for new projects. The ES sample is provided for developers maintaining existing ES agents. See [Google's migration guide](https://cloud.google.com/dialogflow/cx/docs/concept/migration).
- **ES dependency age:** The `dialogflow-fulfillment` SDK (`^0.6.1`) is deprecated and carries known vulnerabilities via its transitive dependencies. Run `npm audit` after install and review the output. For production deployments, evaluate migrating to a supported fulfillment approach or the Dialogflow CX sample instead.
- **No webhook authentication:** The fulfillment webhooks do not validate request signatures. In production, add Dialogflow webhook header validation or Google Cloud Function IAM controls to prevent unauthenticated calls.
- **Rate limits:** Dialogflow CX and ES are subject to [Google Cloud Dialogflow quotas](https://cloud.google.com/dialogflow/quotas). The WxCC Virtual Agent Voice feature also has per-tenant call limits; consult your Webex Contact Center license and capacity plan.
- **License:** This Playbook is adapted from a sample published under the [Cisco Sample Code License v1.1](https://github.com/WebexSamples/webex-contact-center-api-samples/blob/main/LICENSE). Review that license before use. This Playbook repo is covered by [LICENSE](../../LICENSE).
- **Webex disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
