# Webex Contact Center Agent Desktop Banking CRM

> This Playbook is adapted from the [WX12025](https://github.com/shrishailsd/WX12025) sample on GitHub.

## Use Case Overview

Banking contact centers need agents to have customer context the moment a call arrives — not after a manual search. Waiting for the agent to look up a caller by name wastes handle time and creates a poor customer experience.

This Playbook demonstrates a **browser-based banking CRM** that integrates directly with **Webex Contact Center (WxCC)** to deliver automatic screen pop on inbound calls and click-to-dial from any customer record. When a call is offered, the CRM immediately searches for the caller's phone number (ANI) and surfaces the matching customer profile — no manual lookup required. Agents can also dial customers directly from the CRM with one click, launching an outbound WxCC call through the same browser tab.

**Target persona:** WxCC developer or administrator building or evaluating a custom browser-based agent desktop with CRM integration.

**Estimated implementation time:** 2–4 hours (from token to live test call).

---

## Architecture

The integration is a **single-page browser application** with two loosely coupled layers:

- **Banking CRM layer** (`crm-app.js` + `banking-crm.html`) — manages a customer database, renders customer cards, handles search, and exposes a `dialPhone()` function tied to phone numbers rendered in customer cards.
- **WxCC Agent Desktop layer** (`wx1-sdk.ts`) — a Lit web component (`<wx1-sdk>`) that embeds the Webex Contact Center SDK directly in the browser. It handles agent authentication, station login, inbound call events, call controls (hold, resume, mute, end, wrap-up), and outbound click-to-dial.

The two layers communicate through the browser `window` object: the `<wx1-sdk>` component calls `window.searchCustomers()` and reads `window.customers` to trigger a screen pop, while the CRM calls `wx1Sdk.placeClicktoDialcall(phone)` for outbound dialing.

No backend server is required. All WxCC communication occurs through the `@webex/contact-center` npm SDK, which maintains a persistent WebSocket connection to the Webex Contact Center platform.

See the architecture diagram: [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md)

**Data flow — inbound screen pop:**
1. Agent enters a Webex access token in the `<wx1-sdk>` component and clicks **Login**.
2. The SDK initialises `new Webex({ credentials: { access_token } })`, calls `webex.cc.register()`, and populates station login options (teams, voice modes, idle codes).
3. Agent selects a team and voice option (Browser WebRTC, or a dial-in number), then clicks **Station Login** (`webex.cc.stationLogin()`).
4. When an inbound call arrives, the SDK fires `task:incoming`, extracts the ANI from `task.data.interaction.callAssociatedDetails.ani`, plays the ringtone, and calls `callCrmSearch(ANI)`.
5. `callCrmSearch` sets `window.searchCustomers()` on the parent/same window, which filters the CRM customer list and, if a match is found, displays a 15-second customer popup.
6. For browser (WebRTC) logins, **Answer** and **Decline** buttons appear. On answer (`task.accept()`), active call controls replace them: Hold, Resume, Mute/Unmute, End.
7. On call end, a wrap-up code selector appears if required by the WxCC flow; selecting a code calls `task.wrapup()`.

**Data flow — click-to-dial:**
1. Agent clicks a phone number in a CRM customer card.
2. `dialPhone()` in `crm-app.js` calls `wx1Sdk.placeClicktoDialcall(phone)`.
3. The SDK cleans the number (strips non-digit characters except `+`) and calls `webex.cc.startOutdial(cleanedPhone)`.
4. WxCC routes the outbound call back through the configured entry point; `task:incoming` fires with `isOutboundCall = true`, skipping the CRM screen pop.

---

## Prerequisites

### Webex / WxCC

- A **Webex Contact Center** org with at least one active agent account
- The target agent must have a WxCC **team**, **entry point**, and **queue** configured in Control Hub
- **WxCC Browser (WebRTC) telephony** enabled for the agent, OR a physical/soft phone configured as a dial-in number for non-browser station login
- A valid **Webex access token** for the agent account — generate one at [developer.webex.com](https://developer.webex.com) (personal access tokens expire after 12 hours; use an OAuth integration token for longer sessions)
- Outbound calling requires an **outdial entry point** configured in WxCC and the agent's team must be associated with it

### Developer Environment

- **Node.js** v16 or later (v18+ recommended)
- **npm** v9 or later
- A modern browser: Chrome or Edge recommended (WebRTC `getUserMedia` and `setSinkId` are required for browser station login; Firefox is not fully supported)
- Network access to `*.webex.com` and `*.wxcc.cisco.com` from the agent's browser — no inbound ports required (SDK uses outbound WebSocket)

### No backend required

This application runs entirely in the browser. No web server, webhook endpoint, or server-side credentials are needed.

---

## Code Scaffold

This sample is **demonstration code**. It is not production-hardened: the customer database is an in-memory JavaScript object, quick actions (create case, schedule callback, send email) log to the console and show toast notifications rather than calling real APIs, and the access token is entered manually in the browser UI. Review the Known Limitations section before using this as a basis for a production implementation.

### Directory layout

```
src/
├── banking-crm.html       # Application shell — loads all scripts, defines the CRM layout and <wx1-sdk> element
├── banking-crm.css        # Styles for the CRM UI (multi-tab layout, customer cards, quick actions)
├── crm-app.js             # CRM logic: in-memory customer data, search, card rendering, click-to-dial bridge
├── wx1-sdk.ts             # Webex Contact Center LitElement component: auth, station login, call handling
├── types.d.ts             # TypeScript declaration for the WAV audio import
├── tsconfig.json          # TypeScript compiler configuration for Parcel
├── package.json           # npm manifest: @webex/contact-center 3.9.0, Lit 3.x, Parcel 2.x
├── package-lock.json      # Lockfile for reproducible installs
├── setup-lab.sh           # Helper script: Node version check, npm install, smoke-build
├── ringtone.wav           # Incoming call ringtone audio (imported by wx1-sdk.ts)
└── env.template           # Runtime configuration reference (see env.template for notes)
```

### Key files

**`wx1-sdk.ts`** is the core integration file. It exports a `<wx1-sdk>` custom element (Lit `LitElement`) with:
- `startConnection()` — initialises the Webex SDK with the agent's access token and calls `webex.cc.register()` to retrieve the agent profile
- `stationLogin()` / `stationLogout()` — calls `webex.cc.stationLogin()` / `webex.cc.stationLogout()` with team, voice option, and optional dial number
- `getOptions()` — subscribes to `task:incoming`, `task:assigned`, `task:media`, `agent:stateChangeSuccess` and manages all call lifecycle events
- `placeClicktoDialcall(phone)` — public method called by `crm-app.js`; calls `webex.cc.startOutdial(cleanedPhone)` for outbound dialing
- `callCrmSearch(ani)` — triggers `window.searchCustomers()` and builds a customer popup for inbound screen pop

**`crm-app.js`** exposes the CRM as a collection of `window`-scoped functions (`searchCustomers`, `populateCustomerCards`, `dialPhone`, etc.) and an in-memory `window.customers` object that `wx1-sdk.ts` reads for screen pop matching.

---

## Deployment Guide

### 1. Obtain the source code

Clone this repository and navigate to the playbook folder:

```bash
git clone https://github.com/webex/WebexPlaybooks.git
cd WebexPlaybooks/playbooks/wxcc-banking-crm/src
```

### 2. Verify Node.js version

```bash
node --version   # must be v16 or later
npm --version    # must be v9 or later
```

### 3. Install dependencies

```bash
npm ci
```

Use `npm ci` (not `npm install`) to reproduce the exact dependency tree from `package-lock.json`.

### 4. Start the development server

```bash
npm run dev
```

Parcel starts a local dev server (default: `http://localhost:1234`) and opens `banking-crm.html` in your default browser. Hot module replacement is enabled — changes to source files reload automatically.

### 5. Generate a Webex access token

1. Go to [developer.webex.com](https://developer.webex.com) and sign in with the **WxCC agent account** (not an admin account).
2. Under your profile, copy the **Personal Access Token** (valid for 12 hours).
3. For longer sessions, create an OAuth 2.0 integration and obtain a token through the Authorization Code flow — see [developer.webex.com/docs/integrations](https://developer.webex.com/docs/integrations).

### 6. Log in to the agent desktop

1. In the browser, locate the **Webex Contact Center** panel in the right column.
2. Paste the access token into the **Access Token** field and click **Login**.
3. Wait for the SDK to register — the agent's name and station options will appear.
4. Select a **voice option** (Browser for WebRTC, or a dial-in number option).
5. Select your **team** from the dropdown.
6. If using a non-browser voice option, enter your dial-in phone number.
7. Click **Station Login**. The panel will confirm the logged-in state.

### 7. Test an inbound call

1. From another phone or the Webex App, call the WxCC entry point number associated with the agent's team.
2. The ringtone plays and the **Answer / Decline** buttons appear (browser login) or an incoming call message shows (non-browser login).
3. The CRM automatically searches for the caller's ANI. If a match is found in the sample customer data, a popup appears with the customer's details.
4. Answer the call. Hold, Resume, Mute, and End controls replace the answer/decline buttons.
5. End the call. If wrap-up is required by your WxCC flow, select a wrap-up code from the dropdown.

### 8. Test click-to-dial

1. In the **Search** tab, click any phone number shown in a customer card (displayed in blue underlined text).
2. Confirm the outbound call prompt in the browser.
3. WxCC routes the call to the configured outdial entry point. The `task:incoming` event fires and the **Answer** button appears. Click **Answer** to connect.

### 9. Build for static hosting (optional)

To produce a deployable bundle:

```bash
npm run build
```

The compiled output is placed in `dist/`. Host the contents of `dist/` on any static web server (e.g. GitHub Pages, AWS S3 + CloudFront, Azure Static Web Apps). The `banking-crm.html` entry point becomes `dist/index.html`.

<!-- TODO: verify that the Parcel output path and entry point filename are correct for your hosting environment — some static hosts require `index.html` at the root -->

---

## Known Limitations

### Access token handling

The access token is entered manually in the browser UI and stored only in browser memory — it is never sent to a backend server. **Personal access tokens from developer.webex.com expire after 12 hours.** For sessions longer than 12 hours, implement an OAuth 2.0 Authorization Code flow with token refresh. See [developer.webex.com/docs/integrations](https://developer.webex.com/docs/integrations).

### In-memory customer database

`crm-app.js` uses a hard-coded in-memory customer object with three sample records. In a real deployment, this must be replaced with API calls to your CRM backend. The quick actions (Create Case, Schedule Callback, Send Email) are UI-only stubs that show success toasts without calling any external API.

### ANI matching

The CRM screen pop matches the incoming ANI against customer phone numbers and name fields using a simple string `includes()` comparison. This may produce false positives or miss matches if phone numbers are formatted differently (e.g. E.164 vs. local format). Normalise phone number format in both the CRM data and the ANI before matching in production.

### Outbound dialing

`webex.cc.startOutdial()` requires an **outdial entry point** configured in the WxCC Control Hub tenant and the agent's team to be associated with it. Outbound call wrap-up uses the `AgentWrappedUp` / `AgentOutboundFailed` workaround events noted in the source code comments, as the task-level outbound events were not yet stable in SDK 3.9.0.

### Browser compatibility

Browser (WebRTC) station login requires `getUserMedia` and `HTMLAudioElement.setSinkId`. Chrome and Edge are fully supported. Firefox does not support `setSinkId` and may not support all WebRTC features used by the Webex Contact Center SDK.

### Wrap-up alert dialogs

The current implementation uses `alert()` dialogs for wrap-up confirmation. These block the browser main thread and should be replaced with in-page UI notifications in any user-facing deployment.

### Rate limits

The `@webex/contact-center` SDK communicates over persistent WebSocket connections. Webex Contact Center applies per-tenant and per-agent concurrency limits. Refer to the [Webex Contact Center Developer Documentation](https://developer.webex.com/docs/webex-contact-center) for current rate limit guidance.

### License

This Playbook is adapted from sample code released under the [MIT License](https://github.com/shrishailsd/WX12025/blob/main/package.json). See [LICENSE](../../LICENSE) for the Webex Playbooks repository license.

This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
