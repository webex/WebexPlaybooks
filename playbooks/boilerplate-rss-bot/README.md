# Boilerplate RSS Bot + Webex Teams

This Playbook is adapted from the [Boilerplate RSS bot](https://github.com/WebexSamples/Boilerplate-RSS-bot) sample on GitHub.

## Use Case Overview

Teams and communities often learn about updates through **RSS or Atom feeds** (product blogs, status pages, security advisories). Manually checking feeds is easy to forget. This integration runs a small **Node.js** service that watches a feed on a timer and **posts each new item to a Webex space** as a rich HTML message, so members see updates where they already collaborate.

The target persona is a **Webex developer or administrator** who can create a bot, add it to a space, and deploy a long-running process (VM, container, or scheduled job). Expect roughly **1–2 hours** to register the bot, configure environment variables, and validate against a test feed.

## Architecture

The service loads a **bot access token** and validates it at startup by calling the Webex **People** API (`GET /v1/people/me`). It confirms the bot can access the target **room** (`GET /v1/rooms/{id}`). A **feed watcher** repeatedly fetches the configured RSS URL, tracks the newest entry in memory, and emits **new entries**. For each entry, **HTML** (title, link, description) is sent with **POST /v1/messages** using the room ID.

The **third-party** side of the integration is the **RSS/Atom publisher** (any HTTPS URL the runtime can reach). Authentication to Webex is **Bearer token** (bot token); the sample does not implement OAuth or Integration login flows.

For a sequence view of polling, API calls, and message delivery, see [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md).

## Prerequisites

- **Webex**
  - A Webex organization where you can create or use a **bot** at [developer.webex.com](https://developer.webex.com).
  - A **bot access token** with permission to post messages (Messaging scope for the bot).
  - A **Webex space** and its **room ID**; the bot must be **added as a member** of that space.

- **Feed**
  - A reachable **RSS 2.0 or Atom** URL (`RSS_FEED_URL`). For quick tests, a synthetic feed that publishes frequently helps verify behavior.

- **Runtime**
  - **Node.js 16+** and **npm** (or run the included **Dockerfile** in `src/`).

- **Network**
  - **Outbound HTTPS** to `webexapis.com` and to your RSS host. If your environment requires an HTTP proxy, the sample supports `GLOBAL_AGENT_HTTP_PROXY` (see `src/env.template`).

## Code Scaffold

The `src/` folder mirrors the upstream application layout:

- **`app.js`** — Entry point: reads environment, wires the feed watcher to `parserService`, validates bot and room at startup, handles graceful shutdown.
- **`lib/feedWatcher.js`** — Polls the feed on an interval; emits `new entries` when timestamps advance.
- **`lib/parseRss.js`** — Fetches and parses the feed using `feedparser` and HTTP request client.
- **`src/parserService.js`** — Formats RSS fields into HTML and calls the messaging layer.
- **`src/httpService.js`** — Axios client with rate limiting and retries for **Webex REST** calls (messages, people, rooms).
- **`src/logger.js`** — Winston logging (console; optional Syslog/Loki).
- **`package.json`** / **`package-lock.json`** — Dependencies; use `npm ci` for reproducible installs.
- **`Dockerfile`** — Alpine Node image; production-oriented `npm install --omit=dev` in the image build (for container deploys).
- **`docker-compose.yml`** — Example service using an **env file** (no secrets committed).
- **`env.template`** — Lists required and optional variables; copy to `.env` beside `app.js` (dotenv is loaded from `logger.js`).

The code demonstrates **documented Webex Messaging and membership checks**. It does **not** provide multi-feed routing, persistent deduplication across restarts, high availability, or feed HTML sanitization—treat it as a **learning scaffold**, not a production service.

## Deployment Guide

1. **Copy or use** the `src/` directory as your project root (keeping `app.js`, `lib/`, `src/`, and `package.json` together).

2. **Install dependencies:**
   ```bash
   cd src
   npm ci
   ```

3. **Create a Webex bot** at [developer.webex.com](https://developer.webex.com) and copy the **bot access token**.

4. **Create or open a Webex space**, add the bot to the space, and copy the space **Room ID** (space settings or API).

5. **Configure environment variables:**
   ```bash
   cp env.template .env
   ```
   Edit `.env` and set at least `TOKEN`, `FEED_ROOM_ID`, and `RSS_FEED_URL`. Optionally set `RSS_INTERVAL` (seconds between polls) and `CONSOLE_LEVEL=debug` for troubleshooting.

6. **Run the service:**
   ```bash
   npm start
   ```
   Confirm logs show the bot display name and room title, then **Startup Complete**. New feed items that appear **after** the first successful poll should generate messages (the initial poll seeds “last seen” and does not backfill history by default—aligns with upstream behavior).

7. **Optional — Docker:** From `src/`, with `.env` present:
   ```bash
   docker build -t rss-playbook-local .
   docker run --rm --env-file .env rss-playbook-local
   ```
   Or adjust `src/docker-compose.yml` to use `build: .` instead of the example public image if you want Compose to run your local build.

## Known Limitations

- **Webex rate limits:** The HTTP client retries on `429` and uses a modest request rate, but aggressive polling or many parallel deployments can still hit limits—**increase `RSS_INTERVAL`** if you see throttling.

- **Bot token expiry:** A **bot token** from the developer portal is long-lived but can be revoked; there is **no refresh flow** in this sample.

- **RSS side:** Feed format, TLS certificates, and availability depend on the publisher; **private feeds** requiring client certificates or custom headers are not covered.

- **Security / content:** Descriptions are interpolated into **HTML** messages; **malicious or malformed feed content** may affect clients. Review feeds you trust; consider sanitization before extending this sample.

- **State:** “Last seen” entry tracking is **in-memory**; restarting the process may **re-post** items if the feed’s ordering or timestamps do not advance as expected.

- **License:** The upstream sample is **MIT**; the playbook repo’s licensing for contributed material is described in the root [LICENSE](../../LICENSE). This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
