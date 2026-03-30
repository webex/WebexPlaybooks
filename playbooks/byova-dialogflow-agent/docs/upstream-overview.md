# Upstream Auth Setup Guides

This document condenses the authentication and configuration guides from the [upstream byova-dialogflow-agent repository](https://github.com/wxsd-sales/byova-dialogflow-agent). Refer to the upstream repo for the most current documentation.

---

## Authentication Methods (Dialogflow CX)

The `DialogflowCXConnector` supports three authentication methods. They are tried in this priority order:

| Priority | Method | Best For |
|----------|--------|----------|
| 1 | **Service Account Key File** | Development / testing on-prem |
| 2 | **OAuth 2.0 User Credentials** | Local development with browser |
| 3 | **Application Default Credentials (ADC)** | Production (GCP environments) |

---

## Option 1 — Service Account Key File

### Setup

1. In [Google Cloud Console](https://console.cloud.google.com/) → **IAM & Admin** → **Service Accounts**, create a service account.
2. Assign the `roles/dialogflow.client` IAM role.
3. Create a JSON key: **Keys** → **Add Key** → **Create New Key** → JSON.
4. Download the key file (e.g. `sa-key.json`) and place it outside your repo.

### Config (`config/config.yaml`)

```yaml
connectors:
  dialogflow_cx_connector:
    type: "dialogflow_cx_connector"
    class: "DialogflowCXConnector"
    module: "connectors.dialogflow_cx_connector"
    config:
      project_id: "YOUR_PROJECT_ID"
      agent_id: "YOUR_AGENT_ID"
      location: "global"
      service_account_key: "/secrets/sa-key.json"   # path to downloaded key file
      agents:
        - "Dialogflow CX Agent"
```

> **Security:** Never commit the key file to source control. Add it to `.gitignore` and store it via a secrets manager in production.

---

## Option 2 — OAuth 2.0 User Credentials

Suitable when you want to authenticate as a Google user account rather than a service account. Requires a one-time browser authorization on first run; token is cached and auto-refreshed.

### Setup

1. In Google Cloud Console → **APIs & Services** → **Credentials**, click **+ CREATE CREDENTIALS** → **OAuth client ID**.
2. Application type: **Desktop app**. Name it (e.g., "BYOVA Gateway Desktop").
3. Note the **Client ID** and **Client secret**.
4. In **APIs & Services** → **OAuth consent screen**, configure user type and add the `https://www.googleapis.com/auth/dialogflow` scope.
5. Grant your user account the `roles/dialogflow.client` role:
   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="user:your-email@example.com" \
     --role="roles/dialogflow.client"
   ```

### Config (`config/config.yaml`)

```yaml
connectors:
  dialogflow_cx_connector:
    type: "dialogflow_cx_connector"
    class: "DialogflowCXConnector"
    module: "connectors.dialogflow_cx_connector"
    config:
      project_id: "YOUR_PROJECT_ID"
      agent_id: "YOUR_AGENT_ID"
      location: "global"
      oauth_client_id: "YOUR_CLIENT_ID.apps.googleusercontent.com"
      oauth_client_secret: "YOUR_CLIENT_SECRET"
      oauth_token_file: "dialogflow_oauth_token.pickle"   # cached token path
      agents:
        - "Dialogflow CX Agent"
```

### First Run — Browser Authorization

On the first `python main.py` run:
1. A browser window opens with Google's authorization page.
2. If the app is unverified, click **Advanced** → **Go to [App name]**.
3. Sign in with your Google account and click **Allow**.
4. The terminal shows: `OAuth authorization successful!`
5. The token is saved to `oauth_token_file` for subsequent runs.

### Token Management

- Tokens auto-refresh when expired (no user interaction needed after first run).
- To revoke: `rm dialogflow_oauth_token.pickle` then re-run to re-authorize.
- **Add `*.pickle` to `.gitignore`** — token files must not be committed.

---

## Option 3 — Application Default Credentials (ADC) — Recommended for Production

No credentials need to be specified in `config.yaml`. The Google SDK resolves credentials automatically based on environment:

| Environment | How ADC resolves |
|-------------|------------------|
| Local dev | `gcloud auth application-default login` |
| GCP Compute Engine / GKE | Attached service account |
| GCP Cloud Run / App Engine | Bound service account |
| Docker / K8s (non-GCP) | Mount SA key file; set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json` |

### Local setup

```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

### Config (`config/config.yaml`)

```yaml
connectors:
  dialogflow_cx_connector:
    type: "dialogflow_cx_connector"
    class: "DialogflowCXConnector"
    module: "connectors.dialogflow_cx_connector"
    config:
      project_id: "YOUR_PROJECT_ID"
      agent_id: "YOUR_AGENT_ID"
      location: "global"
      # No auth params → ADC is used automatically
      agents:
        - "Dialogflow CX Agent"
```

---

## Required IAM Roles

Whichever identity (user or service account) the connector uses must have:

| Role | Purpose |
|------|---------|
| `roles/dialogflow.client` | Call `DetectIntent` and list agents |
| `roles/dialogflow.reader` | (Optional) Read agent metadata |

Grant via CLI:
```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/dialogflow.client"
```

---

## AWS Lex v2 Connector (Alternative)

The gateway also ships with an AWS Lex v2 connector. To use it, replace the `dialogflow_cx_connector` block in `config.yaml` with:

```yaml
connectors:
  aws_lex_connector:
    type: "aws_lex_connector"
    class: "AWSLexConnector"
    module: "connectors.aws_lex_connector"
    config:
      region_name: "us-east-1"
      bot_alias_id: "TSTALIASID"     # replace with your bot alias
      barge_in_enabled: false
      agents:
        - "My Lex Bot"
```

AWS credentials are resolved via the [boto3 credential chain](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/credentials.html) — environment variables, `~/.aws/credentials`, or IAM role.

See `src/config/aws_lex_example.yaml` for annotated configuration examples.

---

## Useful References

- [Dialogflow CX Authentication](https://cloud.google.com/dialogflow/cx/docs/quick/setup)
- [Google OAuth 2.0 for Installed Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Application Default Credentials guide](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Dialogflow CX IAM Roles](https://cloud.google.com/dialogflow/cx/docs/concept/access-control)
- [WxCC BYOVA Developer Docs](https://developer.webex-cx.com/documentation/guides/bring-your-own-virtual-agent)
- [Upstream repository](https://github.com/wxsd-sales/byova-dialogflow-agent) — Cisco Sample Code License v1.1
