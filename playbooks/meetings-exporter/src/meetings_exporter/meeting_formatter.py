"""Shared formatting for meeting data (folder names, meeting details, summary text).

Used by exporters so they focus on I/O; formatting logic lives here (SRP).
"""

from __future__ import annotations

from meetings_exporter.models import ActionItem, MeetingData


def safe_filename(name: str, max_len: int = 200) -> str:
    """Sanitize for use as file or folder name (no path traversal)."""
    safe = "".join(c for c in name if c.isalnum() or c in " ._-()")
    return safe.strip()[:max_len] or "unnamed"


def folder_name(data: MeetingData) -> str:
    """Generate folder name with date-time prefix so folders sort by start time."""
    title = safe_filename(data.title)
    if data.start_time:
        prefix = data.start_time.strftime("%Y-%m-%d %H-%M")
        return f"{prefix} - {title}"
    return f"Webex - {title} - {data.meeting_id}"


def meeting_details_text(data: MeetingData) -> str:
    """Build meeting_details.txt content (title, date, host, participants, etc.)."""
    lines = [
        f"Title: {data.title}",
        f"Meeting ID: {data.meeting_id}",
    ]
    if data.start_time:
        lines.append(f"Date: {data.start_time.strftime('%Y-%m-%d')}")
        lines.append(f"Start: {data.start_time.strftime('%H:%M')}")
    if data.end_time:
        lines.append(f"End: {data.end_time.strftime('%H:%M')}")
    meta = data.raw_metadata or {}
    host = meta.get("hostEmail") or meta.get("host")
    if host:
        lines.append(f"Host: {host}")
    agenda = meta.get("agenda")
    if agenda:
        lines.append(f"Agenda: {agenda}")
    if data.participants:
        lines.append("")
        lines.append("Participants:")
        for p in data.participants:
            name = p.get("displayName") or p.get("name") or p.get("email") or ""
            email = p.get("email", "")
            if name and email and name != email:
                lines.append(f"  - {name} ({email})")
            elif name or email:
                lines.append(f"  - {name or email}")
    return "\n".join(lines)


def summary_txt_content(data: MeetingData) -> str | None:
    """Build summary.txt content (summary + action items). Returns None if empty."""
    parts = []
    if data.summary:
        parts.append(data.summary)
    if data.action_items:
        parts.append("## Action Items")
        for item in data.action_items:
            line = _action_item_line(item)
            parts.append(line)
    return "\n".join(parts) if parts else None


def _action_item_line(item: ActionItem) -> str:
    """Format a single action item for summary.txt."""
    line = f"- {item.text}"
    if item.assignee:
        line += f" (assignee: {item.assignee})"
    if item.due:
        line += f" (due: {item.due})"
    return line
