# Architecture diagram

Sequence overview: Finesse task creation, Webex guest token and meeting link,
DocuSign envelope and recipient view on the Desk via xAPI, webhook back to the
app, and Socket.IO updates to the agent UI.

```mermaid
sequenceDiagram
  participant Agent as AgentBrowser
  participant App as NodeExpressApp
  participant Wx as WebexREST_xAPI
  participant Fin as FinesseTaskRouting
  participant Desk as WebexDesk
  participant DS as DocuSignAPI
  participant WH as DocuSignWebhook

  Agent->>App: POST /task-routing deviceSip deviceId
  App->>App: OAuth refresh access token
  App->>Wx: POST guests/token
  Wx-->>App: guest access token
  App->>Fin: POST XML Task video variables
  Fin-->>App: task created
  App-->>Agent: meeting link query params

  Agent->>App: POST /send-document customer email or name
  App->>DS: JWT create envelope plus recipient view
  DS-->>App: signing URL
  App->>Wx: xAPI UserInterface.WebView.Display Desk
  Wx->>Desk: open signing URL fullscreen
  App->>Agent: Socket.IO signing-url optional

  DS->>WH: envelope status XML
  WH->>App: POST /docusign-webhook
  App->>Agent: Socket.IO envelope-status
  App->>Wx: xAPI UserInterface.WebView.Clear
  Wx->>Desk: close webview
```
