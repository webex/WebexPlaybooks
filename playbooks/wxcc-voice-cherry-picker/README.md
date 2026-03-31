# WxCC Voice Cherry Picker + Webex Contact Center Integration

This Playbook is adapted from the [wxcc-voice-cherry-picker](https://github.com/wxsd-sales/wxcc-voice-cherry-picker) sample on GitHub.

## Use Case Overview

In most Webex Contact Center deployments, voice calls are distributed to agents automatically via round-robin or longest-available routing. This works well for general queues, but breaks down for scenarios that require deliberate assignment — VIP customer handling, language-matched routing, scheduled callback fulfillment, or skills-based triage where agents need to see who is calling before accepting.

The WxCC Voice Cherry Picker solves this by replacing automatic distribution with **agent-driven call selection**. When a call enters the queue, its metadata (ANI, DNIS, caller name from SIP headers) appears immediately in a custom Agent Desktop widget. Agents can review the caller list, select a specific call to claim, and — if they are already on a call — conference in the queued caller using a two-step transfer-and-merge flow.

**Target persona:** WxCC administrators and contact center developers who want to give agents more control over which calls they handle.

**Estimated implementation time:** 4–8 hours.

## Architecture

The integration is composed of four parts that work together:

1. **WxCC Flow (Flow Builder)** — An HTTP Request node fires a POST to the Cherry Picker server on every `NewPhoneContact` event, forwarding ANI, DNIS, InteractionId, OrgId, and SIP headers before routing the call to the queue.

2. **Cherry Picker Server (Node.js / Express + Socket.io)** — A lightweight server that receives the flow webhook, caches call metadata keyed by `InteractionId` (TTL 1 hour), and pushes the data in real time to all connected widget clients via Socket.io rooms scoped to `OrgId`. It also exposes a `/callerIds` endpoint so the widget can look up cached caller data when it polls the Tasks API on a 5-second interval.

3. **Cherry Picker Widget (Frontend / `@wxcc-desktop/sdk`)** — A custom Web Component (`sa-ds-voice-sdk`) built on the WxCC Agent Desktop SDK. It connects to the server via Socket.io, shows a filterable live list of queued calls with ANI/DNIS context, and presents either a **Claim** button (when the agent is idle) or a **Conference** button (when the agent is already on a call). The widget is bundled with webpack and loaded as a custom script in the Agent Desktop layout.

4. **WxCC Tasks API** — The widget uses the agent's OAuth access token (surfaced by `@wxcc-desktop/sdk`) to call `GET /v1/tasks` every 5 seconds to reconcile the task list, and `POST /v1/tasks/{taskId}/assign` to claim a selected call.

See the architecture diagram in [/diagrams/architecture-diagram.md](diagrams/architecture-diagram.md).

## Prerequisites

**Webex Contact Center:**
- WxCC org with administrator access in Control Hub
- At least one configured Entry Point, Queue, and Flow
- Service Queue updated via API to set `"manuallyAssignable": true` — there is no Control Hub UI for this; it must be done with the WxCC REST API (e.g., via Postman or Bruno)
- Multimedia Profile (MMP) for the target agent team updated via API to set `"manuallyAssignable": { "telephony": 1 }` — same API-only requirement

**Server infrastructure:**
- A publicly accessible HTTPS server to host the Cherry Picker server (the WxCC Flow HTTP Request node cannot reach `localhost`)
- A valid SSL/TLS certificate on that server (required by the Agent Desktop widget's Content Security Policy)
- Port availability as configured in `PORT` (default 5000)

**Developer environment:**
- Node.js ≥ 21.5, or Docker
- npm (comes with Node.js)

**Agent Desktop:**
- Access to the WxCC Administration Portal to upload a custom Desktop Layout JSON
- The agent team must be assigned the layout that includes the Cherry Picker widget

## Code Scaffold

All runnable source code lives in `/src/`. The structure mirrors the upstream repo:

```
src/
├── index.js                        Entry point: Express + Socket.io server
├── package.json                    Dependencies and npm scripts
├── webpack.config.cjs              Webpack config — bundles src/widget-SDK-Voice.js → src/build/bundle.js
├── Dockerfile                      Containerized deployment (Node 21.5)
├── cherryPickerWidget.json         Agent Desktop layout JSON — upload to WxCC Administration Portal
├── env.template                    Required environment variables (rename to .env before running)
├── flow/
│   └── GenericCherryPickerFlow.json    Importable WxCC Flow — HTTP Request → Queue → Hold music loop
└── src/
    ├── widget-SDK-Voice.js         Frontend Web Component: task list, Claim/Conference/Merge logic
    ├── socket.io.min.js            Vendored Socket.io client (served statically by the Express server)
    └── img/
        └── loading-1.gif           Loading indicator used by the widget
```

**`index.js`** — The backend server. Receives call metadata from the WxCC Flow via `POST /`, caches it in a TTL memory store, and emits it to connected clients via Socket.io. Exposes `POST /callerIds` for the widget to resolve ANI/DNIS for task IDs it sees via the Tasks API, and `POST /transfer-hold` for the conference flow's hold-polling logic.

**`src/widget-SDK-Voice.js`** — The frontend Web Component. Uses `@wxcc-desktop/sdk` to access the agent's access token and Desktop event system. Renders an animated card list of queued calls, polls `GET /v1/tasks` every 5 seconds, and shows Claim or Conference buttons based on the agent's current call state. Conference flow: transfers the agent's current call to a hold extension → assigns the cherry-picked call → agent clicks Merge to conference the two calls via `POST /v1/telephony/conference`.

> **Note:** This code is a demonstration. It is not production-hardened. Secrets must remain in environment variables and must never be committed. The `wrapUpTask` function contains a hardcoded `auxCodeId` and the `transferTask` function uses a hardcoded hold extension (`10070`) — both must be updated for your org before use. See the Known Limitations section.

## Deployment Guide

### 1. Configure environment variables

> **Docker users:** Skip this step. Pass your values as `--build-arg` flags on the `docker build` command in Step 4a instead.

Copy `src/env.template` to `src/.env`:

```bash
cp src/env.template src/.env
```

Open `src/.env` and set:

- `PORT` — TCP port for the server (default `5000`)
- `HOST_URI` — The **public** HTTPS base URL of your server (e.g., `https://cherry-picker.yourcompany.com`). This is injected into the frontend bundle at build time by `dotenv-webpack` and is also used by the flow webhook.

### 2. Update hardcoded org-specific values in the widget

Open `src/src/widget-SDK-Voice.js` and replace the following values specific to the original author's org:

- **`auxCodeId`** (line ~730): Replace `"859de2b3-9767-4b70-b380-cee9785656d5"` with a valid Wrap-Up Code ID from your WxCC org. Retrieve it from the WxCC REST API: `GET /v1/auxiliary-codes`.
- **Hold extension** (line ~522, passed to `transferTask("10070", ...)`): Replace `"10070"` with a dial number or extension in your org that can accept a transferred call and hold it during the conference setup.

### 3. Build the frontend widget

```bash
cd src
npm install
npm run build
```

This bundles `src/widget-SDK-Voice.js` into `src/build/bundle.js` using webpack. The `HOST_URI` from your `.env` is injected at build time.

### 4a. Run with Docker (recommended)

```bash
cd src
docker build --build-arg HOST_URI="https://cherry-picker.yourcompany.com" -t wxcc-voice-cherry-picker .
docker run -p 5000:5000 wxcc-voice-cherry-picker
```

Replace `https://cherry-picker.yourcompany.com` with your actual `HOST_URI`. If you use a non-default port, also pass `--build-arg PORT=<port>` and update the `-p` flag accordingly.

### 5. Configure the WxCC Queue and Multimedia Profile for manual assignment

These changes must be made via the WxCC REST API (Postman, Bruno, or equivalent). There is no Control Hub UI for these fields.

**a. Update the Service Queue:**
```
GET  https://api.wxcc-us1.cisco.com/v1/queues/{queueId}
PUT  https://api.wxcc-us1.cisco.com/v1/queues/{queueId}
     Add: "manuallyAssignable": true
```

**b. Update the Multimedia Profile:**
```
GET  https://api.wxcc-us1.cisco.com/v1/multimedia-profiles/{mmProfileId}
PUT  https://api.wxcc-us1.cisco.com/v1/multimedia-profiles/{mmProfileId}
     Add: "manuallyAssignable": { "telephony": 1, "chat": 0, "email": 0, "social": 0 }
```

### 6. Import the WxCC Flow

1. In Control Hub, navigate to **Contact Center > Flows**.
2. Import `src/flow/GenericCherryPickerFlow.json`.
3. Open the imported flow in Flow Builder.
4. Locate the **HTTPRequest** node. Update `httpRequestUrl` from `https://{{HOSTNAME}}` to your actual server URL, or update the flow variable `HOSTNAME` to your server's hostname.
5. Verify the **Queue** node points to your target queue.
6. Publish the flow and assign it to the Entry Point.

<!-- TODO: verify this step against your specific environment — queue IDs and entry point names will differ -->

### 7. Wire up the Agent Desktop layout

1. Open `src/cherryPickerWidget.json`.
2. On the line containing `"script": "https:// /build/bundle.js"`, replace `https:// ` with your `HOST_URI` (e.g., `"script": "https://cherry-picker.yourcompany.com/build/bundle.js"`).
3. In the WxCC Administration Portal, navigate to **Desktop Layout** and upload the updated `cherryPickerWidget.json`.
4. Assign the layout to the agent team.

### 8. Verify

1. Log in as an agent on the assigned team at [https://desktop.wxcc-us1.cisco.com](https://desktop.wxcc-us1.cisco.com).
2. Navigate to the **Cherry Picker** tab in the left navigation.
3. Place a test call to the Entry Point configured in Step 6.
4. Confirm the call appears in the widget with ANI/DNIS metadata.
5. Click **Claim** to verify the call is delivered to the agent.

## Known Limitations

**Hardcoded org-specific values in the widget source:**
- `wrapUpTask` uses a hardcoded Wrap-Up Code `auxCodeId` specific to the original author's org. This will fail silently in any other org unless updated (Step 2 of the Deployment Guide).
- `transferTask` uses hardcoded hold extension `"10070"`. Replace with a valid dial number in your org for the conference flow to work.

**Region hardcoding:**
- `index.js` sets the Socket.io CORS origin to `https://desktop.wxcc-us1.cisco.com` only. Agents in EU1, EU2, or ANZ1 regions must update this value and the `HOST_URI` variable to match their region's Agent Desktop URL.
- The widget makes API calls to `https://api.wxcc-us1.cisco.com`. Agents outside US1 must update these endpoints.

**Real-time call notification requires flow configuration:**
- If the WxCC Flow HTTP Request node is not configured, new calls will only appear in the widget after the 5-second polling interval (not in real time). Skipping Step 6 is possible for testing but degrades the experience.

**Public server required:**
- The WxCC Flow HTTP Request node cannot contact `localhost`. A publicly accessible HTTPS server with a valid certificate is required for the flow webhook to reach the Cherry Picker server.

**No persistence:**
- Call metadata is stored in an in-memory TTL cache. Restarting the server clears all cached caller data. Tasks in the WxCC queue are unaffected, but ANI/DNIS enrichment will not be available for calls that arrived before the server started.

**License:**
This Playbook is adapted from the [wxcc-voice-cherry-picker](https://github.com/wxsd-sales/wxcc-voice-cherry-picker) project, licensed under the [MIT License](../../LICENSE). Review the license terms for commercial use.

**Webex disclaimer:**
This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
