# Architecture Diagram — Second Ringer Header Widget for Webex Contact Center

The Second Ringer is a client-side **Header Widget** embedded in the Webex Contact Center Agent Desktop. There is no backend server — all logic runs in the agent's browser using the `@wxcc-desktop/sdk` and the browser's Web Audio API.

```mermaid
sequenceDiagram
    participant Admin as "WxCC Admin (Control Hub)"
    participant Desktop as "Webex Agent Desktop"
    participant SDK as "@wxcc-desktop/sdk (AGENTX_SERVICE)"
    participant Widget as "second-ringer Header Widget"
    participant AudioAPI as "Web Audio API (browser)"
    participant Host as "Static Web Host (dist/)"

    Admin->>Desktop: Assign desktop layout with widget in headerActions
    Desktop->>Host: Load index.js (widget bundle)
    Host-->>Desktop: Return IIFE bundle
    Desktop->>Widget: connectedCallback() — widget mounts in header
    Widget->>AudioAPI: getUserMedia({audio:true}) — request mic permission
    AudioAPI-->>Widget: Permission granted
    Widget->>AudioAPI: enumerateDevices() — list audio outputs
    AudioAPI-->>Widget: audiooutput device list
    Widget->>SDK: Register listeners on aqm.contact events

    Note over Widget: Agent selects secondary device + clicks Enabled

    SDK->>Widget: eAgentOfferContact or eAgentOfferConsult
    Widget->>AudioAPI: setSinkId(selectedDeviceId)
    Widget->>AudioAPI: play() ring.mp3 on secondary device
    Note over AudioAPI: Ringtone plays on e.g. laptop speaker

    SDK->>Widget: eAgentContactAssigned / eAgentContactEnded / eAgentOfferContactRona / eAgentConsulting
    Widget->>AudioAPI: load() — stop playback
    Note over AudioAPI: Ringtone stops
```

## Component Notes

| Component | Role |
|-----------|------|
| **WxCC Admin (Control Hub)** | Creates the Agent Desktop layout JSON with the widget registered in `headerActions`; assigns the layout to an agent team |
| **Webex Agent Desktop** | Loads and renders the widget in the persistent header bar at agent login |
| **Static Web Host** | Serves `dist/index.js` and `dist/ring.mp3` over HTTPS; no server-side logic required |
| **@wxcc-desktop/sdk** | Provides `window.AGENTX_SERVICE.aqm.contact` event bus; widget subscribes to contact lifecycle events |
| **second-ringer Header Widget** | Lit web component (`<second-ringer>`); handles device selection UI, event subscriptions, and ringer control |
| **Web Audio API** | Browser-native API used to enumerate audio output devices (`enumerateDevices`) and route audio to a selected device (`setSinkId`) |

## Header Widget Placement

The `<second-ringer>` element is declared in the `headerActions` array of the desktop layout JSON. This placement makes it persistently visible in the Agent Desktop top navigation bar — the correct pattern for always-on utility controls in WxCC.

```json
"headerActions": [
  {
    "id": "second-ringer",
    "type": "widget",
    "attributes": {
      "src": "https://your-host.example.com/second-ringer/index.js"
    }
  }
]
```
