# backend/routes/lobby.py
from flask import Blueprint, request, jsonify
import uuid
from ..config import Config

lobby_bp = Blueprint('lobby_bp', __name__)

# In-memory store for lobbies.
# Structure:
# {
#   lobby_id: {
#       'host': <host_user_id>,
#       'lobby_name': <name>,
#       'participants': [ { 'id': <uuid>, 'display_name': <name>, 'ready': <bool> }, ... ]
#   }
# }
lobbies = {}

@lobby_bp.route('/lobby', methods=['POST'])
def create_lobby():
    """Creates a new lobby given a host_id and optional lobby_name."""
    data = request.json
    host_id = data.get('host_id')
    lobby_name = data.get('lobby_name', 'Default Lobby')
    
    if not host_id:
        return jsonify({'error': 'host_id is required'}), 400
    
    lobby_id = str(uuid.uuid4())
    
    # Store the host as a participant with ready state defaulted to False
    lobbies[lobby_id] = {
        'host': host_id,
        'lobby_name': lobby_name,
        'participants': [{'id': host_id, 'display_name': data.get('host_display_name', 'Host'), 'ready': False}]
    }
    
    # Use Config.FRONTEND_URL to generate the lobby link
    lobby_url = f"{Config.FRONTEND_URL}/lobby/{lobby_id}"

    return jsonify({'lobby_id': lobby_id, 'lobby_url': lobby_url, 'lobby_name': lobby_name}), 201

@lobby_bp.route('/lobby/<lobby_id>', methods=['GET'])
def get_lobby(lobby_id):
    """Returns the lobby information for the given lobby_id."""
    lobby = lobbies.get(lobby_id)
    if not lobby:
        return jsonify({'error': 'Lobby not found'}), 404
    return jsonify(lobby), 200

def get_lobbies():
    """Utility function to access the in-memory lobby store."""
    return lobbies
