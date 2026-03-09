"""Abstract exporter interface: all backends implement write(MeetingData)."""

from abc import ABC, abstractmethod

from meetings_exporter.models import MeetingData


class MeetingExporter(ABC):
    """Protocol for exporting meeting data to a destination (Drive, OneDrive, Dropbox)."""

    @abstractmethod
    def write(self, meeting_data: MeetingData) -> str:
        """Write meeting data to the backend. Returns destination path or resource ID."""
        ...
