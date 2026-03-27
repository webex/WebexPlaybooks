# backend/app.py
#
# Webex Playbook: Multi-User Embedded App Lobby
# Source: https://github.com/WebexSamples/ea-lobby-app
#
# WHAT THIS DOES:
#   Creates a Flask + Flask-SocketIO server that manages named lobbies for use
#   inside Webex Meetings via the Webex Embedded Apps SDK. Participants join a
#   lobby room, signal readiness, and update display names in real time.
#
# WHAT THIS DOES NOT DO:
#   - Persist lobby state across server restarts (in-memory only)
#   - Authenticate or authorize lobby participants
#   - Support horizontal scaling without an external message broker (e.g. Redis)
#   - Rate limit or monitor requests
#
# REQUIRED ENVIRONMENT VARIABLES (copy src/env.template to .env):
#   FRONTEND_URL — The full HTTPS URL of the deployed React frontend
#                  (used to generate shareable lobby URLs)
#                  Example: https://yourdomain.com
#                  Default for local dev: http://localhost:5173
#
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from .config import Config
from .routes.lobby import lobby_bp
from .sockets.lobby import register_lobby_socket_handlers  # Import our lobby socket handlers

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Register REST API routes
app.register_blueprint(lobby_bp, url_prefix='/api')

# Register lobby-specific socket handlers
register_lobby_socket_handlers(socketio)

if __name__ == '__main__':
    socketio.run(app, debug=True)
