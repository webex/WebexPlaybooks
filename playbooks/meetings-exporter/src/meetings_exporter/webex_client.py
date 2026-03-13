"""Webex API client: meetings, recordings, transcripts, and Meeting Summaries.

Summary data is fetched via the Meeting Summaries API (get summary by meeting ID):
https://developer.webex.com/meeting/docs/api/v1/meeting-summaries/get-summary-by-meeting-id
"""

from __future__ import annotations

from urllib.parse import urljoin

import requests

WEBEX_BASE = "https://webexapis.com/v1"
# Meeting Summaries API: get summary by meeting ID (not the Summary Report API)
MEETING_SUMMARIES_PATH = "meetingSummaries"
# List meetings: use meetingType=meeting for instances; API defaults to series.
# Only individual instances support transcripts and summaries.
MEETING_TYPE_INSTANCE = "meeting"


class WebexAPIError(Exception):
    """Webex API returned an error."""

    def __init__(self, message: str, status_code: int | None = None, body: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.body = body


class WebexClient:
    """Low-level client for Webex REST APIs (meetings, recordings, transcripts, summaries)."""

    def __init__(self, access_token: str, base_url: str = WEBEX_BASE) -> None:
        self.access_token = access_token
        self.base_url = base_url.rstrip("/")
        self._session = requests.Session()
        self._session.headers["Authorization"] = f"Bearer {access_token}"
        self._session.headers["Content-Type"] = "application/json"

    def _get(self, path: str, params: dict | None = None) -> dict:
        url = f"{self.base_url}/{path.lstrip('/')}"
        r = self._session.get(url, params=params or {}, timeout=30)
        if r.status_code >= 400:
            raise WebexAPIError(
                f"GET {path} failed: {r.status_code}",
                status_code=r.status_code,
                body=r.text,
            )
        return r.json() if r.content else {}

    def _get_binary(self, url: str) -> bytes:
        """Download binary. Follow redirects with auth (requests strips it on cross-host)."""
        headers = {
            "Authorization": self._session.headers["Authorization"],
            "Accept": "*/*",
        }
        r = requests.get(url, headers=headers, timeout=120, allow_redirects=False)
        while r.status_code in (301, 302, 303, 307, 308):
            location = r.headers.get("Location")
            if not location:
                break
            base = url.rstrip("/") + "/"
            url = location if location.startswith("http") else urljoin(base, location)
            r = requests.get(url, headers=headers, timeout=120, allow_redirects=False)
        r.raise_for_status()
        return r.content

    def _get_binary_no_auth(self, url: str) -> bytes:
        """Download binary from pre-signed URL (e.g. Webex recording CDN).

        Do NOT send Authorization header: pre-signed URLs are valid without it.
        Sending Bearer token causes the CDN to return an HTML login page instead of the file.
        Ref: WebexSamples/WebexRecordingsDownloader uses plain requests.get(link).
        """
        r = requests.get(url, headers={"Accept": "*/*"}, timeout=120, allow_redirects=True)
        r.raise_for_status()
        return r.content

    def list_meetings(
        self,
        from_date: str | None = None,
        to_date: str | None = None,
        max: int = 50,
        meeting_type: str = MEETING_TYPE_INSTANCE,
    ) -> list[dict]:
        """List meetings (past when from/to provided).

        Uses GET https://webexapis.com/v1/meetings?meetingType=meeting so that only
        individual meeting instances are returned. The API defaults to meeting series
        if meetingType is omitted; series do not support transcripts or summaries.
        """
        params = {"max": max, "meetingType": meeting_type}
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date
        data = self._get("meetings", params=params)
        return data.get("items", [])

    def get_meeting(self, meeting_id: str) -> dict:
        """Get a single meeting by ID."""
        return self._get(f"meetings/{meeting_id}")

    def list_meeting_participants(self, meeting_id: str) -> list[dict]:
        """List participants for a meeting. GET meetingParticipants?meetingId=..."""
        data = self._get("meetingParticipants", params={"meetingId": meeting_id})
        return data.get("items", [])

    def list_recordings(self, meeting_id: str | None = None) -> list[dict]:
        """List recordings, optionally for a meeting."""
        params = {}
        if meeting_id:
            params["meetingId"] = meeting_id
        data = self._get("recordings", params=params)
        return data.get("items", [])

    def get_recording_details(self, recording_id: str, host_email: str) -> dict:
        """Get recording details including direct download URL.

        The list endpoint returns a site URL for manual download; this endpoint
        returns the actual downloadUrl for direct binary download.
        Ref: https://developer.webex.com/meeting/docs/api/v1/recordings/get-recording-details
        """
        params = {"hostEmail": host_email}
        return self._get(f"recordings/{recording_id}", params=params)

    def get_meeting_summary_by_meeting_id(self, meeting_id: str) -> dict:
        """Get summary for a meeting using the Meeting Summaries API (get summary by meeting ID).

        Ref: https://developer.webex.com/meeting/docs/api/v1/meeting-summaries/get-summary-by-meeting-id
        """
        data = self._get(MEETING_SUMMARIES_PATH, params={"meetingId": meeting_id})
        return data

    def list_meeting_transcripts(self, meeting_id: str) -> list[dict]:
        """List transcripts for a meeting. GET meetingTranscripts?meetingId=..."""
        data = self._get("meetingTranscripts", params={"meetingId": meeting_id})
        return data.get("items", [])

    def download_transcript_from_item(self, transcript_item: dict) -> str:
        """Download transcript content using txtDownloadLink from a meetingTranscripts item."""
        link = transcript_item.get("txtDownloadLink")
        if not link:
            raise ValueError("Transcript item has no txtDownloadLink")
        return self._get_binary(link).decode("utf-8", errors="replace")
