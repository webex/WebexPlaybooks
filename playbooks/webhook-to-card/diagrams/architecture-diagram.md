# Architecture — Incoming Webhook to Webex Messaging Adaptive Card

External systems can signal events with HTTP POSTs. This sample turns a structured JSON payload into a **Webex message** that includes an **Adaptive Card** attachment.

```mermaid
sequenceDiagram
  participant Ext as ExternalSystem
  participant App as FlaskWebhookApp
  participant Api as WebexMessagesAPI
  participant Space as WebexSpace
  Ext->>App: POST /webhook JSON payload
  App->>App: Validate body build AdaptiveCard
  App->>Api: POST /v1/messages Bearer bot token
  Api->>Space: Message with card attachment
```

Authentication: the **Webex bot token** is stored server-side (environment only). Callers of `/webhook` are **not** authenticated in this sample.
