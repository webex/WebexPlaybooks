# Upstream sample notes

This Playbook vendors code adapted from [WebexSamples/webhook-to-card](https://github.com/WebexSamples/webhook-to-card).

## Layout in the upstream repo

- `app.py` — Flask routes `/webhook` and `/status`
- `requirements.txt` — Python dependencies
- `templates/status.html` — Simple status line for `/status`
- `webhook-payload.json` — Example POST body for local testing
- `adaptive_card.json` — Static example of the card shape (the app builds the card in code)
- `.env.example` — Environment variable names

## Sample image URLs in `webhook-payload.json`

The upstream sample uses `https://example.com/...` for `mission_patch` and `video_stream`. Those hosts do not serve real card assets; Webex returns **Unable to retrieve content** when it cannot fetch the **Image** URL. This Playbook’s `webhook-payload.json` uses public HTTPS URLs that work for local testing.

## Environment variable name

Upstream uses **`WEBEX_BOT_TOKEN`** consistently in `.env.example` and `app.py`. Some narrative docs elsewhere may mention `WEBEX_ACCESS_TOKEN`; this Playbook standardizes on **`WEBEX_BOT_TOKEN`** (see `src/env.template`).

## License

The upstream project uses the **Cisco Sample Code License**. See the upstream repository for the full text.
