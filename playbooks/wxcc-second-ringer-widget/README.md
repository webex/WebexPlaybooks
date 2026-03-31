# Second Ringer Header Widget for Webex Contact Center

> This Playbook is adapted from the [second-ringer](https://github.com/kevsimps/second-ringer) sample on GitHub, authored by [kevsimps](https://github.com/kevsimps).

## Use Case Overview

Contact center agents who use webRTC telephony often miss inbound calls when they are not wearing their headset — the ringer plays through the headset only and there is no fallback alert on the computer speaker or another available audio device.

The **Second Ringer** widget solves this by playing a configurable ring tone on a *second* audio output device (such as the laptop speaker) the moment an inbound contact or consult request is offered to the agent in Webex Contact Center. The ring stops automatically when the contact is assigned, ended, rerouted (RONA), or when the agent accepts a consult.

**Target persona:** WxCC developer or administrator who wants to improve agent alerting for webRTC telephony deployments.

**Estimated implementation time:** 2–4 hours (including hosting, layout configuration, and team assignment).

---

## Architecture

The Second Ringer is a **Webex Contact Center Header Widget** — a Lit web component that is rendered persistently in the Agent Desktop header bar. This is the correct Agent Desktop pattern for utility controls that need to remain visible and active regardless of which task panel the agent has open.

The widget is loaded by Agent Desktop at login time via a custom desktop layout JSON (`second-ringer_Layout.json`). Once loaded, it subscribes to contact lifecycle events from the `@wxcc-desktop/sdk` via the `window.AGENTX_SERVICE` interface. No backend server is required — all logic runs in the browser.

**Data flow:**
1. Agent Desktop loads the widget JS from a hosted static URL specified in the layout JSON.
2. On load, the widget requests microphone permission (required by browsers to enumerate audio output devices) and populates a device selector.
3. The agent selects a secondary audio device and enables the ringer via the header widget UI.
4. When `eAgentOfferContact` or `eAgentOfferConsult` fires, the widget plays `ring.mp3` on the selected output device using the Web Audio API (`HTMLAudioElement.setSinkId`).
5. When `eAgentContactAssigned`, `eAgentContactEnded`, `eAgentOfferContactRona`, or `eAgentConsulting` fires, the widget stops playback.

See the architecture diagram: [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md)

---

## Prerequisites

### Webex / WxCC

- A **Webex Contact Center** org with at least one agent team
- Webex Contact Center **webRTC telephony** enabled for the target agents (the problem this widget solves is specific to webRTC — agents using physical phones already hear the ring on their desk phone)
- Administrator access to **Control Hub** to create and assign desktop layouts
- A WxCC **Agent Desktop layout** — the included `src/second-ringer_Layout.json` is a ready-to-use starter layout with the widget pre-configured in `headerActions`

### Hosting

- A **publicly accessible static web server** (e.g. GitHub Pages, AWS S3 + CloudFront, Azure Static Web Apps, or any CDN) to serve the compiled widget files:
  - `dist/index.js`
  - `dist/ring.mp3`
- The server must be accessible over HTTPS from the agent's browser
- CORS headers are not required — the widget JS is loaded as a script, not via fetch

### Developer Environment

- **Node.js** v18 or later
- **npm** v9 or later (the project ships a `package-lock.json`; use `npm install` for reproducible installs)
- **TypeScript** ~5.9 (installed as a dev dependency; no global install needed)
- A modern browser (Chrome or Edge recommended; `setSinkId` is not supported in Firefox as of 2026)

---

## Code Scaffold

The source code is a TypeScript + [Lit](https://lit.dev/) web component project built with [Vite](https://vitejs.dev/). It demonstrates:

- Registering a custom element (`<second-ringer>`) for use as a WxCC Agent Desktop Header Widget
- Subscribing to Agent Desktop contact lifecycle events via `window.AGENTX_SERVICE.aqm.contact` from the `@wxcc-desktop/sdk`
- Enumerating browser audio output devices with `navigator.mediaDevices.enumerateDevices()` and routing audio to a selected device via `HTMLAudioElement.setSinkId()`
- Building a self-contained IIFE bundle with Vite for easy hosting as a single JS file

### Layout under `/src/`

| File | Purpose |
|------|---------|
| `second-ringer.ts` | Main widget component — contact event listeners, audio device selection, ringer logic |
| `my-element.ts` | Lit scaffold element (Vite project boilerplate; not used by the widget in production) |
| `index.html` | Vite dev server entry point (local development only) |
| `index.css` | Base CSS for the dev entry point |
| `index.d.ts` | TypeScript ambient declarations for the `window.AGENTX_SERVICE` global |
| `assets/lit.svg` | Lit framework logo (Vite scaffold asset) |
| `assets/ring.mp3` | **Binary asset — not included in this repo.** Clone [kevsimps/second-ringer](https://github.com/kevsimps/second-ringer) and copy `src/assets/ring.mp3` before building. |
| `package.json` | Project manifest and npm scripts |
| `tsconfig.json` | TypeScript compiler configuration |
| `vite.config.ts` | Vite build config — produces a single IIFE `dist/index.js` |
| `second-ringer_Layout.json` | WxCC Agent Desktop layout JSON with the widget pre-configured in `headerActions` |
| `env.template` | Documents `WIDGET_HOST_URL` — the base URL where `dist/` files will be hosted |

**What this code does NOT do:**
- No production error handling or retry logic
- No persistent storage of the selected audio device across page reloads
- No authentication — the widget relies entirely on Agent Desktop's existing WxCC session
- Not production-hardened; treat this as a proof-of-concept starting point

---

## Deployment Guide

### Step 1: Clone and install dependencies

```bash
git clone https://github.com/kevsimps/second-ringer.git
cd second-ringer
npm install
```

### Step 2: Verify the ring.mp3 asset is present

Confirm `src/assets/ring.mp3` exists in the cloned repo. This binary file is required by the build. If you are working from the Playbook `src/` folder instead of the upstream repo, copy the file:

```bash
cp /path/to/cloned/second-ringer/src/assets/ring.mp3 src/assets/ring.mp3
```

### Step 3: Build the widget

```bash
npm run build
```

This produces `dist/index.js` and `dist/ring.mp3`. The Vite config bundles everything into a single IIFE JS file.

### Step 4: Host the dist/ files

Upload the entire `dist/` directory to your static web host. Note the public base URL — you will need it in the next step.

**Example (GitHub Pages):** Push `dist/` to a `gh-pages` branch and enable GitHub Pages in repo settings. Your widget URL will be `https://<username>.github.io/<repo>/index.js`.

### Step 5: Update the desktop layout with your hosted URL

1. Open `src/second-ringer_Layout.json` in a text editor.
2. Search for the widget `src` field inside `headerActions`. It will contain a URL pointing to `https://kevsimps.github.io/second-ringer/dist/index.js`.
3. Replace it with your hosted URL, e.g.:

```json
"src": "https://your-host.example.com/second-ringer/index.js"
```

The `ring.mp3` asset is bundled and referenced automatically by Vite — no manual URL edits are required in the source code.

### Step 6: Create the desktop layout in Control Hub

1. Sign in to [Control Hub](https://admin.webex.com) as a WxCC administrator.
2. Navigate to **Contact Center** > **Agent Experience** > **Desktop Layouts**.
3. Click **New Layout**.
4. Upload `src/second-ringer_Layout.json` (with the URL updated in Step 5).
5. Give the layout a name (e.g. `Second Ringer Layout`) and save.

### Step 7: Assign the layout to an agent team

1. In Control Hub, navigate to **Contact Center** > **Teams**.
2. Select the team whose agents should have the Second Ringer widget.
3. Under **Desktop Layout**, select the layout created in Step 6.
4. Save.

### Step 8: Test the widget

1. Log in to Agent Desktop as an agent on the assigned team.
2. Click the **Second Ringer** button in the header bar — the widget panel opens.
3. Grant microphone permission when prompted (required for audio device enumeration).
4. Select your secondary audio output device (e.g. `Built-in Speakers`) from the dropdown.
5. Click the **Disabled** button to toggle it to **Enabled**.
6. Dismiss the panel by clicking **Second Ringer** again.
7. Make an inbound test call to the agent's queue — the ring tone should play on the selected secondary device.

---

## Known Limitations

- **webRTC telephony only:** The widget is designed for agents using the Webex webRTC softphone. Agents on physical desk phones or PSTN dial-in will not benefit — their desk phone already rings independently.
- **Browser compatibility:** `HTMLAudioElement.setSinkId()` is supported in Chromium-based browsers (Chrome, Edge) but is not supported in Firefox as of early 2026. Agents using Firefox will not be able to select a secondary audio output device.
- **Microphone permission required:** Browsers require an active `getUserMedia` audio permission to enumerate output devices (a browser security limitation). Agents must grant mic permission on first load; the widget calls `getUserMedia` automatically but does not handle denial gracefully beyond a console error.
- **No persistent device selection:** The selected output device resets to default each time the agent logs in or refreshes Agent Desktop. Agents must reselect their preferred device each session.
- **Hardcoded ring.mp3 URL:** The default build references the author's GitHub Pages URL for `ring.mp3`. Before building for production, update line 105 of `second-ringer.ts` to point to your hosted `ring.mp3` URL, then rebuild.
- **POC / demo quality:** The upstream repo includes a "Demo Only" watermark in the widget UI. This is intentional — the code is a proof of concept and has not been hardened for production use.
- **License:** This Playbook is adapted from the [second-ringer](https://github.com/kevsimps/second-ringer) project, which is released under the **MIT License**. See [LICENSE](../../LICENSE) for terms. Commercial use is permitted under MIT.
- **Webex disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
