"""CLI: list meetings, export meeting data to configured backend or local folder."""

from __future__ import annotations

import argparse
import os
import sys

from dotenv import load_dotenv

from meetings_exporter.exporters.factory import get_exporter
from meetings_exporter.exporters.local_folder import LocalFolderExporter
from meetings_exporter.ingestion import export_meeting
from meetings_exporter.webex_client import WebexClient
from meetings_exporter.webhook_client import (
    create_meeting_webhooks,
    delete_webhook,
    list_webhooks,
)
from meetings_exporter.webhook_server import run_webhook_server


def main() -> None:
    """Entry point for the meetings-exporter script."""
    load_dotenv()
    parser = argparse.ArgumentParser(
        description="Export Webex meeting data to cloud storage or local folder."
    )
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # list: individual instances only (required for summaries/recordings/transcripts)
    list_parser = subparsers.add_parser(
        "list",
        help="List recent/past meetings (individual instances only by default)",
    )
    list_parser.add_argument("--from", dest="from_date", help="From date (YYYY-MM-DD)")
    list_parser.add_argument("--to", dest="to_date", help="To date (YYYY-MM-DD)")
    list_parser.add_argument("--max", type=int, default=20, help="Max meetings (default 20)")
    list_parser.add_argument(
        "--meeting-type",
        default="meeting",
        help="'meeting' for instances (default), 'series' for series",
    )

    # export: one meeting by ID, or all meetings in a date range
    export_parser = subparsers.add_parser(
        "export",
        help="Export meeting(s). Pass meeting ID or use --from/--to for date range.",
    )
    export_parser.add_argument(
        "meeting_id",
        nargs="?",
        default=None,
        help="Meeting ID to export. Omit and use --from/--to for date range.",
    )
    export_parser.add_argument(
        "--from",
        dest="from_date",
        metavar="YYYY-MM-DD",
        help="Export meetings from this date (use with --to for range export)",
    )
    export_parser.add_argument(
        "--to",
        dest="to_date",
        metavar="YYYY-MM-DD",
        help="Export meetings until this date (use with --from for range export)",
    )
    export_parser.add_argument(
        "--max",
        type=int,
        default=100,
        help="Max meetings to export when using --from/--to (default 100)",
    )
    export_parser.add_argument(
        "--output-dir",
        metavar="PATH",
        help="Write all meeting assets to this directory instead of the configured cloud backend",
    )

    # webhook: run server or register/unregister webhooks
    webhook_parser = subparsers.add_parser(
        "webhook",
        help="Webhook server and registration for meeting notifications",
    )
    webhook_parser.add_argument("--host", default="0.0.0.0", help="Host to bind (default 0.0.0.0)")
    webhook_parser.add_argument("--port", type=int, default=8080, help="Port (default 8080)")
    webhook_sub = webhook_parser.add_subparsers(dest="webhook_cmd", help="Webhook commands")
    webhook_sub.add_parser("serve", help="Start webhook HTTP server (default)")
    webhook_parser.set_defaults(webhook_cmd="serve")
    webhook_register = webhook_sub.add_parser("register", help="Register webhooks with Webex")
    webhook_register.add_argument(
        "--url",
        required=True,
        metavar="URL",
        help="Public URL for webhooks (e.g. https://abc.ngrok-free.app)",
    )
    webhook_sub.add_parser(
        "unregister",
        help="Remove meetings-exporter webhooks from Webex",
    )

    args = parser.parse_args()

    if args.command == "list":
        token = os.environ.get("WEBEX_ACCESS_TOKEN")
        if not token:
            print("Error: WEBEX_ACCESS_TOKEN not set", file=sys.stderr)
            sys.exit(1)
        client = WebexClient(access_token=token)
        meetings = client.list_meetings(
            from_date=args.from_date,
            to_date=args.to_date,
            max=args.max,
            meeting_type=args.meeting_type,
        )
        for m in meetings:
            mid = m.get("id", "")
            title = m.get("title", "(no title)")
            start = m.get("start") or m.get("scheduledStart") or ""
            print(f"  {mid}\t{start}\t{title}")
        return

    if args.command == "export":
        token = os.environ.get("WEBEX_ACCESS_TOKEN")
        if not token:
            print("Error: WEBEX_ACCESS_TOKEN not set", file=sys.stderr)
            sys.exit(1)
        if args.meeting_id is None and not (args.from_date or args.to_date):
            print(
                "Error: Provide meeting ID or use --from and/or --to for date range.",
                file=sys.stderr,
            )
            sys.exit(1)
        client = WebexClient(access_token=token)
        exporter = (
            LocalFolderExporter(root_path=args.output_dir) if args.output_dir else get_exporter()
        )
        out_dir = args.output_dir or "(configured backend)"

        if args.meeting_id:
            # Single meeting export
            print(f"Fetching meeting data for {args.meeting_id}...", file=sys.stderr)
            result = export_meeting(args.meeting_id, client=client, exporter=exporter)
            print(f"Exported: {result}")
        else:
            # Date range: list meetings then export each
            meetings = client.list_meetings(
                from_date=args.from_date,
                to_date=args.to_date,
                max=args.max,
                meeting_type="meeting",
            )
            if not meetings:
                print("No meetings found in the given date range.", file=sys.stderr)
                return
            print(
                f"Exporting {len(meetings)} meeting(s) to {out_dir}...",
                file=sys.stderr,
            )
            for i, m in enumerate(meetings):
                mid = m.get("id", "")
                title = m.get("title", "(no title)")
                print(f"[{i + 1}/{len(meetings)}] {title} ({mid})", file=sys.stderr)
                try:
                    result = export_meeting(mid, client=client, exporter=exporter)
                    print(f"  Exported: {result}")
                except Exception as e:
                    print(f"  Error: {e}", file=sys.stderr)
        return

    if args.command == "webhook":
        if args.webhook_cmd == "serve":
            run_webhook_server(host=args.host, port=args.port)
        elif args.webhook_cmd == "register":
            token = os.environ.get("WEBEX_ACCESS_TOKEN")
            if not token:
                print("Error: WEBEX_ACCESS_TOKEN not set", file=sys.stderr)
                sys.exit(1)
            secret = os.environ.get("WEBEX_WEBHOOK_SECRET", "").strip() or None
            created = create_meeting_webhooks(args.url, token, secret)
            print(f"Registered {len(created)} webhook(s) at {args.url}/webhook")
        elif args.webhook_cmd == "unregister":
            token = os.environ.get("WEBEX_ACCESS_TOKEN")
            if not token:
                print("Error: WEBEX_ACCESS_TOKEN not set", file=sys.stderr)
                sys.exit(1)
            webhooks = list_webhooks(token)
            ours = [w for w in webhooks if (w.get("name") or "").startswith("meetings-exporter")]
            for w in ours:
                delete_webhook(w["id"], token)
                print(f"Deleted webhook: {w.get('name', w['id'])}")
            if not ours:
                print("No meetings-exporter webhooks found.")
        else:
            webhook_parser.print_help()
        return

    parser.print_help()
    sys.exit(0)


if __name__ == "__main__":
    main()
