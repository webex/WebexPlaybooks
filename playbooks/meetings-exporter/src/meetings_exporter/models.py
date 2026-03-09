"""Normalized meeting data model produced by ingestion and consumed by exporters."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class RecordingAsset:
    """A single recording file or stream."""

    filename: str
    content: bytes | None = None
    download_url: str | None = None
    mime_type: str = "application/octet-stream"


@dataclass
class ActionItem:
    """A single action item from meeting summary."""

    text: str
    assignee: str | None = None
    due: str | None = None
    raw: dict[str, Any] | None = None


@dataclass
class MeetingData:
    """Normalized meeting data from Webex (ingestion output). Backend-agnostic."""

    meeting_id: str
    title: str
    start_time: datetime | None = None
    end_time: datetime | None = None
    recordings: list[RecordingAsset] = field(default_factory=list)
    transcript_text: str | None = None
    transcript_vtt: str | None = None
    summary: str | None = None
    summary_structured: dict[str, Any] | None = None
    action_items: list[ActionItem] = field(default_factory=list)
    participants: list[dict[str, Any]] = field(default_factory=list)
    raw_metadata: dict[str, Any] | None = None
