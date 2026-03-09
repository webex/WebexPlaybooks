"""Utilities for parsing Webex webhook payloads.

Extract meeting IDs from incoming events to trigger exports. Supports
signature verification per Webex webhook docs.
"""

from __future__ import annotations

import hashlib
import hmac

# Exportable (resource, event) pairs per Webex Webhooks Guide
_EXPORTABLE_EVENTS: frozenset[tuple[str, str]] = frozenset(
    [
        ("meetings", "ended"),
        ("recordings", "created"),
        ("meetingTranscripts", "created"),
    ]
)


def extract_meeting_id_from_payload(payload: dict) -> str | None:
    """Extract meeting ID from a Webex webhook-style payload."""
    if not payload:
        return None
    data = payload.get("data") or payload
    return data.get("meetingId") or data.get("meeting_id") or data.get("id")


def extract_recording_id_from_payload(payload: dict) -> str | None:
    """Extract recording/session ID from a Webex webhook-style payload if present."""
    if not payload:
        return None
    data = payload.get("data") or payload
    return data.get("recordingId") or data.get("recording_id") or data.get("sessionId")


def extract_meeting_id_from_webhook_envelope(payload: dict) -> str | None:
    """Extract meeting ID from a Webex webhook envelope.

    For meetings resource: data.id is the meeting instance ID.
    For recordings and meetingTranscripts: data.meetingId is the meeting ID.
    """
    return extract_meeting_id_from_payload(payload)


def is_exportable_event(resource: str, event: str) -> bool:
    """Return True if (resource, event) should trigger an export."""
    return (resource, event) in _EXPORTABLE_EVENTS


def verify_webhook_signature(payload_bytes: bytes, signature: str, secret: str) -> bool:
    """Verify X-Spark-Signature (HMAC-SHA1) per Webex webhook docs."""
    if not signature or not secret:
        return False
    expected = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha1).hexdigest()
    return hmac.compare_digest(expected, signature)
