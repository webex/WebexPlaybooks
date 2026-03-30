# Webex Contact Center BYOVA Gateway — Dialogflow CX Integration

> This Playbook is adapted from the [byova-dialogflow-agent](https://github.com/wxsd-sales/byova-dialogflow-agent) sample on GitHub.

A Python-based gRPC gateway that connects Webex Contact Center (WxCC) to Google Dialogflow CX virtual agents using the BYOVA (Bring Your Own Virtual Agent) protocol — enabling AI-powered voice self-service without replacing existing contact center infrastructure.

---

## Quick Start

For developers who already have Python 3.8+, `gcloud` CLI, and a Dialogflow CX agent ready:

```bash
# 1. Set up environment
cd playbooks/byova-dialogflow-agent/src
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 2. Compile gRPC stubs (required before first run)
python -m grpc_tools.protoc \
  -I./proto \
  --python_out=generated \
  --grpc_python_out=generated \
  proto/byova_common.proto proto/voicevirtualagent.proto

# 3. Configure your Dialogflow CX connector
#    Edit config/config.yaml — uncomment the dialogflow_cx_connector block
#    and fill in project_id, agent_id, and location

# 4. Authenticate with Google Cloud (ADC — recommended)
gcloud auth application-default login

# 5. Start the gateway
python main.py
# gRPC: 0.0.0.0:50051   Monitoring: http://localhost:8080
```

No Google Cloud credentials yet? See [Testing without cloud credentials](#step-25----test-locally-without-cloud-credentials) to launch with the built-in stub connector first.

---

## Use Case Overview

Contact center operations teams often want to deflect routine inbound calls to AI-powered virtual agents before escalating to a live agent. Webex Contact Center supports this through the BYOVA protocol, which lets you connect any compliant virtual agent backend to a WxCC flow.

This Playbook wires up Google Dialogflow CX as that backend. When a caller reaches the BYOVA entry point in a WxCC flow, the gateway receives their audio stream over gRPC, sends it to Dialogflow CX for intent recognition and fulfillment, and streams the AI-generated voice response back to the caller — all in real time. Agents receive the call only when the virtual agent decides to transfer.

**Target persona:** WxCC administrators, contact center developers, and Google Cloud developers who want to deploy a Dialogflow CX self-service bot on Webex Contact Center without managing a custom CCAI platform integration.

**Estimated implementation time:** 4–8 hours (including Google Cloud setup, WxCC configuration, and first test call).

---

## Architecture

The gateway sits between WxCC and Google Dialogflow CX, translating the WxCC BYOVA gRPC protocol into Dialogflow CX API calls and back.

```
Inbound Call → WxCC BYOVA Entry Point
                       ↓ gRPC (port 50051)
              BYOVA Gateway (Python)
               ├── gRPC Server (WxCCGatewayServer)
               │      ListVirtualAgents → returns configured agent names to WxCC
               │      ProcessCallerInput → bidirectional audio stream
               ├── VirtualAgentRouter → selects correct connector by agent ID
               └── DialogflowCXConnector
                       ↓ Dialogflow CX API
              Google Cloud: Dialogflow CX Agent
                       ↓ Intent + synthesized audio (8kHz MULAW)
              BYOVA Gateway → WxCC → Caller hears AI response
```

On each inbound call:
1. WxCC calls `ListVirtualAgents` to discover available bots (names come from `config.yaml`).
2. WxCC opens a bidirectional `ProcessCallerInput` stream, sending caller audio chunks (8kHz MULAW, ~640 bytes/80ms).
3. The `DialogflowCXConnector` accumulates audio for 2.5–5 seconds, then calls `DetectIntent` with the combined audio.
4. Dialogflow CX returns intent text plus synthesized speech audio.
5. The gateway streams the audio response back to WxCC, which plays it to the caller.
6. When Dialogflow signals session end or transfer, the gateway sends the corresponding WxCC event (`SESSION_END` or `TRANSFER_TO_AGENT`).

A Flask-based monitoring dashboard runs on port 8080 and provides real-time visibility into active sessions and connector health:

| Endpoint | Description |
|---|---|
| `GET /` | Browser dashboard — live session and connector view |
| `GET /health` | Service health check — `{"status":"healthy","timestamp":"..."}` |
| `GET /api/status` | Running connectors, available agents, active session count |
| `GET /api/connections` | Connection event history with timestamps |
| `GET /api/config` | Loaded configuration summary (sanitized) |
| `GET /api/debug/sessions` | Raw session state — use during development to inspect in-flight calls |

See the architecture diagram in [/diagrams/architecture-diagram.md](diagrams/architecture-diagram.md).

---

## Prerequisites

### Webex Contact Center

- WxCC org with **BYOVA feature enabled** — contact your Cisco account team or Webex support to enable BYOVA for your org
- Admin access to **Webex Control Hub** and the **Flow Designer**
- A **BYOVA Virtual Agent** configuration created in Control Hub pointing to your gateway's public gRPC address (`host:50051`)
- A WxCC **Flow** with a Virtual Agent V2 activity that uses the BYOVA configuration
- A WxCC **Entry Point** and **Queue** wired to that flow

### Google Cloud

- Google Cloud project with **Dialogflow CX API** enabled:
  ```bash
  gcloud services enable dialogflow.googleapis.com
  ```
- A **Dialogflow CX Agent** created, published, and configured with at least one flow and intent
- Authentication — choose one:
  - **Application Default Credentials (ADC)** — recommended for production; run `gcloud auth application-default login` locally or use a GCP service account
  - **OAuth 2.0** — suitable for development; requires a Desktop App OAuth client ID/secret from Google Cloud Console
  - **Service Account Key** — JSON key file with `roles/dialogflow.client` IAM role

### Runtime Environment

- Python 3.8 or later
- `pip` package manager
- gRPC toolchain: `grpcio-tools` (installed via `requirements.txt`)
- Network: the gateway server must be **publicly reachable over port 50051** (gRPC) so WxCC can connect to it; plain HTTP on port 50051 is acceptable for testing (the gateway uses insecure gRPC)
- Monitoring dashboard on port 8080 (HTTP) — can be internal only

---

## Code Scaffold

The `src/` directory contains the full gateway runtime, copied from the upstream project. It demonstrates:

- **BYOVA gRPC protocol implementation** — `proto/voicevirtualagent.proto` and `proto/byova_common.proto` define the WxCC wire format; pre-built Python stubs must be generated before running
- **Connector architecture** — `src/connectors/` contains pluggable backends: `dialogflow_cx_connector.py` (Google Dialogflow CX), `local_audio_connector.py` (WAV file playback for testing), and `my_connector.py` (stub template for custom connectors)
- **Audio handling** — automatic detection and conversion between WxCC telephony format (8kHz MULAW) and Dialogflow CX format; Python 3.13+ fallback when `audioop` is unavailable
- **Monitoring dashboard** — `src/monitoring/app.py` (Flask) exposes `/api/status`, `/api/connections`, and `/health` endpoints plus a browser-based dashboard at `/`
- **YAML-driven config** — all runtime behavior (connector type, credentials, ports, logging, session limits) is controlled through `config/config.yaml`; no environment variables required (though the upstream docs show YAML variable substitution as an option)
- **Importable WxCC Flow** — `BYOVA_Gateway_Flow.json` is a pre-built WxCC flow you can import into your org as a starting point

What this code does NOT do:
- Does not implement TLS on the gRPC listener (uses `add_insecure_port`); add TLS termination at a reverse proxy or load balancer for production
- Does not provide authentication between WxCC and the gateway; consider mTLS or a token-based scheme for production
- Does not run in high-availability mode; single-process only

See [docs/upstream-overview.md](docs/upstream-overview.md) for the upstream auth setup guides.

### `src/` Layout

```
src/
├── main.py                         # Entry point — loads config, starts gRPC + Flask
├── requirements.txt                # Python dependencies
├── pyproject.toml                  # Build metadata
├── BYOVA_Gateway_Flow.json         # Importable WxCC Flow
├── env.template                    # Config variable reference
├── config/
│   ├── config.yaml                 # Main runtime config (edit this)
│   ├── dialogflow_cx_example.yaml  # Annotated Dialogflow CX connector reference
│   └── aws_lex_example.yaml        # Annotated AWS Lex connector reference
├── proto/
│   ├── voicevirtualagent.proto     # BYOVA gRPC service definition
│   └── byova_common.proto          # Shared types
├── connectors/
│   ├── dialogflow_cx_connector.py  # Primary connector (Dialogflow CX)
│   ├── local_audio_connector.py    # WAV playback connector (testing)
│   ├── my_connector.py             # Stub template for custom connectors
│   └── i_vendor_connector.py       # Abstract base connector interface
├── core/
│   ├── wxcc_gateway_server.py      # gRPC servicer (ListVirtualAgents, ProcessCallerInput)
│   └── virtual_agent_router.py    # Routes calls to the correct connector
├── monitoring/
│   ├── app.py                      # Flask monitoring API + dashboard
│   └── templates/                  # Dashboard HTML templates
└── utils/
    ├── audio_buffer.py             # Audio accumulation helpers
    ├── audio_logger.py             # Audio recording for debugging
    ├── audio_recorder.py           # WAV writing utilities
    └── audio_utils.py              # Format conversion helpers
```

### Files to exclude from git

The following should not be committed to source control — add them to `.gitignore` if not already present:

```
venv/
generated/*_pb2.py
generated/*_pb2_grpc.py
*.pickle
logs/
```

The `generated/__init__.py` placeholder file should be kept (it marks the directory as a Python package and is committed to the repo).

---

## Building a Custom Connector

The gateway's connector architecture is designed to be extended. To integrate a virtual agent platform other than Dialogflow CX or AWS Lex, create a new Python file in `src/connectors/` that inherits from `IVendorConnector` and implement the six required abstract methods:

| Method | When called | What to return |
|---|---|---|
| `__init__(config)` | At gateway startup | Initialize client SDKs using the `config:` block from `config.yaml` |
| `start_conversation(conversation_id, request_data)` | When WxCC opens a new session | Return `create_session_start_response(conversation_id)` |
| `send_message(conversation_id, message_data)` | Each audio/event chunk from WxCC | Generator — `yield` one or more response dicts; `yield None` for silence |
| `end_conversation(conversation_id, message_data)` | When WxCC closes the session | Tear down any open API sessions; no return value needed |
| `get_available_agents()` | On `ListVirtualAgents` gRPC call | Return `List[str]` — must match the `agents:` list in `config.yaml` |
| `convert_wxcc_to_vendor(grpc_data)` | Inside `send_message` | Translate the WxCC gRPC message to your platform's input format |
| `convert_vendor_to_wxcc(vendor_data)` | Inside `send_message` | Translate your platform's response to a WxCC response dict |

### Helper methods (inherited from `IVendorConnector`)

The base class provides pre-built factory methods so you don't have to assemble WxCC event dicts manually:

```python
# Start of session — sends SESSION_START event to WxCC
self.create_session_start_response(conversation_id, text="", audio_content=b"")

# Transfer caller to a live agent — sends TRANSFER_TO_HUMAN event
self.create_transfer_response(conversation_id, text="Transferring you now.")

# End the conversation — sends CONVERSATION_END event
self.create_goodbye_response(conversation_id, text="Goodbye!")

# Generic response with custom message_type and optional events
self.create_response(conversation_id, message_type="silence", text="", audio_content=b"")
```

`EventTypes` constants (`SESSION_START`, `TRANSFER_TO_HUMAN`, `CONVERSATION_END`, `START_OF_INPUT`, `END_OF_INPUT`, `NO_INPUT`, `NO_MATCH`) are available at the top of `connectors/i_vendor_connector.py`.

### Minimal connector skeleton

```python
# src/connectors/my_new_connector.py
from connectors.i_vendor_connector import IVendorConnector, EventTypes

class MyNewConnector(IVendorConnector):
    def __init__(self, config):
        self.config = config
        self.agents = config.get("agents", ["My Agent"])
        # initialize your SDK client here

    def get_available_agents(self):
        return self.agents

    def start_conversation(self, conversation_id, request_data):
        return self.create_session_start_response(conversation_id)

    def send_message(self, conversation_id, message_data):
        input_type = message_data.get("input_type")
        if input_type == "audio":
            audio = self.extract_audio_data(message_data.get("audio_data"), conversation_id)
            # call your virtual agent API here
            response_text = "Response from my platform"
            yield self.create_response(
                conversation_id, message_type="agent_response",
                text=response_text, response_type="final"
            )
        else:
            yield None

    def end_conversation(self, conversation_id, message_data=None):
        pass  # clean up SDK session if needed

    def convert_wxcc_to_vendor(self, grpc_data):
        return grpc_data  # transform as needed

    def convert_vendor_to_wxcc(self, vendor_data):
        return vendor_data  # transform as needed
```

### Register in `config/config.yaml`

```yaml
connectors:
  my_new_connector:
    type: "my_new_connector"
    class: "MyNewConnector"
    module: "connectors.my_new_connector"
    config:
      agents:
        - "My New Agent"
```

The `module` value is the Python import path relative to `src/` (dot-separated). The `class` value is the class name within that module.

---

## Deployment Guide

### Step 1 — Clone the playbook and set up a Python virtual environment

```bash
cd playbooks/byova-dialogflow-agent/src
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Step 2 — Generate gRPC stubs from the proto files

The `src/generated/` directory is not vendored; you must build it from `proto/`:

```bash
cd playbooks/byova-dialogflow-agent/src
python -m grpc_tools.protoc \
  -I./proto \
  --python_out=generated \
  --grpc_python_out=generated \
  proto/byova_common.proto \
  proto/voicevirtualagent.proto
```

### Step 2.5 — Test locally without cloud credentials

Before configuring Google Cloud, you can verify the gateway starts correctly using the built-in connectors that require no external credentials.

**Option A — Stub connector (default)**

`config/config.yaml` ships with `my_connector` enabled. Start the gateway as-is:

```bash
python main.py
```

The stub connector loads with a single agent (`"My Agent"`) and responds to gRPC calls with `"Hello from my connector!"`. Use this to confirm the gateway starts, gRPC port 50051 is listening, and the monitoring dashboard at `http://localhost:8080` is healthy before touching any cloud config.

**Option B — Local audio connector (WAV playback)**

For a more realistic test that actually plays audio back to a caller, configure the `local_audio_connector` in `config/config.yaml`. Comment out `my_connector` and add:

```yaml
local_audio_connector:
  type: "local_audio_connector"
  class: "LocalAudioConnector"
  module: "connectors.local_audio_connector"
  config:
    audio_files:
      welcome: "audio/welcome.wav"
      default: "audio/default_response.wav"
      transfer: "audio/transferring.wav"
      goodbye: "audio/goodbye.wav"
      error: "audio/error.wav"
    agents:
      - "Local Playback"
```

Provide 8kHz MULAW `.wav` files at the paths specified, or adjust the paths to WAV files you have available. This connector streams the WAV audio back to WxCC as the virtual agent response.

---

### Step 3 — Configure Google Cloud authentication

**Option A — Application Default Credentials (recommended for production):**
```bash
gcloud auth application-default login
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:your-email@example.com" \
  --role="roles/dialogflow.client"
```

**Option B — OAuth 2.0 (development):**

1. In [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**, create an OAuth 2.0 Client ID (Application type: **Desktop app**).
2. Note the Client ID and Client Secret.
3. Add `http://localhost:8090/` as an Authorized redirect URI.
4. Paste the values into `config/config.yaml` under `oauth_client_id` and `oauth_client_secret`.
5. First run will open a browser for authorization; subsequent runs use the cached token file.

See [docs/upstream-overview.md](docs/upstream-overview.md) for the full OAuth setup guide.

### Step 4 — Edit `config/config.yaml`

Open `src/config/config.yaml` and configure your connector:

```yaml
connectors:
  dialogflow_cx_connector:
    type: "dialogflow_cx_connector"
    class: "DialogflowCXConnector"
    module: "connectors.dialogflow_cx_connector"
    config:
      project_id: "YOUR_PROJECT_ID"      # Google Cloud project ID
      agent_id: "YOUR_AGENT_ID"          # Dialogflow CX agent ID
      location: "global"                 # Agent location
      language_code: "en-US"
      sample_rate_hertz: 8000            # WxCC telephony rate
      audio_encoding: "AUDIO_ENCODING_MULAW"
      force_input_format: "wxcc"         # Forces WxCC audio format detection
      agents:
        - "Dialogflow CX Agent"          # Display name shown in WxCC
```

Set gateway and monitoring ports if the defaults (50051 / 8080) conflict with your environment:

```yaml
gateway:
  host: "0.0.0.0"
  port: 50051
monitoring:
  enabled: true
  host: "0.0.0.0"
  port: 8080
```

### Step 5 — Start the gateway

```bash
cd playbooks/byova-dialogflow-agent/src
source venv/bin/activate
python main.py
```

Look for:
```
INFO - Server started on port 50051
INFO - Flask monitoring app started on 0.0.0.0:8080
```

Confirm the monitoring dashboard is reachable at `http://localhost:8080`.

### Step 6 — Configure WxCC BYOVA integration

1. In **Webex Control Hub** → **Contact Center** → **AI Agents**, create a new BYOVA Virtual Agent:
   - **Type**: Bring Your Own Virtual Agent
   - **gRPC endpoint**: `your-server-hostname:50051` (must be publicly reachable)
   - **Agent name**: must match the name in `config.yaml` under `agents:`
2. In **Flow Designer**, add a **Virtual Agent V2** activity to your call flow and select the BYOVA configuration you created.
3. Wire the **Escalated** output of the Virtual Agent activity to your agent queue or transfer action.
4. Publish the flow and assign it to your entry point.

### Step 7 — Import the WxCC Flow (optional)

`BYOVA_Gateway_Flow.json` is a pre-built WxCC flow you can import as a starting point. In **Flow Designer**, click **Import** and select this file. Update the Virtual Agent V2 activity to use your BYOVA configuration.

### Step 8 — Test with a call

Place a test call to the entry point. Watch gateway logs for:
```
INFO - ListVirtualAgents called
INFO - ProcessCallerInput stream opened
INFO - DialogflowCXConnector initialized
INFO - [USER] Said: 'hello'
INFO - [AGENT] Response: '...'
```

Monitor active sessions at `http://localhost:8080/api/connections`.

---

## Troubleshooting

### `ModuleNotFoundError: No module named 'byova_common_pb2'`

The gRPC Python stubs have not been generated yet, or the `generated/` directory is not on `sys.path`. Run the `protoc` command from Step 2 to create them. The stubs use bare module imports (`import byova_common_pb2`), which requires `generated/` to be on `sys.path` — this is already handled in `main.py` with `sys.path.insert(0, str(Path(__file__).parent / "generated"))`.

### `ModuleNotFoundError: No module named 'src'`

A stale `src.` prefix in an import (e.g., `from src.connectors.foo import Foo`). This can happen if you copy files from the upstream repo directly. Locate all occurrences and strip the prefix:

```bash
grep -rn "from src\." --include="*.py" .
# Replace "from src.connectors." with "from connectors.", etc.
```

### Monitoring dashboard returns connection refused or 404

The gateway process is not running, or it failed to start. Check the terminal output for Python import errors. Also confirm port 8080 is not already in use:

```bash
lsof -i :8080
```

If another process is using port 8080, change `monitoring.port` in `config/config.yaml`.

### `audioop` deprecation warning on Python 3.13+

This is expected. The `audioop` standard library module was removed in Python 3.13. The `DialogflowCXConnector` detects this and automatically falls back to a pure-Python audio format conversion. No action is required; the warning does not affect functionality.

### OAuth token missing — browser re-opens on every gateway start

The `oauth_token_file` path in `config/config.yaml` must point to a writable location. On first successful authorization, a `.pickle` file is written to that path. Subsequent runs read the cached token without opening a browser. If the file path is wrong or the directory is read-only, authentication re-runs on every start. Ensure `oauth_token_file` is set to a path like `"dialogflow_oauth_token.pickle"` (relative to `src/`) and that the directory is writable. Add `*.pickle` to your `.gitignore`.

### gRPC port 50051 not reachable from WxCC

WxCC requires the gateway to be **publicly reachable** on port 50051. When testing locally, use a tunneling tool such as [ngrok](https://ngrok.com/) with gRPC passthrough:

```bash
ngrok tcp 50051
```

Use the resulting `tcp://` address as the gRPC endpoint in your WxCC BYOVA configuration. Update `config.yaml` if you need to change the listen port from the default `50051`.

---

## Known Limitations

- **BYOVA feature flag** — BYOVA must be explicitly enabled for your WxCC org by Cisco. It is not available by default in all regions or tiers.
- **gRPC without TLS** — the gateway uses `add_insecure_port` and does not terminate TLS. For production, place a TLS-terminating reverse proxy (nginx, Envoy, or a cloud load balancer) in front of port 50051.
- **No WxCC-to-gateway authentication** — WxCC connects to the gateway without verifying identity. Consider mTLS or an API gateway with token validation for production.
- **Single-process only** — the gateway is a single Python process with no horizontal scaling support. Session state is in-memory only.
- **`audioop` deprecated in Python 3.13+** — audio format conversion falls back to a pure-Python implementation when `audioop` is unavailable. Quality may differ for edge cases.
- **OAuth token stored as pickle** — OAuth tokens are cached in a `.pickle` file. Do not commit this file to source control. Add `*.pickle` to `.gitignore`.
- **Session state lost on restart** — active calls are interrupted if the gateway process restarts. Implement an external session store for production resilience.
- **Rate limits** — Google Dialogflow CX API rate limits apply. Check [Dialogflow CX quotas](https://cloud.google.com/dialogflow/cx/quotas) for your project tier.
- **License** — the upstream source code is released under the [Cisco Sample Code License v1.1](../../LICENSE). It is provided for example purposes only, is not supported by Cisco TAC, and is not tested for quality or performance.
- **Webex disclaimer** — this Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
