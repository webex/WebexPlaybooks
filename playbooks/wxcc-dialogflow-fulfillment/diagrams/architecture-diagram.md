# Architecture Diagrams — Webex Contact Center + Google Dialogflow

Two separate data-flow diagrams are shown below — one for each Dialogflow generation.
The core WxCC → Dialogflow handoff is the same in both; the differences are in where
the fulfillment webhook runs and how caller context is structured.

---

## Dialogflow CX — Cloud Function Webhook

The CX sample uses Dialogflow CX's native webhook page/route integration. WxCC passes
caller parameters to CX directly, and the CX agent invokes a standalone Google Cloud
Function to fetch account data.

```mermaid
sequenceDiagram
    participant Caller
    participant WxCC as Webex Contact Center<br/>(Flow Designer)
    participant VAV as Virtual Agent Voice<br/>(WxCC node)
    participant DFCX as Dialogflow CX Agent<br/>(Google Cloud)
    participant CF as Cloud Function<br/>(acc_balance)
    participant Backend as Backend API<br/>(account balance)

    Caller->>WxCC: Inbound voice call
    WxCC->>VAV: Route to Virtual Agent Voice node
    VAV->>DFCX: Start session with caller metadata<br/>(custom parameters)
    DFCX->>DFCX: Match intent / page route
    DFCX->>CF: POST webhook request<br/>(session params + caller context)
    CF->>Backend: GET /balance?customer=...
    Note over CF: MOCK_API_URL_CX env var<br/>points to your backend
    Backend-->>CF: { "balance": "1234.56" }
    CF-->>DFCX: fulfillment_response<br/>{ messages: ["Balance is 1234.56"] }
    DFCX-->>VAV: Spoken fulfillment text
    VAV-->>Caller: "The balance amount in your account is 1234.56."
```

**Key points:**
- Authentication: Google Cloud IAM on the Cloud Function; no Webex credentials in the function
- Caller context: passed as Dialogflow CX session parameters from the WxCC Virtual Agent Voice node
- Response shape: `{ fulfillment_response: { messages: [{ text: { text: [...] } }] } }`

---

## Dialogflow ES — Firebase Cloud Function (Inline Editor)

The ES sample uses Dialogflow ES's built-in Fulfillment Inline Editor, which deploys to
Firebase Cloud Functions. WxCC passes caller context in the `originalDetectIntentRequest.payload`
field of the standard Dialogflow webhook envelope.

```mermaid
sequenceDiagram
    participant Caller
    participant WxCC as Webex Contact Center<br/>(Flow Designer)
    participant VAV as Virtual Agent Voice<br/>(WxCC node)
    participant DFES as Dialogflow ES Agent<br/>(Google Cloud)
    participant Firebase as Firebase Cloud Function<br/>(dialogflowFirebaseFulfillment)
    participant CRM as CRM API<br/>(customer lookup)

    Caller->>WxCC: Inbound voice call
    WxCC->>VAV: Route to Virtual Agent Voice node
    VAV->>DFES: Start session<br/>originalDetectIntentRequest.payload<br/>{ name, email, reason, pin }
    DFES->>DFES: Match "Default Welcome Intent"
    DFES->>Firebase: POST fulfillment request<br/>(full Dialogflow webhook envelope)
    Firebase->>Firebase: Extract payload:<br/>name, email, reason, pin
    Firebase->>CRM: GET /customers?pin=<pin>
    Note over Firebase: MOCK_API_URL_ES env var<br/>points to your CRM
    CRM-->>Firebase: [{ account: "...", phone: "..." }]
    Firebase->>Firebase: Set "confirm-details" output context<br/>(account, phone)
    Firebase-->>DFES: WebhookClient response<br/>(spoken greeting + context)
    DFES-->>VAV: "Hello [name], calling about [reason]..."
    VAV-->>Caller: Personalized greeting spoken to caller
    Caller->>VAV: Confirms account number
    VAV->>DFES: "Confirm Details" intent triggered
    DFES->>Firebase: POST fulfillment (Confirm Details)
    Firebase-->>DFES: setFollowupEvent("escalated") + context
    DFES-->>VAV: Escalate or continue self-service
```

**Key points:**
- Authentication: Firebase/Google Cloud service account linked to the Dialogflow ES agent
- Caller context: read from `request.body.originalDetectIntentRequest.payload` — this is the standard WxCC-to-Dialogflow ES data channel
- Response mechanism: `dialogflow-fulfillment` SDK (`WebhookClient`) — `agent.add()` for spoken text, `agent.context.set()` for multi-turn state, `agent.setFollowupEvent()` for intent chaining
- Multi-turn: the ES sample demonstrates a two-turn flow (Welcome → Confirm Details) using Dialogflow output contexts

---

## Side-by-side summary

| | CX Sample | ES Sample |
|---|---|---|
| **Webhook host** | Google Cloud Functions (standalone) | Firebase Cloud Functions (Inline Editor) |
| **Caller context channel** | CX session parameters | `originalDetectIntentRequest.payload` |
| **Response format** | Raw `fulfillment_response` JSON | `dialogflow-fulfillment` SDK |
| **Multi-turn support** | Via CX pages and route groups | Via Dialogflow ES output contexts |
| **Deploy method** | `gcloud functions deploy` or Cloud Console | Dialogflow ES Fulfillment → Deploy button |
