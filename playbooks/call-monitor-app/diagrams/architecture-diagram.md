# Architecture — Call Monitor Embedded App

This playbook ships a React app that runs inside the **Webex Embedded App Sidebar** during **Webex Calling** sessions. The host Webex client loads your HTTPS (or local dev) URL, injects the [Embedded App SDK](https://developer.webex.com/docs/embedded-apps-framework-sidebar-api-quick-start), and delivers call lifecycle events to your code. Customer records in the sample are **generated locally** (Faker); a production app would swap this for REST lookups to CRM or line-of-business systems.

```mermaid
sequenceDiagram
  participant User as Agent / User
  participant Webex as Webex client (Teams / Webex app)
  participant Host as Embedded App host
  participant App as Call Monitor (React + SDK)
  participant Mock as Mock CRM (Faker in browser)

  User->>Webex: Place / receive Webex call
  Webex->>Host: Open sidebar app (Start URL)
  Host->>App: Load page + inject webex.Application
  App->>App: app.onReady() / app.listen()
  Webex->>Host: Call state changes (Sidebar API)
  Host->>App: sidebar:callStateChanged payload
  App->>Mock: generateCustomer() for new call id
  Mock-->>App: Mock profile + contact fields
  App->>Host: sidebar.showBadge(count)
  App-->>User: UI: call list, state flow, event log
```

Authentication for the **sample** is implicit: the user is already signed into Webex, and the SDK runs in the embedded context. Any **real** CRM integration you add should use your own OAuth / API keys via environment variables and server-side or secured patterns—not hardcoded secrets in the bundle.
