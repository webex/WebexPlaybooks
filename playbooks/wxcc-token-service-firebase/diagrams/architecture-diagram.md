# Architecture — WxCC token service (Firebase)

HTTP trigger on **Google Cloud Functions** runs `tokenService` ([`src/index.js`](../src/index.js)). **Firebase Admin** reads and writes OAuth state in **Cloud Firestore** (`tokens` collection). Callers use **Webex** OAuth and `https://webexapis.com/v1/access_token` for code exchange and refresh.

```mermaid
sequenceDiagram
  participant Admin as AdminBrowser
  participant Webex as WebexOAuth
  participant GCF as CloudFunction
  participant FS as Firestore
  participant Caller as FlowOrClient

  Admin->>Webex: Authorize with state equals token name
  Webex->>GCF: Redirect to callback with code
  GCF->>FS: Store access and refresh tokens
  Caller->>GCF: GET trigger with name query and x-token-passphrase
  GCF->>FS: Read token document
  alt access token has under two hours left but refresh valid
    GCF->>Webex: POST access_token refresh grant
    GCF->>FS: Persist new tokens
  end
  GCF->>Caller: JSON access token
```

For a self-hosted Express + SQLite alternative, see [wxcc-token-management-sample](../../wxcc-token-management-sample/README.md).
