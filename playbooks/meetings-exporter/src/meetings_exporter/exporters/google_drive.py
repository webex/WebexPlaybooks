"""Google Drive exporter: upload MeetingData to a folder per meeting."""

from __future__ import annotations

import io
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

from meetings_exporter.exporters.base import MeetingExporter
from meetings_exporter.meeting_formatter import (
    folder_name,
    meeting_details_text,
    safe_filename,
    summary_txt_content,
)
from meetings_exporter.models import MeetingData

SCOPES = ["https://www.googleapis.com/auth/drive.file"]


class GoogleDriveExporter(MeetingExporter):
    """Export meeting data to Google Drive (folder per meeting, Gemini-friendly layout)."""

    def __init__(
        self,
        credentials_path: str,
        token_path: str = "token.json",
        root_folder_id: str | None = None,
    ) -> None:
        self.credentials_path = credentials_path
        self.token_path = token_path
        self.root_folder_id = root_folder_id
        self._service = None

    def _get_service(self):
        """Build Drive v3 service with OAuth2 credentials (refresh if needed)."""
        if self._service is not None:
            return self._service
        creds = None
        if Path(self.token_path).exists():
            creds = Credentials.from_authorized_user_file(self.token_path, SCOPES)
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(self.credentials_path, SCOPES)
                creds = flow.run_local_server(port=0)
            with open(self.token_path, "w") as f:
                f.write(creds.to_json())
        self._service = build("drive", "v3", credentials=creds)
        return self._service

    def write(self, meeting_data: MeetingData) -> str:
        """Create a folder and upload recordings, transcript, summary, action items."""
        service = self._get_service()
        dir_name = folder_name(meeting_data)
        parents = [self.root_folder_id] if self.root_folder_id else []
        folder_metadata = {
            "name": dir_name,
            "mimeType": "application/vnd.google-apps.folder",
        }
        if parents:
            folder_metadata["parents"] = parents
        folder = service.files().create(body=folder_metadata, fields="id, name").execute()
        folder_id = folder["id"]

        # Meeting details (title, date, time, participants, etc.)
        details_text = meeting_details_text(meeting_data)
        details_meta = {
            "name": "meeting_details.txt",
            "parents": [folder_id],
        }
        service.files().create(
            body=details_meta,
            media_body=MediaIoBaseUpload(
                io.BytesIO(details_text.encode("utf-8")),
                mimetype="text/plain",
                resumable=False,
            ),
            fields="id",
        ).execute()

        # Upload recordings (bytes or skip if URL-only and no content)
        for i, rec in enumerate(meeting_data.recordings):
            if rec.content is None:
                continue
            name = safe_filename(rec.filename) or f"recording_{i}"
            if not any(name.endswith(ext) for ext in (".mp4", ".webm", ".m4a", ".mp3")):
                name = f"{name}.mp4"
            media = MediaIoBaseUpload(
                io.BytesIO(rec.content),
                mimetype=rec.mime_type,
                resumable=True,
            )
            file_metadata = {"name": name, "parents": [folder_id]}
            service.files().create(body=file_metadata, media_body=media).execute()

        # Upload transcript (prefer VTT, else text)
        if meeting_data.transcript_vtt:
            self._upload_string(
                service,
                folder_id,
                "transcript.vtt",
                meeting_data.transcript_vtt,
                "text/vtt",
            )
        elif meeting_data.transcript_text:
            self._upload_string(
                service,
                folder_id,
                "transcript.txt",
                meeting_data.transcript_text,
                "text/plain",
            )

        # Summary and action items
        summary_content = summary_txt_content(meeting_data)
        if summary_content:
            self._upload_string(
                service,
                folder_id,
                "summary.txt",
                summary_content,
                "text/plain",
            )

        if meeting_data.summary_structured:
            import json

            self._upload_string(
                service,
                folder_id,
                "summary.json",
                json.dumps(meeting_data.summary_structured, indent=2),
                "application/json",
            )

        return f"https://drive.google.com/drive/folders/{folder_id}"

    def _upload_string(
        self,
        service,
        folder_id: str,
        filename: str,
        content: str,
        mime_type: str = "text/plain",
    ) -> None:
        """Upload a string as a file to the given folder."""
        media = MediaIoBaseUpload(
            io.BytesIO(content.encode("utf-8")),
            mimetype=mime_type,
            resumable=False,
        )
        file_metadata = {"name": filename, "parents": [folder_id]}
        service.files().create(body=file_metadata, media_body=media).execute()
