"""Webhook HTTP server for Webex meeting notifications.

Listens for meetings.ended, recordings.created, meetingTranscripts.created
and triggers export_meeting in the background.
"""

from __future__ import annotations

import json
import logging
import os
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from meetings_exporter.ingestion import export_meeting
from meetings_exporter.webex_client import WebexClient
from meetings_exporter.webhook_utils import (
    extract_meeting_id_from_webhook_envelope,
    is_exportable_event,
    verify_webhook_signature,
)

logger = logging.getLogger(__name__)

WEBHOOK_PATH = "/webhook"
SIGNATURE_HEADER = "X-Spark-Signature"


def process_webhook_payload(
    body: bytes,
    headers: dict[str, str],
) -> tuple[int, dict[str, str], tuple[str, str, str] | None]:
    """Process webhook request. Returns (status_code, response_body, export_info).

    export_info is (meeting_id, resource, event) if export should run, else None.
    Extracted for testability.
    """
    secret = os.environ.get("WEBEX_WEBHOOK_SECRET", "").strip()
    if secret:
        sig = headers.get(SIGNATURE_HEADER.lower(), "")
        if not verify_webhook_signature(body, sig, secret):
            return 401, {"error": "Invalid signature"}, None

    try:
        payload = json.loads(body.decode("utf-8"))
    except json.JSONDecodeError:
        return 400, {"error": "Invalid JSON"}, None

    resource = payload.get("resource", "")
    event = payload.get("event", "")
    meeting_id = extract_meeting_id_from_webhook_envelope(payload)
    if is_exportable_event(resource, event) and meeting_id:
        return 200, {"status": "ok"}, (meeting_id, resource, event)
    return 200, {"status": "ok"}, None


def _run_export(meeting_id: str, resource: str, event: str) -> None:
    """Run export in background; log result or error."""
    try:
        client = WebexClient(access_token=os.environ["WEBEX_ACCESS_TOKEN"])
        result = export_meeting(meeting_id, client=client, progress_callback=lambda x: None)
        logger.info(
            "Webhook export success: resource=%s event=%s meeting_id=%s result=%s",
            resource,
            event,
            meeting_id,
            result,
        )
    except Exception as e:
        logger.exception(
            "Webhook export failed: resource=%s event=%s meeting_id=%s error=%s",
            resource,
            event,
            meeting_id,
            str(e),
        )


class WebhookHandler(BaseHTTPRequestHandler):
    """HTTP handler for Webex webhook POSTs."""

    def log_message(self, format: str, *args: object) -> None:
        """Route to logger instead of stderr."""
        logger.info("%s - %s", self.address_string(), format % args)

    def do_POST(self) -> None:  # noqa: N802 (BaseHTTPRequestHandler convention)
        """Handle POST to /webhook."""
        if self.path != WEBHOOK_PATH:
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0:
            self._send_error_response(400, "Missing or invalid Content-Length")
            return

        body = self.rfile.read(content_length)
        headers_dict = {k.lower(): v for k, v in self.headers.items()}
        status, resp_body, export_info = process_webhook_payload(body, headers_dict)

        if status != 200:
            self._send_error_response(status, resp_body.get("error", ""))
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(resp_body).encode("utf-8"))

        if export_info:
            meeting_id, resource, event = export_info
            thread = threading.Thread(
                target=_run_export,
                args=(meeting_id, resource, event),
                daemon=True,
            )
            thread.start()
        else:
            logger.debug(
                "Webhook ignored (not exportable or no meeting_id): resource=%s event=%s",
                resource,
                event,
            )

    def _send_error_response(self, code: int, message: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode("utf-8"))

    def do_GET(self) -> None:  # noqa: N802 (BaseHTTPRequestHandler convention)
        """Reject GET requests."""
        self.send_response(405)
        self.end_headers()


def run_webhook_server(host: str = "0.0.0.0", port: int = 8080) -> None:
    """Run the webhook HTTP server until interrupted."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    if not os.environ.get("WEBEX_ACCESS_TOKEN"):
        raise SystemExit("Error: WEBEX_ACCESS_TOKEN not set")
    server = HTTPServer((host, port), WebhookHandler)
    logger.info("Webhook server listening on %s:%d at %s", host, port, WEBHOOK_PATH)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.shutdown()
