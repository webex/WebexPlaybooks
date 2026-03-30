# Multi-User Webex Embedded App Lobby

This Playbook is adapted from the [ea-lobby-app](https://github.com/WebexSamples/ea-lobby-app) sample on GitHub, built by the Webex Developer Relations Team at Cisco.

## Use Case Overview

Meeting hosts and participants often need a structured "gathering space" before the main session begins — a place where people can signal readiness, see who has joined, and coordinate before diving into the agenda. Without this, hosts resort to chat messages or verbal roll-calls to confirm attendance.

This Playbook shows how to build a **real-time multi-user lobby** as a Webex Embedded App that runs inside a Webex Meeting. Participants can create or join a named lobby directly from the Webex Meeting sidebar, mark themselves as Ready, update their display names, and share the lobby URL with other meeting attendees. The meeting title and the current user's display name are automatically pulled from Webex, making the experience seamless.

**Target persona:** Webex developer or IT builder who wants to add a structured pre-meeting coordination experience to Webex Meetings for their team or customers.

**Estimated implementation time:** 4–6 hours (local dev and Embedded App registration), plus time for production hosting setup.

## Architecture

The integration is a full-stack Webex Embedded App with three layers:

1. **React frontend (Vite)** — A single-page application loaded inside the Webex Meeting sidebar via the Embedded Apps framework. On load, it initializes the `@webex/embedded-app-sdk` to retrieve the meeting title and the current user's display name from Webex. It connects to the Flask backend via Socket.IO for real-time lobby state updates.

2. **Flask + Flask-SocketIO backend** — Manages lobby state in memory (or can be extended to a persistent store). Exposes REST endpoints to create and fetch lobbies, and WebSocket event handlers for join, leave, ready-toggle, and display-name-update events. Broadcasts lobby state changes to all participants in the same Socket.IO room.

3. **Nginx reverse proxy (production)** — Terminates TLS, serves the built React static files, and proxies `/api/` and `/socket.io/` paths to the Flask backend. Required because Webex Embedded Apps must be served over HTTPS.

Data flow:
- When the Embedded App loads in Webex, `@webex/embedded-app-sdk` calls `app.onReady()` and fetches meeting and user context.
- The frontend POST `/api/lobby` to create a lobby (or navigates to an existing lobby URL).
- Socket.IO events carry lobby state changes bidirectionally between each client and the backend.
- The host can call `app.setShareUrl()` to deep-link the lobby URL to all participants in the Webex Meeting.

See the architecture diagram in [/diagrams/architecture-diagram.md](diagrams/architecture-diagram.md).

## Prerequisites

### Webex Requirements
- A Webex account (free or paid) with access to Webex Meetings
- Webex Embedded App registration on the [Webex Developer Portal](https://developer.webex.com/my-apps) — you will need to register an Embedded App and provide the HTTPS URL where your app is hosted
- The Embedded App must be served over HTTPS (self-signed certificates work locally with mkcert + Nginx; use a real certificate for production)

### Development Environment
- **Python 3.8+** and `pip`
- **Node.js 18+** and `npm`
- **Nginx** (for production/HTTPS serving) — Homebrew on macOS: `brew install nginx`
- **mkcert** (for local HTTPS): `brew install mkcert` on macOS, or equivalent
- **ngrok** (optional, for exposing localhost to Webex during development): [ngrok.com](https://ngrok.com)

### Network Requirements
- The host serving the Embedded App must be reachable over HTTPS from the internet (or your corporate network) so Webex can load it in the Meeting sidebar
- WebSocket connections (Socket.IO) must be allowed through your firewall/proxy

## Code Scaffold

The `/src/` directory mirrors the original repo structure with a `backend/` Python package and a `frontend/` React application:

```
src/
├── backend/
│   ├── app.py              # Flask + SocketIO application factory
│   ├── config.py           # Environment variable configuration (FRONTEND_URL)
│   ├── constants.py        # Socket.IO event name constants
│   ├── requirements.txt    # Python dependencies
│   ├── routes/
│   │   └── lobby.py        # REST API: POST /api/lobby, GET /api/lobby/<id>
│   ├── sockets/
│   │   └── lobby.py        # Socket.IO handlers: join, leave, ready, display name
│   └── utils/
│       └── helpers.py      # Utility functions
├── frontend/
│   ├── index.html
│   ├── package.json        # Node.js dependencies (React, Vite, @webex/embedded-app-sdk)
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx          # Root component with React Router
│       ├── main.jsx
│       ├── constants.js     # Frontend constants (API URL, Socket URL)
│       ├── components/      # UI components (LandingPage, Lobby, CreateLobby, etc.)
│       ├── hooks/
│       │   ├── useWebex.jsx # Webex Embedded App SDK initialization and state
│       │   └── useLobby.jsx # Socket.IO lobby state management hook
│       └── utils/
│           └── api.js       # Axios API client
└── env.template             # Required environment variables
```

**What this code demonstrates:**
- Initializing the `@webex/embedded-app-sdk` inside a React app to retrieve meeting context and user identity
- Using `app.setShareUrl()` / `app.clearShareUrl()` to share a lobby deep-link with all Webex Meeting participants
- Listening to `application:themeChanged` and `application:shareStateChanged` events from the Webex SDK
- A real-time multi-user state machine using Flask-SocketIO rooms
- Running gracefully both inside and outside of Webex (5-second timeout fallback for standalone testing)

**What this code does NOT do:**
- Persist lobby state across server restarts (in-memory store only)
- Implement authentication or authorization for lobby access
- Handle horizontal scaling (multiple backend instances require a shared state store like Redis)
- Handle production hardening, rate limiting, or monitoring

All secrets and configuration must be set via environment variables (see `env.template`).

## Deployment Guide

### Local Development (HTTP, for testing outside Webex)

1. **Clone or copy the `src/` directory** to your local machine.

2. **Set up the Python virtual environment:**
   ```bash
   cd src/backend
   python -m venv venv
   source venv/bin/activate   # macOS/Linux
   # venv\Scripts\activate    # Windows
   pip install -r requirements.txt
   ```

3. **Create a `.env` file in the project root** by copying `src/env.template`:
   ```bash
   cp src/env.template .env
   ```
   Edit `.env` and set:
   ```
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start the Flask backend:**
   ```bash
   # From the project root (not from inside src/backend/)
   python -m backend.app
   ```
   The backend starts on `http://localhost:5000`.

5. **Install frontend dependencies:**
   ```bash
   cd src/frontend
   npm install
   ```

6. **Create the frontend environment file:**
   ```bash
   cp .env.development.example .env.development.local
   ```
   Edit `.env.development.local`:
   ```
   VITE_API_URL=http://localhost:5000
   VITE_SOCKET_URL=http://localhost:5000
   ```

7. **Start the Vite dev server:**
   ```bash
   npm run dev
   ```
   The frontend is available at `http://localhost:5173`.

8. **Test the lobby** by opening `http://localhost:5173` in two browser tabs. Note: the Webex SDK will time out after 5 seconds when running outside Webex and fall back to "Unknown User" / "No Active Meeting" — this is expected behavior.

### HTTPS Setup for Webex Embedded App (Required to run inside Webex)

Webex Embedded Apps require HTTPS. Use Nginx + mkcert locally, or deploy to a cloud provider with a valid TLS certificate.

9. **Install mkcert and create a local certificate:**
   ```bash
   brew install mkcert        # macOS
   mkcert -install
   mkdir certs
   mkcert -cert-file certs/lobby.local.pem -key-file certs/lobby.local-key.pem lobby.local
   ```

10. **Add `lobby.local` to your hosts file:**
    ```bash
    sudo nano /etc/hosts
    ```
    Add the line:
    ```
    127.0.0.1    lobby.local
    ```

11. **Build the React frontend:**
    ```bash
    cd src/frontend
    npm run build
    ```

12. **Configure Nginx** by copying the example config from `lobby.local.conf.example` (in the original repo root) and adjusting paths to your `certs/` directory and the frontend `dist/` folder. Reload Nginx:
    ```bash
    nginx -t && brew services restart nginx
    ```

13. **Expose your local HTTPS server with ngrok** (optional, for Webex to reach your local machine):
    ```bash
    ngrok http 443
    ```
    Note the public `https://*.ngrok.io` URL — you will use this in the Webex Developer Portal.

14. **Register the Embedded App in the Webex Developer Portal:**
    - Go to [developer.webex.com/my-apps](https://developer.webex.com/my-apps) and click **Create a New App → Embedded App**.
    - Enter your app name, description, and the HTTPS URL where your app is served (e.g. `https://abc123.ngrok.io` or your production URL).
    - Save and note the **App ID**.
    <!-- TODO: verify the exact Embedded App registration fields against the current Webex Developer Portal UI -->

15. **Add the Embedded App to a Webex Meeting** by starting or joining a Webex Meeting, opening the Apps panel, and searching for your registered app by name. The lobby will load in the sidebar and automatically pull the meeting title and your display name from Webex.

### Production Deployment

16. **Choose a hosting provider** (e.g. AWS EC2/ECS, Heroku, Render, Fly.io) that supports both HTTPS (port 443) and WebSocket connections.

17. **Set the `FRONTEND_URL` environment variable** on your server to the public HTTPS URL of your deployed frontend (e.g. `https://yourdomain.com`).

18. **Set the frontend production environment** — copy `frontend/.env.production.example` to `.env.production` and set `VITE_API_URL` and `VITE_SOCKET_URL` to your backend's public HTTPS URL.

19. **Build the frontend** for production:
    ```bash
    cd src/frontend
    npm run build
    ```

20. **Deploy the backend** using a production WSGI server. The `eventlet` async mode used by Flask-SocketIO works well with gunicorn + eventlet workers:
    ```bash
    pip install gunicorn eventlet
    gunicorn --worker-class eventlet -w 1 backend.app:app
    ```
    <!-- TODO: verify production worker configuration with your target hosting environment -->

21. **Update your Embedded App registration** in the Webex Developer Portal with your production HTTPS URL.

## Known Limitations

- **In-memory lobby state:** All lobby data is stored in a Python dictionary in the backend process. Restarting the server clears all active lobbies. For production use, replace with a Redis or database-backed store.
- **Single backend instance:** The Socket.IO room model does not support multiple backend instances without a message broker (e.g., Redis pub/sub). Horizontal scaling requires additional configuration.
- **No authentication:** Any user who knows a lobby ID can join it. There is no token validation between the Webex SDK identity and the lobby participant record. Consider adding a server-side token check using the Webex APIs if you need access control.
- **Webex Embedded Apps SDK version:** This sample uses `@webex/embedded-app-sdk` v2.1.x. Check the [Webex Developer Portal changelog](https://developer.webex.com/docs/embedded-apps) for SDK updates and any breaking changes.
- **HTTPS requirement:** Webex Embedded Apps cannot be loaded from HTTP origins. A valid TLS certificate and HTTPS-capable hosting are required for all non-development use.
- **ngrok sessions:** Free ngrok sessions expire and generate new URLs. You must update your Webex Embedded App registration each time the URL changes.
- **License:** This Playbook is adapted from Cisco sample code distributed under the [Cisco Sample Code License v1.1](../../LICENSE). The license permits use only in conjunction with Cisco products and services and expressly prohibits standalone commercial redistribution. Review the full license before deploying in a production environment.
- This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
