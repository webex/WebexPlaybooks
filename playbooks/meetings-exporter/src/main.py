#!/usr/bin/env python3
"""Entry point for the Meeting Data Exporter Playbook.

This script demonstrates how to export Webex meeting data (recordings, transcripts,
summaries, action items) to a local folder or Google Drive.

Usage:
  python main.py list --from YYYY-MM-DD --to YYYY-MM-DD --max N
  python main.py export MEETING_ID --output-dir ./exports
  python main.py webhook --port 8080
  python main.py webhook register --url https://your-ngrok-url
  python main.py webhook unregister

Environment variables (see env.template):
  WEBEX_ACCESS_TOKEN  - Required. Get from https://developer.webex.com
  EXPORT_BACKEND      - "local" or "google_drive"
  GOOGLE_CREDENTIALS_FILE - Path to OAuth credentials (for Google Drive)
"""

from dotenv import load_dotenv

load_dotenv()

from meetings_exporter.cli import main

if __name__ == "__main__":
    main()
