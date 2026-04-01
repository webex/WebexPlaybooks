# WxCC Queue Scroll Widget

> This Playbook is adapted from the [scrolling-queue-info](https://github.com/kevsimps/scrolling-queue-info) sample on GitHub by [@kevsimps](https://github.com/kevsimps).

A Webex Contact Center Agent Desktop header widget that displays a real-time scrolling ticker of queue statistics — including active contact counts and longest wait times — directly in the Agent Desktop `advancedHeader`.

---

## Use Case Overview

Contact center supervisors and agents often need quick visibility into queue load without navigating away from the interaction they are handling. This widget embeds directly into the Webex Contact Center Agent Desktop header bar as a **custom web component** (`<queue-scroll>`), providing a continuously scrolling display of every queue the logged-in agent is eligible to receive interactions from.

**Business outcome:** Agents can monitor queue health — contacts waiting and longest wait time — at a glance, without switching views or opening a separate reporting dashboard.

**Target persona:** Webex Contact Center agents and team leads who need ambient queue awareness during live interactions.

**Estimated implementation time:** 1–2 hours (including Agent Desktop layout configuration and local testing).

---

## Architecture

The widget is a [Lit](https://lit.dev/) web component built with TypeScript and bundled as a single IIFE JavaScript file using Vite. It is loaded into the Webex Contact Center Agent Desktop via the `advancedHeader` section of the desktop layout JSON.

When the widget mounts in the Agent Desktop, the desktop injects four runtime values from its internal store (`$STORE.*`) as HTML attributes on the `<queue-scroll>` element. The component uses these to authenticate and fetch data from the Webex Contact Center REST and GraphQL APIs.

**Data flow:**

1. Agent Desktop renders the `<queue-scroll>` web component in the header, passing `orgId`, `agentId`, `teamId`, and `token` as attributes.
2. On mount, the widget calls three Contact Service Queue endpoints to discover the queues the agent is eligible for (agent-based, skill-based, and team-linked queues).
3. Every 30 seconds, the widget queries the WxCC Search GraphQL API for active parked tasks across those queues, aggregating contact counts and oldest start times.
4. A 1-second UI update interval re-renders the scrolling ticker with the latest stats.

See the architecture diagram in [`/diagrams/architecture-diagram.md`](diagrams/architecture-diagram.md).

**Webex APIs used:**

| API | Description |
|-----|-------------|
| `GET /organization/{orgId}/v2/contact-service-queue/by-user-id/{agentId}/agent-based-queues` | Fetches agent-based queues the agent is assigned to |
| `GET /organization/{orgId}/v2/contact-service-queue/by-user-id/{agentId}/skill-based-queues` | Fetches skill-based queues the agent is eligible for |
| `GET /organization/{orgId}/team/{teamId}/incoming-references` | Fetches queues linked to the agent's team |
| `POST https://api.wxcc-us1.cisco.com/search` (GraphQL) | Aggregates active contact counts and oldest wait time per queue |

---

## Prerequisites

### Webex Contact Center

- A **Webex Contact Center** org with at least one active queue and at least one agent assigned to that queue.
- **WxCC Admin access** (Control Hub administrator role) to download and upload Agent Desktop layouts.
- An agent user account to test with. The agent must be assigned to one or more queues.

### Developer Environment

- **Node.js** (LTS, v18 or later recommended) and **npm** (v9+) or **Yarn** (v1.x).
- A terminal and text editor.
- (For local standalone testing only) A valid Webex Contact Center **access token** for the test agent, obtainable from the [Webex Developer Portal](https://developer.webex.com).

### Network

- Outbound HTTPS access to `api.wxcc-us1.cisco.com` from the machine serving the widget bundle. If you are hosting the built bundle on an internal server or CDN, ensure that host can reach the WxCC API endpoints.

> **Note:** The widget currently targets the US-1 datacenter (`api.wxcc-us1.cisco.com`). Deployments in other WxCC datacenters (EU, ANZ, etc.) will require updating the base URL in `src/queue-scroll.ts`.

---

## Code Scaffold

The source code lives in `/src/` and is structured as follows:

```
src/
├── queue-scroll.ts   # The <queue-scroll> Lit web component (core integration logic)
├── index.css         # Minimal reset/base styles for the standalone test harness
├── index.html        # Standalone test harness — loads the component outside Agent Desktop
├── vite.config.ts    # Vite build config — bundles to a single IIFE (index.js)
├── tsconfig.json     # TypeScript config (ES2023, strict mode, Lit decorators)
├── package.json      # Dependencies: lit, vite, typescript, concurrently
└── env.template      # Documents the four runtime properties needed for local testing
```

### `queue-scroll.ts` — the web component

This is the only file that contains integration logic. Key points:

- **`@property()` attributes:** `orgId`, `agentId`, `teamId`, `token` — passed by the Agent Desktop at runtime via `$STORE.*` bindings, or manually in `index.html` for local testing.
- **`getQueues()`** — called once on mount; hits three Contact Service Queue REST endpoints and builds `queueFilter` (an array of queue ID conditions for the GraphQL query).
- **`getStats()`** — called immediately after `getQueues()` resolves, then on a 30-second interval; POSTs a GraphQL query to the Search API to get active parked task aggregations.
- **`updateTemplate()`** — runs every second to re-render the scrolling `<ul>` with the latest `queueData`.
- The marquee animation is driven by pure CSS `@keyframes scroll`; hovering pauses the animation.

**What this code does NOT do:**

- It does not handle token refresh — the Agent Desktop manages the token lifecycle.
- It does not implement error recovery or retry logic beyond a `console.error`.
- It is not production-hardened; treat it as a starting point.
- It only targets `api.wxcc-us1.cisco.com` (US-1).

### `<queue-scroll>` Attribute Reference

| Attribute | Agent Desktop binding | Description |
|-----------|----------------------|-------------|
| `orgId` | `$STORE.agent.orgId` | Webex Contact Center organization ID |
| `agentId` | `$STORE.agent.agentDbId` | Agent database ID |
| `teamId` | `$STORE.agent.teamId` | Team ID the agent is logged into |
| `token` | `$STORE.auth.accessToken` | Bearer token for API authorization |

---

## Deployment Guide

### Part 1 — Build the widget bundle

1. Navigate to the `src/` directory and install dependencies:

   ```bash
   cd playbooks/wxcc-queue-scroll-widget/src
   npm install
   ```

2. Build the production bundle:

   ```bash
   npm run build
   ```

   Vite outputs a single IIFE file at `dist/queue-scroll.js` (and `dist/index.html`).

3. Serve the built bundle so the Agent Desktop can load it. For a quick local test, use the built-in preview server:

   ```bash
   npm run demo
   ```

   This runs `vite build --watch` and `vite preview` concurrently. The bundle is served at `http://localhost:4173/index.js`.

   > For production, host `dist/queue-scroll.js` (and `dist/index.js`) on a publicly accessible HTTPS URL or your organization's CDN. The Agent Desktop must be able to reach the script URL.

### Part 2 — Test the widget standalone (outside Agent Desktop)

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Open `src/index.html` in a text editor and fill in the four attribute values on the `<queue-scroll>` tag:

   ```html
   <queue-scroll
     orgId="YOUR_ORG_ID"
     token="YOUR_ACCESS_TOKEN"
     agentId="YOUR_AGENT_ID"
     teamId="YOUR_TEAM_ID">
   </queue-scroll>
   ```

   - **Org ID:** Found in Control Hub → Account → Organization ID.
   - **Agent ID / Team ID:** Found in Control Hub → Contact Center → Users/Teams, or via the [WxCC Developer Portal](https://developer.webex.com).
   - **Access token:** Generate a temporary developer token from the [Webex Developer Portal](https://developer.webex.com) (valid for 12 hours).

3. Open `http://localhost:5173/` in a browser. Place a test call into a queue the agent is assigned to. Within 30 seconds, queue stats should begin scrolling in the widget.

### Part 3 — Embed in the Agent Desktop header

1. In **Control Hub**, navigate to **Contact Center → Desktop Layouts** and download the layout JSON assigned to the team your test agent will log into.

2. Locate the `advancedHeader` array in the layout JSON and add the following entry:

   ```json
   {
     "comp": "queue-scroll",
     "properties": {
       "orgId": "$STORE.agent.orgId",
       "token": "$STORE.auth.accessToken",
       "teamId": "$STORE.agent.teamId",
       "agentId": "$STORE.agent.agentDbId"
     },
     "script": "http://localhost:4173/index.js"
   }
   ```

   > Replace `http://localhost:4173/index.js` with the public HTTPS URL of your hosted bundle for any deployment beyond local testing.

3. Save the modified layout JSON and upload it back to Control Hub for that team's desktop layout.

4. Build and start the preview server (if testing locally):

   ```bash
   npm run build
   npm run demo
   ```

5. Log into the Agent Desktop as the test agent, selecting the team with the updated layout. The scrolling queue ticker should appear in the header bar.

6. Place a call into a queue the agent is assigned to. Within 30 seconds the ticker should update with live stats.

<!-- TODO: verify the advancedHeader JSON path and key names against the current WxCC desktop layout schema in your org -->

---

## Known Limitations

- **US-1 datacenter only:** The widget hardcodes `api.wxcc-us1.cisco.com`. Organizations on EU, ANZ, or other WxCC datacenters must update the base URL in `src/queue-scroll.ts` before use.
- **Token management:** The widget relies entirely on the Agent Desktop to supply and refresh the access token. Running the widget outside the Agent Desktop requires a manually obtained token (valid for 12 hours from the Developer Portal).
- **No retry or error recovery:** API call failures are logged to the browser console but the widget does not retry or surface errors to the agent.
- **Race condition in `getQueues()`:** The three queue-fetching requests run in parallel with `forEach` + `async`. The final `getStats()` call is triggered when the last `forEach` iteration completes, but parallel fetch order is not guaranteed. In practice this is typically benign but could cause missed queues in rare cases.
- **`updateTemplate()` guard:** If `queueData` is undefined (before the first API response), `updateTemplate()` will throw. No guard is present in the upstream source.
- **Rate limits:** The WxCC Search API and Contact Service Queue APIs are subject to Webex Contact Center platform rate limits. See the [WxCC Developer documentation](https://developer.webex-cx.com) for current limits.
- **License:** The upstream source is licensed under [MIT](https://github.com/kevsimps/scrolling-queue-info/blob/main/LICENSE). Review the playbook repository's [`LICENSE`](../../LICENSE) for terms applicable to this Playbook.
- **Disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
