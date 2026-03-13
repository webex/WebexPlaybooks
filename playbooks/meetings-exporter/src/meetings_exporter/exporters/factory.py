"""Factory to create the configured exporter.

Uses a registry so new backends can be added without modifying this file (OCP).
"""

from __future__ import annotations

import os
from collections.abc import Callable
from typing import Any

from meetings_exporter.exporters.base import MeetingExporter
from meetings_exporter.exporters.google_drive import GoogleDriveExporter
from meetings_exporter.exporters.local_folder import LocalFolderExporter

# Registry: backend name -> factory callable that returns MeetingExporter.
# Add new backends by registering a factory; no need to modify get_exporter (OCP).
_EXPORTER_REGISTRY: dict[str, Callable[..., MeetingExporter]] = {}


def _create_local(**kwargs: Any) -> MeetingExporter:
    path = kwargs.get("path") or os.environ.get("LOCAL_EXPORT_PATH", "")
    if not path:
        raise ValueError("Local export requires path (--output-dir or LOCAL_EXPORT_PATH)")
    return LocalFolderExporter(root_path=path)


def _create_google_drive(**kwargs: Any) -> MeetingExporter:
    creds_path = kwargs.get("credentials_path") or os.environ.get("GOOGLE_CREDENTIALS_FILE", "")
    token_path = kwargs.get("token_path") or os.environ.get("GOOGLE_TOKEN_FILE", "token.json")
    return GoogleDriveExporter(
        credentials_path=os.path.expanduser(creds_path) if creds_path else "",
        token_path=os.path.expanduser(token_path),
        root_folder_id=kwargs.get("root_folder_id") or os.environ.get("GOOGLE_DRIVE_FOLDER_ID"),
    )


# Register built-in backends
_EXPORTER_REGISTRY["local"] = _create_local
_EXPORTER_REGISTRY["google_drive"] = _create_google_drive


def get_exporter(backend: str | None = None, **kwargs: Any) -> MeetingExporter:
    """Return the configured exporter. Backend is looked up in the registry."""
    backend = backend or os.environ.get("EXPORT_BACKEND", "google_drive")
    if backend not in _EXPORTER_REGISTRY:
        raise ValueError(
            f"Unknown export backend: {backend}. Available: {', '.join(sorted(_EXPORTER_REGISTRY))}"
        )
    return _EXPORTER_REGISTRY[backend](**kwargs)
