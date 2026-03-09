"""Webex webhook registration: create, list, delete webhooks for meeting events."""

from __future__ import annotations

import requests

from meetings_exporter.webex_client import WEBEX_BASE, WebexAPIError

# Exportable (resource, event) pairs per Webex Webhooks Guide
WEBHOOK_SPECS: list[tuple[str, str]] = [
    ("meetings", "ended"),
    ("recordings", "created"),
    ("meetingTranscripts", "created"),
]


def create_meeting_webhooks(
    target_url: str,
    token: str,
    secret: str | None = None,
) -> list[dict]:
    """Create webhooks for meetings.ended, recordings.created, meetingTranscripts.created.

    Returns list of created webhook objects from the API.
    """
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {token}"
    session.headers["Content-Type"] = "application/json"
    created: list[dict] = []
    for resource, event in WEBHOOK_SPECS:
        body: dict = {
            "name": f"meetings-exporter {resource} {event}",
            "targetUrl": target_url.rstrip("/") + "/webhook",
            "resource": resource,
            "event": event,
        }
        if secret:
            body["secret"] = secret
        r = session.post(f"{WEBEX_BASE}/webhooks", json=body, timeout=30)
        if r.status_code >= 400:
            raise WebexAPIError(
                f"Create webhook {resource}.{event} failed: {r.status_code}",
                status_code=r.status_code,
                body=r.text,
            )
        created.append(r.json() if r.content else {})
    return created


def list_webhooks(token: str) -> list[dict]:
    """List webhooks for the authenticated user."""
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {token}"
    r = session.get(f"{WEBEX_BASE}/webhooks", timeout=30)
    if r.status_code >= 400:
        raise WebexAPIError(
            f"List webhooks failed: {r.status_code}",
            status_code=r.status_code,
            body=r.text,
        )
    data = r.json() if r.content else {}
    return data.get("items", [])


def delete_webhook(webhook_id: str, token: str) -> None:
    """Delete a webhook by ID."""
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {token}"
    r = session.delete(f"{WEBEX_BASE}/webhooks/{webhook_id}", timeout=30)
    if r.status_code >= 400:
        raise WebexAPIError(
            f"Delete webhook failed: {r.status_code}",
            status_code=r.status_code,
            body=r.text,
        )
