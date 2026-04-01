"""
Webhook-to-card sample: receive JSON on POST /webhook, build an Adaptive Card, post to Webex.

Required environment variables (see env.template):
  WEBEX_BOT_TOKEN — Bot access token from developer.webex.com
  WEBEX_ROOM_ID   — Target space (room) ID; bot must be a member

Optional:
  PORT — Listen port (default 5000)

This sample does NOT: authenticate inbound webhooks, sanitize image/video URLs,
persist state, or implement retries or production logging. Use only as a learning
scaffold.
"""
import os
import requests
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 256 * 1024

API_URL = "https://webexapis.com/v1/messages"


def _webex_headers():
    token = os.getenv("WEBEX_BOT_TOKEN")
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}" if token else "",
    }


@app.route("/webhook", methods=["POST"])
def handle_webhook():
    token = os.getenv("WEBEX_BOT_TOKEN")
    room_id = os.getenv("WEBEX_ROOM_ID")
    if not token or not room_id:
        return jsonify(
            {"error": "Missing WEBEX_BOT_TOKEN or WEBEX_ROOM_ID in environment"}
        ), 503

    webhook = request.get_json(silent=True)
    if not webhook or "data" not in webhook:
        return jsonify({"error": "Invalid payload: expected JSON with a data object"}), 400

    data = webhook["data"]
    required = (
        "rocket_name",
        "payload_type",
        "payload_description",
        "launch_time",
        "launch_site",
        "mission_patch",
        "video_stream",
    )
    missing = [k for k in required if k not in data]
    if missing:
        return jsonify({"error": "Missing fields in data", "missing": missing}), 400

    rocket_name = data["rocket_name"]
    payload_type = data["payload_type"]
    payload_description = data["payload_description"]
    launch_time = data["launch_time"]
    launch_site = data["launch_site"]
    mission_patch = data["mission_patch"]
    video_stream = data["video_stream"]

    card_payload = {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.3",
        "body": [
            {
                "type": "TextBlock",
                "text": "Rocket Launch Successful!",
                "weight": "Bolder",
                "size": "Large",
                "color": "Accent",
                "wrap": True,
            },
            {
                "type": "ColumnSet",
                "columns": [
                    {
                        "type": "Column",
                        "width": "auto",
                        "items": [
                            {
                                "type": "Image",
                                "url": mission_patch,
                                "size": "Small",
                                "style": "Person",
                            }
                        ],
                    },
                    {
                        "type": "Column",
                        "width": "stretch",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": "Rocket Launch Details",
                                "weight": "Bolder",
                                "wrap": True,
                            },
                            {
                                "type": "FactSet",
                                "facts": [
                                    {"title": "Rocket Name", "value": rocket_name},
                                    {"title": "Payload Type", "value": payload_type},
                                    {
                                        "title": "Payload Description",
                                        "value": payload_description,
                                    },
                                    {"title": "Launch Time", "value": launch_time},
                                    {"title": "Launch Site", "value": launch_site},
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
        "actions": [
            {
                "type": "Action.OpenUrl",
                "title": "Watch the Launch",
                "url": video_stream,
            }
        ],
    }

    message_payload = {
        "roomId": room_id,
        "attachments": [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": card_payload,
            }
        ],
        "text": "New Rocket Launch Detected",
    }

    response = requests.post(API_URL, headers=_webex_headers(), json=message_payload, timeout=30)

    if response.ok:
        return jsonify({"success": True}), 200
    return jsonify({"success": False, "message": response.text}), response.status_code


@app.route("/status")
def status():
    return render_template("status.html", message="The server is up and running!")


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
