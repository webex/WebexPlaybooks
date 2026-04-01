# Architecture Diagram — WxCC Queue Scroll Widget

This diagram shows how the `<queue-scroll>` web component integrates with the Webex Contact Center Agent Desktop and the WxCC platform APIs.

```mermaid
sequenceDiagram
    participant Desktop as "Agent Desktop (advancedHeader)"
    participant Widget as "<queue-scroll> Web Component"
    participant QueueAPI as "WxCC Contact Service Queue API"
    participant SearchAPI as "WxCC Search API (GraphQL)"

    Desktop->>Widget: Mount component, inject orgId / agentId / teamId / token ($STORE.*)

    Note over Widget: connectedCallback() fires on mount

    Widget->>QueueAPI: GET /organization/{orgId}/v2/contact-service-queue/by-user-id/{agentId}/agent-based-queues
    QueueAPI-->>Widget: List of agent-based queue IDs

    Widget->>QueueAPI: GET /organization/{orgId}/v2/contact-service-queue/by-user-id/{agentId}/skill-based-queues
    QueueAPI-->>Widget: List of skill-based queue IDs

    Widget->>QueueAPI: GET /organization/{orgId}/team/{teamId}/incoming-references
    QueueAPI-->>Widget: List of team-linked queue IDs

    Note over Widget: Builds queueFilter array from all eligible queue IDs

    Widget->>SearchAPI: POST /search (GraphQL — task aggregations for active parked tasks)
    SearchAPI-->>Widget: Per-queue contact count + oldest createdTime

    Note over Widget: Renders scrolling ticker in Agent Desktop header

    loop Every 30 seconds
        Widget->>SearchAPI: POST /search (refresh queue stats)
        SearchAPI-->>Widget: Updated aggregations
    end

    loop Every 1 second
        Widget->>Widget: updateTemplate() — re-render <ul> marquee with latest queueData
    end
```

## Component Flow Notes

- **Authentication:** The Agent Desktop injects the agent's live access token via `$STORE.auth.accessToken`. No OAuth flow is required inside the widget itself — token lifecycle is managed entirely by the Agent Desktop.
- **Queue discovery:** Three parallel REST calls build the list of queues the agent is eligible for. This runs once on mount and the resulting `queueFilter` is reused for all subsequent `getStats()` calls.
- **Stats polling:** The Search API GraphQL query filters for tasks with `isActive: true` and `status: parked`, then aggregates `count(id)` (contacts in queue) and `min(createdTime)` (oldest wait) grouped by `lastQueue`.
- **Rendering:** The marquee animation is CSS-driven (`@keyframes scroll`). The list of `<li>` items is duplicated in the DOM to create a seamless loop. Animation duration scales with the number of queues (`queueStats.length * 10` seconds).
- **Standalone test mode:** For local testing outside the Agent Desktop, the four attributes are set directly on the `<queue-scroll>` tag in `index.html`.
