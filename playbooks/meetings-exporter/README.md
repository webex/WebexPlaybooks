# Meeting Data Exporter + Webex Meetings Integration

This Playbook is adapted from the [Webex Meeting Data Exporter](https://github.com/WebexSamples/meetings-exporter) sample on GitHub.

Export Webex meeting data (recordings, transcripts, AI summaries, and action items) to Google Drive or local folders for use with AI tools like Gemini, analytics, or archival workflows.

## Use Case Overview

This Playbook solves the problem of getting Webex meeting artifacts out of the platform and into tools that can process them. When a meeting ends, recordings, transcripts, and AI-generated summaries are available via the Webex API—but developers often need to push this data to cloud storage (e.g., Google Drive) for downstream use with AI assistants, analytics pipelines, or compliance archives.

**Target persona:** Developers who integrate meeting data with external systems.

**Estimated implementation time:** 2–4 hours.

The integration adds value at the moment a meeting concludes: instead of manually downloading assets, a developer can run a CLI command or rely on webhooks to automatically export meeting data to a configured backend.

## Architecture

The integration uses a layered design:

1. **CLI or Webhook** — Triggers an export (user runs a command or Webex sends a meeting-ended notification).
2. **WebexClient** — Calls the Webex Meetings API and Meeting Summaries API with a Bearer token.
3. **Ingestion** — Fetches meeting details, participants, recordings, transcripts, and summaries into a normalized `MeetingData` structure.
4. **Exporter** — Writes the data to a local folder or uploads to Google Drive, depending on `EXPORT_BACKEND`.

See the diagram in [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md) for the full data flow.

## Prerequisites

- **Python 3.11 or later**
- **Webex account** with a [Personal Access Token](https://developer.webex.com/docs/getting-your-personal-access-token) (or OAuth2 app) from [developer.webex.com](https://developer.webex.com)
- **For Google Drive export only:** Google Cloud project with [Drive API enabled](https://console.cloud.google.com/apis/library/drive.googleapis.com) and OAuth client credentials (Desktop app type)
- **For webhook auto-export:** [ngrok](https://ngrok.com) or similar for local testing (e.g., `brew install ngrok`)

Meetings must be **individual instances** (not series) to get summaries, recordings, and transcripts. The app lists and exports instance meetings by default.

## Code Scaffold

The `/src/` folder contains:

- **main.py** — Entry point. Loads environment variables, accepts a meeting ID (via env or CLI), and calls `export_meeting()`.
- **meetings_exporter/** — Core package:
  - `webex_client.py` — Webex REST API client (meetings, recordings, transcripts, summaries).
  - `ingestion.py` — Fetches and normalizes meeting data; orchestrates export.
  - `models.py` — Data models (`MeetingData`, `RecordingAsset`, `ActionItem`).
  - `meeting_formatter.py` — Formats output for text files.
  - `exporters/` — Pluggable backends: `local_folder.py`, `google_drive.py`, `factory.py`.

The code demonstrates Webex API authentication, meeting data ingestion, and pluggable export backends. It does **not** include production hardening such as retries, rate limiting, or comprehensive error handling. All secrets must be provided via environment variables.

## Deployment Guide

1. **Clone this Playbook** (or the WebexPlaybooks repo) and navigate to the playbook folder: `cd playbooks/meetings-exporter/src`

2. **Create a virtual environment:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate   # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Copy the environment template and configure:**
   ```bash
   cp env.template .env
   ```
   Edit `.env` and set `WEBEX_ACCESS_TOKEN` to your [Personal Access Token](https://developer.webex.com/docs/getting-your-personal-access-token).

5. **List meetings** to get a meeting ID:
   ```bash
   python main.py list --from 2025-03-01 --to 2025-03-31 --max 5
   ```

6. **Export a single meeting** to a local folder:
   ```bash
   python main.py export MEETING_ID --output-dir ./exports
   ```
   Replace `MEETING_ID` with an ID from the list (instance IDs contain `_I_`).

7. **Optional — Google Drive export:** Set `EXPORT_BACKEND=google_drive` and `GOOGLE_CREDENTIALS_FILE=/path/to/credentials.json` in `.env`. On first export, the app opens a browser for OAuth; a `token.json` is saved for subsequent runs.

8. **Optional — Webhook server:** Run `python main.py webhook --port 8080`, expose with ngrok, then register webhooks with `python main.py webhook register --url https://YOUR_NGROK_URL`. Webex will notify the server when meetings end, recordings are ready, or transcripts are created.

## Known Limitations

- **License:** This Playbook uses source code under the [Cisco Sample Code License v1.1](../../LICENSE). Use is permitted only with Cisco products and services.
- **Meeting type:** Summaries, recordings, and transcripts require **individual meeting instances**, not series. The app filters for instances by default.
- **Token expiry:** Webex Personal Access Tokens expire. Refresh or use OAuth2 for long-running integrations.
- **Google OAuth:** Apps in Testing mode require test users to be added in the Google Cloud Console.
- **Rate limits:** Webex and Google APIs have rate limits; the sample does not implement retries or backoff.

This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
