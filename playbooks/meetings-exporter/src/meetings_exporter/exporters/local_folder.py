"""Local folder exporter: write meeting assets to a directory on disk."""

from __future__ import annotations

import json
from pathlib import Path

from meetings_exporter.exporters.base import MeetingExporter
from meetings_exporter.meeting_formatter import (
    folder_name,
    meeting_details_text,
    safe_filename,
    summary_txt_content,
)
from meetings_exporter.models import MeetingData


class LocalFolderExporter(MeetingExporter):
    """Export meeting data to a local directory (same layout as cloud export)."""

    def __init__(self, root_path: str) -> None:
        self.root_path = Path(root_path).resolve()
        self.root_path.mkdir(parents=True, exist_ok=True)

    def write(self, meeting_data: MeetingData) -> str:
        """Create a meeting subfolder and write recordings, transcript, summary, action items."""
        dir_name = folder_name(meeting_data)
        meeting_dir = self.root_path / dir_name
        meeting_dir.mkdir(parents=True, exist_ok=True)

        # Meeting details (title, date, time, participants, etc.)
        (meeting_dir / "meeting_details.txt").write_text(
            meeting_details_text(meeting_data), encoding="utf-8"
        )

        # Recordings
        for i, rec in enumerate(meeting_data.recordings):
            if rec.content is None:
                continue
            name = safe_filename(rec.filename) or f"recording_{i}"
            if not any(name.endswith(ext) for ext in (".mp4", ".webm", ".m4a", ".mp3")):
                name = f"{name}.mp4"
            path = meeting_dir / name
            path.write_bytes(rec.content)

        # Transcript
        if meeting_data.transcript_vtt:
            (meeting_dir / "transcript.vtt").write_text(
                meeting_data.transcript_vtt, encoding="utf-8"
            )
        elif meeting_data.transcript_text:
            (meeting_dir / "transcript.txt").write_text(
                meeting_data.transcript_text, encoding="utf-8"
            )

        # Summary and action items
        summary_content = summary_txt_content(meeting_data)
        if summary_content:
            (meeting_dir / "summary.txt").write_text(summary_content, encoding="utf-8")

        if meeting_data.summary_structured:
            (meeting_dir / "summary.json").write_text(
                json.dumps(meeting_data.summary_structured, indent=2),
                encoding="utf-8",
            )

        return str(meeting_dir)
