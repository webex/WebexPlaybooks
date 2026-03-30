# Architecture Diagram — Multi-User Webex Embedded App Lobby

## Component Overview

The integration consists of three layers:

- **Webex Meeting** — Hosts the Embedded App in the meeting sidebar via the Embedded Apps framework
- **React Frontend (Vite)** — The Embedded App UI; initializes the Webex Embedded Apps SDK and manages real-time lobby state via Socket.IO
- **Flask + Flask-SocketIO Backend** — REST API for lobby lifecycle and WebSocket server for real-time participant events

## Sequence Diagram: Lobby Initialization

```mermaid
sequenceDiagram
    participant Webex as Webex Meeting
    participant Frontend as React Frontend<br/>(Embedded App)
    participant SDK as @webex/embedded-app-sdk
    participant Backend as Flask + SocketIO Backend

    Webex->>Frontend: Load Embedded App in meeting sidebar (HTTPS)
    Frontend->>SDK: new Application()
    Frontend->>SDK: app.onReady()
    SDK-->>Webex: SDK handshake
    Webex-->>SDK: Meeting context + user identity
    SDK-->>Frontend: meeting.title, user.displayName, theme

    Frontend->>Backend: POST /api/lobby { host_id, host_display_name, lobby_name }
    Backend-->>Frontend: { lobby_id, lobby_url, lobby_name }

    Frontend->>SDK: app.setShareUrl(lobby_url) [optional share]
    SDK-->>Webex: Share lobby deep-link to all participants
```

## Sequence Diagram: Participant Joins and Interacts

```mermaid
sequenceDiagram
    participant ParticipantA as Participant A<br/>(Embedded App)
    participant ParticipantB as Participant B<br/>(Embedded App)
    participant Backend as Flask + SocketIO Backend

    ParticipantA->>Backend: Socket.IO connect
    ParticipantA->>Backend: emit("lobby:join", { lobby_id, user: { id, display_name } })
    Backend->>Backend: Add participant to lobby room
    Backend-->>ParticipantA: emit("lobby:update", { participants, lobby_name, host })
    Backend-->>ParticipantB: emit("lobby:update", { participants, lobby_name, host })

    ParticipantB->>Backend: emit("lobby:join", { lobby_id, user: { id, display_name } })
    Backend-->>ParticipantA: emit("lobby:update", [...updated participants...])
    Backend-->>ParticipantB: emit("lobby:update", [...updated participants...])

    ParticipantA->>Backend: emit("lobby:toggle_ready", { lobby_id, user_id })
    Backend-->>ParticipantA: emit("lobby:update", [...ready state updated...])
    Backend-->>ParticipantB: emit("lobby:update", [...ready state updated...])

    ParticipantA->>Backend: emit("lobby:leave", { lobby_id, user_id })
    Backend->>Backend: Remove participant from room
    Backend-->>ParticipantB: emit("lobby:update", [...participant removed...])
```

## Data Flow Summary

```mermaid
flowchart TD
    WM[Webex Meeting\nSidebar Frame] -->|Load Embedded App over HTTPS| FE[React Frontend\nVite SPA]
    FE -->|SDK: onReady, getMeeting, user state| WS[Webex Embedded\nApps SDK]
    WS -->|meeting.title, user.displayName, theme| FE
    FE -->|setShareUrl / clearShareUrl| WS
    WS -->|Deep-link broadcast to\nall meeting participants| WM
    FE -->|REST: POST/GET /api/lobby| BE[Flask Backend\nport 5000]
    FE <-->|Socket.IO: lobby events\njoin / leave / ready / rename| BE
    BE -->|In-memory lobby store\ndictionary| DB[(Lobby State\nIn-Memory)]
    NGINX[Nginx Reverse Proxy\nHTTPS :443] -->|Proxy /api/| BE
    NGINX -->|Proxy /socket.io/| BE
    NGINX -->|Serve static files| DIST[Frontend dist/]
    WM -->|HTTPS request| NGINX
```
