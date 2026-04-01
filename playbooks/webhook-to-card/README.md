# Webhook to Adaptive Card + Webex Teams

This Playbook is adapted from the [Webhook to Adaptive Card](https://github.com/WebexSamples/webhook-to-card) sample on GitHub.

## Use Case Overview

Operations and platform teams often want **alerts and structured updates** in Webex spaces without building a full custom integration UI. A small **HTTP webhook** receiver can accept JSON from monitoring systems, CI/CD, or internal tools and **post a rich Adaptive Card** so members see facts, images, and action buttons in the client.

This sample uses a **rocket launch** themed payload as a teaching example; the same pattern applies to any JSON you map into card elements. The target persona is a **Webex developer** who can create a bot, add it to a space, and run Python locally or in a container. Expect roughly **1–2 hours** to configure tokens, expose the webhook URL (for example with a tunnel), and verify an end-to-end post.

## Architecture

An **external system** sends `POST /webhook` with JSON. The **Flask** app validates the body, builds an **Adaptive Card** object in memory, and calls the Webex **Messages** API (`POST https://webexapis.com/v1/messages`) with a **bot access token** and **room ID**. Webex delivers the message (including the card attachment) to the **space** where the bot is a member.

Authentication to Webex is **Bearer token** (bot). The inbound webhook endpoint in this sample does **not** verify caller identity; protect it in production (network rules, shared secrets, signatures).

For a sequence view of the flow, see [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md). Upstream file layout and license notes are summarized in [docs/upstream-overview.md](docs/upstream-overview.md).

## Prerequisites

- **Webex**
  - Ability to create or use a **bot** at [developer.webex.com](https://developer.webex.com).
  - A **bot access token** with permission to post messages in the target space.
  - A **Webex space** and its **room ID**; the bot must be **added as a member**.

- **Runtime**
  - **Python 3.9+** recommended (3.6+ may work with the pinned dependencies; prefer a supported Python release).
  - `pip` for installing `src/requirements.txt`.

- **Network**
  - **Outbound HTTPS** from the app host to `webexapis.com`.
  - For external systems to call your app, a **reachable URL** (public host, reverse proxy, or tunnel such as ngrok). Configure your webhook sender to POST to `https://<your-host>/webhook`.

## Code Scaffold

Under `src/`:

- **`app.py`** — Flask app: `POST /webhook` builds the card and posts to Webex; `GET /status` returns a minimal HTML line. Uses `WEBEX_BOT_TOKEN`, `WEBEX_ROOM_ID`, and optional `PORT`. Request bodies are capped at 256 KiB.
- **`requirements.txt`** — Pinned dependencies (Flask, requests, python-dotenv, etc.).
- **`templates/status.html`** — Static text for the status route.
- **`webhook-payload.json`** — Example JSON for local `curl` tests.
- **`adaptive_card.json`** — Reference card JSON (the live path builds the card in code).
- **`env.template`** — Required environment variables; copy to `.env` beside `app.py`.

The code demonstrates **documented Webex Messaging with Adaptive Cards**. It does **not** provide inbound webhook authentication, URL allowlisting for images/links, high availability, or comprehensive error handling—treat it as a **learning scaffold**, not a production service.

## Deployment Guide

1. **Open a terminal** at the Playbook’s `src` directory:
   ```bash
   cd playbooks/webhook-to-card/src
   ```

2. **Create and activate a virtual environment** (recommended):
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create a Webex bot** at [developer.webex.com](https://developer.webex.com) and copy the **bot access token**.

5. **Create or open a Webex space**, add the bot, and copy the space **Room ID**.

6. **Configure environment variables:**
   ```bash
   cp env.template .env
   ```
   Edit `.env` and set `WEBEX_BOT_TOKEN` and `WEBEX_ROOM_ID`. Optionally set `PORT` (default `5000`).

7. **Run the application:**
   ```bash
   python app.py
   ```

8. **Verify the service** (from another terminal):
   ```bash
   curl -s http://127.0.0.1:5000/status
   ```

9. **Send a test webhook** (adjust host/port if needed). The bundled `webhook-payload.json` uses **HTTPS URLs Webex can fetch** for the card image and open-link action. If `mission_patch` points at a host that does not return a real image (for example `https://example.com/...`), the Messages API responds with **Unable to retrieve content** because Webex retrieves image URLs when creating the message.
   ```bash
   curl -s -X POST -H "Content-Type: application/json" \
     -d @webhook-payload.json \
     http://127.0.0.1:5000/webhook
   ```
   Expect `{"success":true}` when the bot token and room ID are valid. A JSON body with `"success":false` and a nested `Unable to retrieve content` message usually means an image URL in the payload is missing, blocked, or not a valid image—fix `mission_patch` and retry.

10. **Confirm in Webex** that the space received a message with the Adaptive Card.

11. **Optional — expose to the internet:** Run a TLS-terminated reverse proxy or tunnel, then register the public `https://.../webhook` URL with the system that sends webhooks.

## Known Limitations

- **Inbound webhook security:** The sample does **not** authenticate or sign webhook requests. Anyone who can reach `/webhook` can trigger a post to your configured space. Use network restrictions, tokens, or signatures before production use.

- **Payload shape:** The handler expects the **rocket launch** field names shown in `webhook-payload.json`. Extending to other events requires code changes or additional routes.

- **Images and links:** `mission_patch` and `video_stream` are passed through to the card. **Webex fetches `mission_patch` server-side** when posting; it must be **HTTPS** and return a **reachable, valid image** or the API returns errors such as **Unable to retrieve content**. Untrusted URLs may affect clients; validate or allowlist in production.

- **Bot token:** Treat the bot token as a secret; rotate it if exposed. The sample does not implement OAuth or Integration refresh flows.

- **Dependencies:** Pins match the upstream sample; upgrade paths and compatibility testing are your responsibility.

- **License:** The upstream sample is under the **Cisco Sample Code License**. This repository’s licensing for contributed material is described in the root [LICENSE](../../LICENSE). This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
