# Webex JS SDK Multistream Demo

This Playbook is adapted from the [Webex JS SDK Multistream Demo](https://github.com/WebexSamples/webex-js-sdk-multistream-demo) sample on GitHub. The sample was featured in the webinar *Webex Developer: Unleashing the Power of Multistream: Expert Techniques and Insights* — see [Webex developer webinars](https://developer.webex.com/webinars).

## Use Case Overview

You want a **working browser reference** for **Webex Meetings multistream** alongside an **embedded Webex space (Space Widget)** so you can see how the **Webex JS SDK** and widget scripts fit together in a **React** app. This matters when you are prototyping command-center or collaboration layouts where meeting video and space messaging appear in one page.

**Target persona:** Front-end or full-stack developers comfortable with **Node.js**, **Create React App**, and **Webex developer tokens**, who need a starting point—not a production-hardened client.

**Estimated implementation time:** 2–4 hours (obtain token and IDs, configure `.env.local`, install dependencies, first successful widget load and meeting join).

The materials here are **sample scaffolding** for learning, not a production integration.

## Architecture

A **Create React App** loads the **Webex JS SDK** and **Space Widget** from **CDN scripts** in [`public/index.html`](src/public/index.html) (relative to the project folder that contains `package.json`). The app reads **`REACT_APP_*` environment variables** (backed by `.env.local`) and passes the access token into **`Webex.init`**, registers **meetings**, **creates** a meeting from a **SIP URI**, and **joins with multistream** enabled. Separately, **`webex.widget`** mounts the **Space Widget** on the `space-widget` DOM node for the configured **space ID**.

See the Mermaid diagram in [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md) for the flow.

**Authentication:** The sample uses a **developer access token** supplied as an environment variable. For production, use an appropriate **OAuth** or **guest-issuer** flow and **server-side** token handling instead of baking secrets into a public bundle.

## Prerequisites

- **Node.js 18+** and **npm** (or a compatible package manager; this repo uses `npm ci` / `npm start` as documented).
- A **Webex account** and org where you can create or use **meetings** and **spaces**.
- A **Webex access token** with scopes sufficient for **Meetings** and **messaging/widget** usage you intend to exercise (see current Webex documentation for the JS SDK and widgets).
- A **SIP URI or meeting locator** acceptable to **`webex.meetings.create()`** for your scenario (align with [Webex JS SDK meetings](https://developer.webex.com/docs/sdks/browser) documentation).
- A **space ID** for the embedded Space Widget.
- A **modern Chromium-based browser** with permission to use **camera and microphone** when you join with media.
- Network access to **`unpkg.com`**, **`code.s4d.io`**, and **Webex cloud** endpoints used by the SDK and widget (corporate proxies may require allowlisting).

## Code Scaffold

Under **`playbooks/js-sdk-multistream-demo/src/`** (the runnable project root next to `package.json`):

| Path | Purpose |
|------|--------|
| `package.json` / `package-lock.json` | Create React App dependencies and scripts (`npm start`, `npm run build`). |
| `public/index.html` | CRA shell; loads **Webex UMD** and **Space Widget** script bundles. |
| `src/App.js` | UI layout, lobby/group demo, **Space Widget** container (`#space-widget`), **Join Meeting** control. |
| `src/multistream.js` | **`Webex.init`**, **`meetings.register`**, **`create(SIP_URL)`**, remote media layout handlers, **`joinWithMedia`** with **`enableMultistream`**. |
| `src/utils/helpers.js` | **`loadSpaceWidget`** using **`window.webex.widget`**. |
| `src/utils/constant.js` | Exports **`ACCESS_TOKEN`**, **`SPACE_ID`**, **`SIP_URL`** from **`REACT_APP_*`** env vars. |
| `env.template` | Lists required **`REACT_APP_*`** variables; copy to **`.env.local`** in this same project folder. |

This code **does not** implement OAuth, refresh tokens, enterprise security hardening, or multi-tenant isolation. It **does** demonstrate **documented browser SDK** patterns and **widget** embedding aligned with the upstream sample.

## Deployment Guide

1. **Obtain** a Webex **access token**, a **space ID**, and a **SIP URI** (or equivalent meeting string) suitable for **`meetings.create`**, following Webex documentation for your org.
2. **Open** this Playbook and go to **`playbooks/js-sdk-multistream-demo/src/`**.
3. **Copy** `env.template` to **`.env.local`** in that same directory (next to `package.json`).
4. **Set** in `.env.local`:
   - `REACT_APP_WEBEX_ACCESS_TOKEN` — your token  
   - `REACT_APP_WEBEX_SPACE_ID` — target space  
   - `REACT_APP_WEBEX_SIP_URL` — meeting locator for `create()`  
5. **Install** dependencies: `npm ci`
6. **Start** the dev server: `npm start`  
   The app should open on **`http://localhost:3000`** (or the port CRA prints).
7. **Allow** camera and microphone when prompted; confirm the **Space Widget** loads in the Chat panel and that **Join Meeting** proceeds without console errors from missing globals (`Webex` / `webex`).
8. **Optional — production build:** Run `npm run build` and serve the `build/` folder from a static host; remember that **`REACT_APP_*` values are still compiled into the bundle**—do not use long-lived secrets.

## Known Limitations

- **Client-exposed tokens:** Create React App inlines **`REACT_APP_*`** into the **browser bundle**. Treat this as **lab or demo only**; use **OAuth**, **short-lived tokens**, and **server-side** issuance for real products.
- **Token expiry:** Personal or integration tokens **expire**; this sample does not refresh them.
- **CDN and versions:** The SDK and widget are loaded from **third-party URLs** pinned in `public/index.html`. **Upgrade paths** require testing; outages or changes on those hosts affect the demo.
- **Browser and feature support:** **Multistream** and media behavior depend on **SDK version**, **org policy**, and **browser** capabilities; not all environments match the webinar demo.
- **Rate limits:** Webex **API rate limits** apply to SDK-driven traffic.
- **License:** The original sample is under the **Cisco Sample Code License**; redistribution and use are subject to that license. This Playbook repository’s overall terms are described in the playbook repo [LICENSE](../../LICENSE).
- **Disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
