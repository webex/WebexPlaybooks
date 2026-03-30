# Webex Finesse Agent Presence Sync

> This Playbook is adapted from the [Webex Finesse Agent Presence Sync Gadget](https://github.com/wxsd-sales/webex-finesse-agent-presence) sample on GitHub.

## Use Case Overview

Contact center supervisors and administrators face a persistent friction point: agents who step away from their desk for a Webex call or meeting are still shown as `READY` in Cisco Finesse, causing calls to ring to an unavailable agent and degrading the customer experience. Manually toggling Finesse status is easy to forget, especially when agents join impromptu Webex meetings or receive unexpected calls.

This Playbook demonstrates how to build a **Webex Presence to Finesse Status Sync** integration that automatically mirrors an agent's real-time Webex presence state into their Cisco Finesse agent status — with no manual intervention required. When a Webex user goes Do Not Disturb, joins a Webex Meeting, starts a Webex Call, or becomes unavailable, their Finesse status is automatically set to `NOT_READY` with a matching reason code. When the presence clears, Finesse is returned to `READY`.

**Target persona:** Contact Center administrators, Finesse desktop developers, and Webex integrations engineers working in a Cisco UCCX or UCCE environment.

**Estimated implementation time:** 4–8 hours (including Finesse lab access, Webex bot creation, and end-to-end testing).

**Two operating modes are supported:**

| Mode | How it works | When to use |
|------|-------------|-------------|
| **Gadget mode** (recommended) | The server pushes presence data to the Finesse agent desktop browser via Socket.io. The Finesse gadget (JavaScript running in the agent's browser) calls the Finesse client-side API to set the agent's own state, including any specific NOT_READY reason code. | Production deployments. Agents can set granular NOT_READY reason codes (e.g. "Webex DND", "Webex Meeting", "Webex Call"). |
| **Server mode** | The Node.js server calls the Finesse REST API directly using a supervisor Basic Auth token to set the agent's state. | Quick tests or environments without a Finesse gadget framework. Limited: can only set `READY` or "Supervisor Initiated" `NOT_READY` (no specific reason code). |

## Architecture

The integration is a Node.js Express server that acts as a bridge between the Webex platform and Cisco Finesse.

**On startup**, the server:
1. Authenticates with the Webex platform using a Webex Bot access token
2. Uses the Webex JS SDK's internal presence plugin to subscribe to presence events for each configured agent (identified by their Webex email address)
3. Re-subscribes every 5 minutes to keep the Mercury WebSocket connection alive

**When a presence event fires** (via the Mercury WebSocket `apheleia.subscription_update` event), the server:
1. Maps the Webex user ID to the corresponding Finesse agent login ID
2. In **Gadget mode**: pushes the presence data to the agent's Finesse desktop via Socket.io; the gadget calls `user.setState()` on the Finesse client API
3. In **Server mode**: calls `PUT /finesse/api/User/:id` with the appropriate state

The Finesse gadget (loaded as an XML gadget in the agent's desktop layout) connects to the server via Socket.io on load, registers its Finesse agent ID, and listens for presence messages to drive state changes directly.

See the architecture diagram in [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md).

**Webex presence states and their Finesse mappings:**

| Webex Presence | Finesse State | Reason Code (Gadget mode) | Server mode |
|---------------|--------------|--------------------------|-------------|
| `dnd` | `NOT_READY` | "Webex DND" | Handled |
| `call` | `NOT_READY` | "Webex Call" | **Ignored** — no state change |
| `meeting` (online) | `NOT_READY` | "Webex Meeting" | Handled |
| `presenting` (online) | `NOT_READY` | "Webex Meeting" | **Ignored** — no state change |
| `unknown` / `unavailable` | `NOT_READY` | "Webex Unavailable" | **Ignored** — no state change |
| Any other status | `READY` | — | Handled |

## Prerequisites

### Webex Requirements
- A **Webex org** with presence features enabled
- A **Webex Bot** with a valid access token — [create one at developer.webex.com](https://developer.webex.com/docs/bots)
  - The bot does not need to be in the same space as the agents; it only subscribes to presence
- Each agent must have a Webex account with an email address in the format `<finesseLoginName>@<your-domain>`

### Cisco Finesse Requirements
- **Cisco Unified Contact Center Express (UCCX)** or **Unified Contact Center Enterprise (UCCE)** with Finesse 11.x or later
- Access to the **Finesse Administration Portal** to edit desktop layouts and add gadgets
- Finesse **NOT_READY reason codes** pre-created in Unified CCE Management with these exact labels:
  - `Webex DND`
  - `Webex Meeting`
  - `Webex Call`
  - `Webex Unavailable`
- A **Finesse administrator account** (for reading user/agent data via the REST API) — used for the `FINESSE_ADMIN_TOKEN`
- A **Finesse supervisor account** (for setting agent state via the REST API) — used for the `FINESSE_SUPERVISOR_TOKEN` (server mode only)

### Developer Environment
- **Node.js v21.5+** (the source was developed and tested on v21.5)
- **npm** for dependency installation
- **Docker** (optional but recommended for containerized deployment)
- A publicly accessible HTTPS endpoint for the Node.js server (e.g. an ngrok tunnel for local development, or a hosted server) — Finesse gadgets must be able to reach the server

### Network / Firewall
- The Node.js server must be able to reach:
  - `wss://mercury-connection.webex.com` (Webex Mercury WebSocket)
  - `https://idbroker.webex.com` (Webex auth)
  - Your Finesse server HTTPS endpoint (server mode only)
- The Finesse agent desktop browser must be able to reach the Node.js server (for Socket.io in gadget mode)
- If your Finesse server uses a self-signed TLS certificate, set `FINESSE_REJECT_UNAUTHORIZED=false` in the env — see the note in `src/server.js`

## Code Scaffold

The source code lives in `src/` and is structured as follows:

```
src/
├── server.js                        # Main application entry point
├── webex-lite.cjs                   # Slim Webex JS SDK bundle (presence + people plugins only)
├── package.json                     # npm dependencies and scripts
├── Dockerfile                       # Docker build definition
├── env.template                     # Required environment variables (copy to .env)
└── public/                          # Static files served to the Finesse gadget browser
    ├── WebexPresenceConnector_1.xml # Finesse gadget descriptor (OpenSocial XML)
    ├── WebexPresenceConnector.js    # Gadget JavaScript — handles Socket.io and Finesse state API
    ├── WebexPresenceConnector.css   # Gadget styles
    └── img/
        ├── connected.png
        └── disconnected.png
```

**`server.js`** — Express + Socket.io server. On startup, it calls the Finesse REST API to load all agents (`GET /finesse/api/Users`), then subscribes to each configured agent's Webex presence using the SDK's internal `presence.subscribe()` call. When a Mercury event fires, it either emits the presence data over Socket.io (gadget mode) or calls the Finesse API directly (server mode).

**`webex-lite.cjs`** — A custom CommonJS bundle of the Webex JS SDK that loads only the plugins needed for this integration (`@webex/internal-plugin-presence`, `@webex/plugin-people`, `@webex/internal-plugin-device`, `@webex/internal-plugin-mercury`). This keeps the footprint small compared to the full Webex SDK. This bundle was generated from the upstream [webex-finesse-agent-presence](https://github.com/wxsd-sales/webex-finesse-agent-presence) sample and is vendored directly into `src/`. It is **not automatically updated** when the `webex` package in `package.json` changes — the full SDK entry in `package.json` is kept for reference only and is not used at runtime. To update the bundle to a newer SDK version, refer to the upstream repository's build tooling.

**`public/WebexPresenceConnector_1.xml`** — The OpenSocial XML gadget descriptor loaded by the Finesse desktop framework. It dynamically loads `WebexPresenceConnector.js` from your server's `HOSTNAME`, connects to Socket.io, and calls `user.setState()` on the Finesse client API when presence messages arrive.

**What this code does NOT do:**
- It is not production-hardened — minimal error handling and retry logic
- It does not persist presence state across server restarts
- It does not support multiple Finesse clusters
- It does not implement token refresh for the Webex Bot token (tokens are long-lived for bots but should be rotated periodically)
- It does not validate Finesse TLS certificates in the default configuration (see `FINESSE_REJECT_UNAUTHORIZED`)

## Deployment Guide

### Part 1: Webex Bot Setup

1. Go to [https://developer.webex.com/my-apps](https://developer.webex.com/my-apps) and click **Create a New App**.
2. Choose **Create a Bot**, fill in the bot name and username, and click **Add Bot**.
3. Copy the **Bot Access Token** — you will need it for `WEBEX_ACCESS_TOKEN` in your `.env` file. Store it securely; it is not shown again.

### Part 2: Finesse Reason Code Setup

4. Log in to your **Unified CCE Management** portal (or UCCX Administration).
5. Navigate to **Call Center Settings > Reason Codes** (UCCE) or **Subsystems > Chat and Email > Reason Codes** (UCCX).
6. Create four NOT_READY reason codes with exactly these labels (case-sensitive):
   - `Webex DND`
   - `Webex Meeting`
   - `Webex Call`
   - `Webex Unavailable`
7. Note the numeric IDs assigned — you do not need them in the config, but they confirm the codes were created correctly.

### Part 3: Prepare Environment Variables

8. In the `src/` directory, copy `env.template` to `.env`:
   ```bash
   cp src/env.template src/.env
   ```
9. Open `src/.env` and fill in all required values. Refer to `env.template` for descriptions of each variable. Key values:
   - `WEBEX_ACCESS_TOKEN` — the bot token from step 3
   - `FINESSE_USERS` — comma-separated list of Finesse login names for agents to monitor (e.g. `agent1,agent2,agent3`)
   - `WEBEX_DOMAIN` — the email domain of those agents (e.g. `company.com`)
   - `FINESSE_BASE_URL` — your Finesse server URL (e.g. `https://finesse.company.com`)
   - `FINESSE_ORIGIN` — set to your Finesse server base URL (e.g. `https://finesse.company.com`); controls the Socket.io CORS origin and must match the URL the agent's browser connects from — in most deployments this is the same value as `FINESSE_BASE_URL`
   - `FINESSE_ADMIN_TOKEN` — base64-encoded `admin_username:password` Basic Auth string
   - `GADGET_MODE` — set to `true` for the recommended gadget deployment
10. To generate a Basic Auth token:
    ```bash
    echo -n "username:password" | base64
    ```
    Paste the output into `FINESSE_ADMIN_TOKEN` (and `FINESSE_SUPERVISOR_TOKEN` for server mode).

### Part 4: Deploy the Node.js Server

**Option A — Docker (recommended):**

11. Build the Docker image from the `src/` directory:
    ```bash
    cd src
    docker build -t finesse-agent-presence .
    ```
12. Run the container, mounting your `.env` file:
    ```bash
    docker run -p 5000:5000 --env-file .env finesse-agent-presence
    ```
    Verify the server starts by checking the logs for `Webex OBJ ready` and `listening on 5000`.

**Option B — npm:**

11. From the `src/` directory, install dependencies:
    ```bash
    cd src
    npm install
    ```
12. Start the server:
    ```bash
    npm start
    ```

### Part 5: Make the Server Publicly Accessible

13. For local development, expose the server with ngrok:
    ```bash
    ngrok http 5000
    ```
    Copy the `https://` forwarding URL (e.g. `https://abc123.ngrok.io`) — this is your `HOSTNAME`.
14. For production, deploy behind a reverse proxy (nginx, Caddy) with a valid TLS certificate on a public hostname.

### Part 6: Configure the Finesse Gadget (Gadget Mode Only)

15. Open `src/public/WebexPresenceConnector_1.xml` in a text editor.
16. On the line that reads:
    ```javascript
    HOSTNAME = "https://YOUR_SERVER_HOSTNAME";
    ```
    Replace `https://YOUR_SERVER_HOSTNAME` with the public URL from step 13 or 14.
17. Save the file. This file is served statically by your Node.js server — **no separate upload is needed**.
18. Log in to the **Finesse Administration Portal**.
19. Navigate to **Desktop Layout** (or **Team Resources > Desktop Layout** for team-specific layouts).
20. Add the following gadget entry inside the agent's Home tab `<gadgets>` section, replacing `your.webserver.com` with your server's public hostname:
    ```xml
    <gadget id="embeddedPresence">https://your.webserver.com/WebexPresenceConnector_1.xml</gadget>
    ```
21. Save the layout. Agents may need to refresh their Finesse desktop for the new layout to take effect.

> **Note:** The gadget dynamically loads Socket.io from `https://cdn.socket.io/4.7.2/socket.io.min.js` at runtime. In Finesse environments with outbound firewall restrictions or strict Content Security Policy headers, this CDN URL must be explicitly allowlisted. If the gadget appears to load but the "Connected" status never appears, check whether this URL is reachable from the agent's browser.

### Part 7: Verify End-to-End

22. Log in to the Finesse agent desktop as one of the configured agents (`FINESSE_USERS`).
23. Confirm the gadget loads and shows "Connected" in the presence indicator.
24. On your Webex app (signed in as the same agent), set your status to **Do Not Disturb**.
25. Within a few seconds, the Finesse agent status should change to `NOT_READY` with the reason "Webex DND".
26. Clear your Webex DND status — the agent should return to `READY`.
27. Check the server logs to confirm presence events are being received and processed.

> **Note:** Finesse caches gadget XML and JavaScript. If gadget changes do not appear after saving the layout, restart the Finesse server or append a cache-busting query parameter (e.g. `?v=2`) to the gadget URL in the Desktop Layout.

## Known Limitations

- **Webex Bot token expiry:** Webex Bot tokens are long-lived but should be rotated periodically. There is no automatic token refresh in this implementation — if the token expires, restart the server with a new token.
- **Presence subscription TTL:** Presence subscriptions are set with a 600-second (10-minute) TTL. The server re-subscribes every 5 minutes to maintain continuity. A server crash during this window may cause a brief gap in presence tracking.
- **Finesse caching:** The Finesse server caches gadget XML and JavaScript files. Changes to `WebexPresenceConnector_1.xml` or `WebexPresenceConnector.js` may not reflect for agents until the Finesse server is restarted. To work around this, load JavaScript dynamically (already done in this implementation for `.js` files).
- **TLS certificate validation:** The server ships with `rejectUnauthorized: false` for connections to the Finesse server. In production, set `FINESSE_REJECT_UNAUTHORIZED=true` and ensure your Finesse server has a valid, CA-signed TLS certificate.
- **Server mode limitation:** In server mode, only `READY` and "Supervisor Initiated" `NOT_READY` can be set — specific reason codes require gadget mode. Additionally, server mode only reacts to `dnd` and `meeting` (online) Webex presence events. The `call`, `presenting`, and `unavailable` states are silently ignored — no Finesse state change occurs when an agent is on a Webex call or presenting in server mode. Use gadget mode for full presence coverage.
- **Socket.io CDN dependency:** The gadget loads Socket.io from `https://cdn.socket.io/4.7.2/socket.io.min.js` at runtime. In environments with outbound firewall restrictions or Content Security Policy headers, this URL must be allowlisted for the gadget to function. The CDN version is pinned to `4.7.2` to match the server — do not replace it with a newer version without also updating `socket.io` in `package.json`.
- **CORS:** The Socket.io server restricts cross-origin connections to the `FINESSE_ORIGIN` value. If your Finesse server is at a different hostname than expected, update this value and restart the server.
- **Single Finesse cluster:** This implementation connects to a single Finesse server. Multi-cluster deployments would require extending the configuration.
- **Hardcoded Finesse API path:** The Finesse REST API path is fixed at `/finesse/api/`. If your deployment uses a non-standard path, update `server.js` accordingly.
- **Rate limits:** The Webex presence API does not publish explicit rate limits for bot-based subscriptions. Monitor for HTTP 429 responses in production.
- **License:** This Playbook's source code is adapted from MIT-licensed material. See [LICENSE](../../LICENSE) for details.
- **Disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
