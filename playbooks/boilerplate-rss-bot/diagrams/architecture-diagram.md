# Architecture — RSS to Webex space

This diagram shows how the sample polls a syndicated feed and posts new items into **Webex Teams** using a **bot token** and the **Webex REST API**.

```mermaid
sequenceDiagram
  participant RSS as RSS or Atom feed
  participant Bot as Node.js RSS watcher
  participant API as Webex API (webexapis.com)
  participant Space as Webex space (Teams)

  Bot->>RSS: GET feed URL (interval poll)
  RSS-->>Bot: Feed XML / new entries
  Note over Bot: Compare to last seen entry (in memory)
  Bot->>API: GET /v1/people/me (Bearer TOKEN)
  API-->>Bot: Bot identity (startup check)
  Bot->>API: GET /v1/rooms/{FEED_ROOM_ID}
  API-->>Bot: Room metadata (startup check)
  loop On new entries
    Bot->>API: POST /v1/messages (roomId, html)
    API-->>Bot: 201 Created
    API->>Space: Message appears for members
  end
```

Authentication uses a **static bot access token** (`TOKEN`) on each HTTPS request to `webexapis.com`. The RSS source is typically unauthenticated public HTTP(S); private feeds may need headers or allowlisting (not shown in the boilerplate).
