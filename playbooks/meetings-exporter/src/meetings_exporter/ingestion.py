"""Ingestion layer: fetch all Webex meeting data into normalized MeetingData.

Uses Meeting Summaries API (get summary by meeting ID) for summary and action items:
https://developer.webex.com/meeting/docs/api/v1/meeting-summaries/get-summary-by-meeting-id
"""

from __future__ import annotations

import logging
import os
import sys
from collections.abc import Callable
from datetime import datetime

from meetings_exporter.exporters.base import MeetingExporter
from meetings_exporter.exporters.factory import get_exporter
from meetings_exporter.models import ActionItem, MeetingData, RecordingAsset
from meetings_exporter.webex_client import WebexClient

logger = logging.getLogger(__name__)


def _default_progress(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def _parse_iso(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def _action_items_from_summary_response(summary_payload: dict) -> list[ActionItem]:
    """Build ActionItem list from Meeting Summaries API response."""
    items = []
    raw_list = summary_payload.get("actionItems") or summary_payload.get("action_items") or []
    for raw in raw_list:
        if isinstance(raw, dict):
            items.append(
                ActionItem(
                    text=raw.get("text") or raw.get("title") or "",
                    assignee=raw.get("assignee"),
                    due=raw.get("due"),
                    raw=raw,
                )
            )
        elif isinstance(raw, str):
            items.append(ActionItem(text=raw))
    return items


# Webex may return format as "MP4" (codec) instead of "video/mp4" (MIME type)
_FORMAT_TO_MIME: dict[str, str] = {
    "mp4": "video/mp4",
    "webm": "video/webm",
    "m4a": "audio/mp4",
    "mp3": "audio/mpeg",
}


def _normalize_mime_type(format_val: str | None) -> str:
    """Convert Webex format (e.g. MP4) to valid MIME type for Drive/APIs."""
    if not format_val:
        return "video/mp4"
    key = format_val.lower().strip()
    return _FORMAT_TO_MIME.get(key, "video/mp4")


def _fetch_recordings(
    client: WebexClient,
    instance_id: str,
    progress: Callable[[str], None],
) -> list[RecordingAsset]:
    """Fetch and download recordings for a meeting."""
    recordings: list[RecordingAsset] = []
    try:
        progress("  Listing recordings...")
        recs = client.list_recordings(meeting_id=instance_id)
    except Exception:
        recs = []
    for i, r in enumerate(recs):
        rec_id = r.get("id")
        host_email = r.get("hostEmail")
        url = None
        content = None
        if rec_id and host_email:
            try:
                progress(f"  Getting download URL for recording {i + 1}/{len(recs)}...")
                details = client.get_recording_details(rec_id, host_email)
                # Use temporaryDirectDownloadLinks.recordingDownloadLink (CDN URL).
                # Do NOT use downloadUrl - it points to lsr.php (web page), not the binary.
                tddl = details.get("temporaryDirectDownloadLinks") or {}
                url = tddl.get("recordingDownloadLink")
                if url:
                    progress(f"  Downloading recording {i + 1}/{len(recs)}...")
                    # Pre-signed URLs: no Authorization (CDN returns HTML otherwise)
                    content = client._get_binary_no_auth(url)
            except Exception as e:
                logger.warning(
                    "Recording download failed for %s: %s",
                    rec_id or "unknown",
                    e,
                )
        else:
            url = r.get("downloadUrl") or r.get("playbackUrl")
            if not host_email:
                logger.warning(
                    "Recording %s missing hostEmail, cannot get direct download URL",
                    rec_id or "unknown",
                )
        filename = r.get("topic") or r.get("title") or f"recording_{len(recordings)}.mp4"
        if not filename.endswith((".mp4", ".webm", ".m4a")):
            filename = f"{filename}.mp4"
        recordings.append(
            RecordingAsset(
                filename=filename,
                content=content,
                download_url=url,
                mime_type=_normalize_mime_type(r.get("format")),
            )
        )
    return recordings


def _fetch_transcript(
    client: WebexClient,
    instance_id: str,
    progress: Callable[[str], None],
) -> tuple[str | None, str | None]:
    """Fetch transcript. Returns (transcript_text, transcript_vtt)."""
    transcript_text: str | None = None
    transcript_vtt: str | None = None
    progress("  Fetching transcript...")
    try:
        transcripts = client.list_meeting_transcripts(instance_id)
        if transcripts:
            t = transcripts[0]
            if t.get("txtDownloadLink"):
                raw = client.download_transcript_from_item(t)
                if raw.strip():
                    if "WEBVTT" in raw or raw.strip().startswith("00:"):
                        transcript_vtt = raw
                    else:
                        transcript_text = raw
    except Exception:
        pass
    return transcript_text, transcript_vtt


def _fetch_summary(
    client: WebexClient,
    instance_id: str,
    progress: Callable[[str], None],
) -> tuple[str | None, dict | None, list[ActionItem]]:
    """Fetch summary and action items. Returns (summary_text, summary_structured, action_items)."""
    summary_text: str | None = None
    summary_structured: dict | None = None
    action_items: list[ActionItem] = []
    progress("  Fetching summary...")
    try:
        summary_resp = client.get_meeting_summary_by_meeting_id(instance_id)
        if summary_resp:
            resp_dict = summary_resp if isinstance(summary_resp, dict) else {}
            parsed_summary = (
                resp_dict.get("summary")
                or resp_dict.get("text")
                or resp_dict.get("summaryReport", {}).get("summary")
                or ""
            )
            if isinstance(parsed_summary, dict):
                parsed_summary = parsed_summary.get("text") or parsed_summary.get("summary") or ""
            action_items = _action_items_from_summary_response(resp_dict)
            if resp_dict:
                summary_structured = resp_dict
            if parsed_summary:
                summary_text = parsed_summary
    except Exception:
        pass
    return summary_text or None, summary_structured, action_items


def collect_meeting_data(
    client: WebexClient,
    meeting_id: str,
    progress_callback: Callable[[str], None] | None = None,
) -> MeetingData:
    """Fetch all meeting data from Webex and return normalized MeetingData.

    Uses Meeting Summaries API (get summary by meeting ID) for summary and action items.
    Meeting Summaries, recordings, and transcripts require the full instance ID
    (e.g. meetingId with _I_<number> suffix). We use the id from get_meeting() when present.
    Only fetches what is currently available; no polling or retries.

    Args:
        client: Webex API client.
        meeting_id: Webex meeting instance ID.
        progress_callback: Optional callback for progress messages. If None, uses stderr.
    """
    progress = progress_callback or _default_progress
    progress("  Getting meeting details...")
    meeting = client.get_meeting(meeting_id)
    # Use full instance ID from response for summaries/recordings/transcripts APIs
    instance_id = meeting.get("id") or meeting_id
    title = meeting.get("title") or f"Meeting {meeting_id}"
    progress(f"  Meeting: {title}")
    start = _parse_iso(meeting.get("start")) or _parse_iso(meeting.get("scheduledStart"))
    end = _parse_iso(meeting.get("end")) or _parse_iso(meeting.get("scheduledEnd"))

    participants: list[dict] = []
    try:
        progress("  Fetching participants...")
        participants = client.list_meeting_participants(instance_id)
    except Exception:
        pass

    recordings = _fetch_recordings(client, instance_id, progress)
    transcript_text, transcript_vtt = _fetch_transcript(client, instance_id, progress)
    summary_text, summary_structured, action_items = _fetch_summary(client, instance_id, progress)

    progress("  Fetch complete.")
    return MeetingData(
        meeting_id=meeting_id,
        title=title,
        start_time=start,
        end_time=end,
        recordings=recordings,
        transcript_text=transcript_text,
        transcript_vtt=transcript_vtt,
        summary=summary_text or None,
        summary_structured=summary_structured,
        action_items=action_items,
        participants=participants,
        raw_metadata=meeting,
    )


def export_meeting(
    meeting_id: str,
    client: WebexClient | None = None,
    exporter: MeetingExporter | None = None,
    progress_callback: Callable[[str], None] | None = None,
) -> str:
    """Export a single meeting. Callable from CLI or future webhook handler.

    Args:
        meeting_id: Webex meeting instance ID.
        client: Optional Webex client. If None, creates one from WEBEX_ACCESS_TOKEN.
        exporter: Optional exporter. If None, uses get_exporter() from env config.
        progress_callback: Optional callback for progress. If None, uses stderr.
            Pass a no-op (e.g. lambda x: None) for silent operation (e.g. webhooks).

    Returns:
        Export result string (e.g. path or Drive URL).
    """
    client = client or WebexClient(access_token=os.environ["WEBEX_ACCESS_TOKEN"])
    exporter = exporter or get_exporter()
    meeting_data = collect_meeting_data(client, meeting_id, progress_callback=progress_callback)
    return exporter.write(meeting_data)
