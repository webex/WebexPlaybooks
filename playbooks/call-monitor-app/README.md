# Call Monitor — Webex Embedded App Sidebar

This Playbook is adapted from the [CallMonitorApp](https://github.com/WebexSamples/CallMonitorApp) sample on GitHub.

## Use Case Overview

Agents and developers need **in-call context** without leaving Webex: who is calling, what state the call is in, and quick access to customer-like profile data. This integration delivers a **sidebar Embedded App** that reacts to **Webex Calling** events from the [Sidebar API](https://developer.webex.com/docs/embedded-apps-framework-sidebar-api-quick-start), shows a visual call-state flow, logs events, and surfaces **mock CRM** cards (Faker-generated) for each remote participant. A sidebar badge reflects how many calls are active.

**Target persona:** Webex developers building Embedded Apps for Calling, or solution architects prototyping CRM screen-pop style experiences.

**Estimated implementation time:** 2–4 hours (app registration, local HTTPS or tunnel, first successful load in the Webex client).

The value moment is **during an active call**: as `sidebar:callStateChanged` fires, the UI updates immediately—mirroring what you would drive from a real CRM lookup keyed on caller ID or participant identity.

## Architecture

The Webex desktop or web client hosts your app in an **iframe**-style embedded context. The page loads the **@webex/embedded-app-sdk** script (see `src/public/index.html`), then `App.js` constructs `new window.webex.Application(config)`, awaits `onReady()` and `listen()`, and subscribes to `sidebar:callStateChanged`. Participants and call metadata arrive from Webex; **customer objects** are synthesized in the browser via `generateCustomer.js` unless you replace that path with API calls.

Authentication to Webex for end users is **handled by the Webex client**; this sample does not implement OAuth flows in your server. For a production CRM, you would add your own token acquisition and callout pattern (typically a backend, not long-lived secrets in the React bundle).

See [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md) for a sequence view of event flow and badge updates.

## Prerequisites

- **Node.js** 18 LTS or newer (the upstream sample noted v14+; current tooling works best on 18+).
- **npm** (or yarn) for installing dependencies.
- **Webex account** with access to **Webex (Teams) Calling** and permission to use **Embedded Apps** in your org.
- **Embedded App registration** in [Webex Control Hub](https://admin.webex.com) / [developer.webex.com](https://developer.webex.com) per the [Embedded Apps guide](https://developer.webex.com/docs/embedded-apps-guide)—your **Start URL** must match where the app is hosted (for example `http://localhost:3000` during development, or a public HTTPS URL after build).
- **Local development:** for some clients, **HTTPS** or a tunnel such as [ngrok](https://ngrok.com) may be required so the Start URL matches what Control Hub expects; confirm against your org policy <!-- TODO: verify HTTPS vs localhost for your Webex client and org policy -->.
- **Network:** the default `index.html` loads the Embedded App SDK from **unpkg** (`@webex/embedded-app-sdk@latest`) and Google Fonts; those endpoints must be reachable from the machine running the browser.

## Code Scaffold

All runnable code lives in **`src/`** (this Playbook’s React project root—same level as `package.json`):

| Area | Purpose |
| ---- | ------- |
| `package.json` | React 18, `react-scripts`, Materialize CSS, `@faker-js/faker`, testing and formatting tooling. |
| `public/index.html` | Injects the Embedded App SDK script tag and CRA shell. |
| `src/App.js` | SDK init, `sidebar:callStateChanged` handling, badge updates, modal state. |
| `src/Calls.js`, `src/Events.js`, `src/CallStateFlow.js` | Call list, event log, state visualization. |
| `src/Customer.js`, `src/generateCustomer.js` | Modal profile UI and mock data generation. |
| `src/Simulate.js` | Simulate call events without a real call. |
| `env.template` | Documents optional env vars for dev server and future CRM API wiring. |

The code demonstrates **documented** Embedded App Sidebar behavior; it is **not** production-hardened (limited error recovery, mock data only, `@latest` SDK from CDN). Move any real secrets to environment variables and prefer **pinning** SDK versions for repeatable builds.

## Deployment Guide

1. **Open a terminal** and go to the React project root:  
   `cd playbooks/call-monitor-app/src`

2. **Install dependencies:**  
   `npm ci`  
   (use `npm install` if you do not rely on the lockfile.)

3. **Optional — environment file:**  
   `cp env.template .env`  
   Uncomment or set variables if you extend the app (see Known Limitations for CDN pinning).

4. **Start the development server:**  
   `npm start`  
   Confirm the app responds at `http://localhost:3000` (or the URL shown in the terminal).

5. **Register or update your Embedded App** so the **Start URL** matches step 4 (including port), following [Embedded Apps setup](https://developer.webex.com/docs/embedded-apps-guide).

6. **Join or place a Webex call** in the client where Embedded Apps are enabled; **open the sidebar** and launch your app. You should see SDK initialization in the browser devtools console and live updates as call state changes.

7. **Optional — production build:**  
   `npm run build`  
   Deploy the `build/` folder to static hosting, update the Embedded App Start URL to that HTTPS origin, and retest.

8. **Optional — simulation:** Use the in-app **Simulate** flow from `Simulate.js` to generate test events without a live call.

## Known Limitations

- **Mock data only:** Customer profiles are generated by Faker; there is no real CRM, database, or ticket system.
- **CDN SDK:** `public/index.html` loads `@webex/embedded-app-sdk@latest` from unpkg; version drift can change behavior—pin a specific version for production-style testing.
- **Embedded App constraints:** Features depend on org settings, client version, and [Sidebar API](https://developer.webex.com/docs/embedded-apps-framework-sidebar-api-quick-start) availability; not all events may appear in every scenario.
- **Rate limits:** Not applicable to this sample’s local mock path; a real CRM backend would need API rate-limit handling and backoff.
- **Licensing — source sample:** The upstream [CallMonitorApp](https://github.com/WebexSamples/CallMonitorApp) uses the **Cisco Sample Code License**; review that license for redistribution terms outside Cisco products and services.
- **Licensing — this Playbook repo:** See the Playbook repository [LICENSE](../../LICENSE) for contribution and distribution terms for files added in WebexPlaybooks.
- This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
