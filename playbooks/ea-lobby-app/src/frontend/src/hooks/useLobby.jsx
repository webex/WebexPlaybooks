import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import api from '../utils/api';
import { SOCKET_EVENTS, ROUTES } from '../constants';

const socket = io(import.meta.env.VITE_SOCKET_URL);

/**
 * Custom hook to manage lobby state, user actions, and socket communication.
 *
 * @param {string} lobbyId - The unique ID of the lobby.
 * @param {Object} [initialUser] - The user object, if available.
 * @returns {Object} Lobby state and actions.
 */
const useLobby = (lobbyId, initialUser) => {
  const [lobby, setLobby] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [user, setUser] = useState(() => {
    const savedUser = JSON.parse(localStorage.getItem(`lobbyUser-${lobbyId}`));
    return savedUser || initialUser || null;
  });

  const lobbyUrl = `${window.location.origin}${ROUTES.LOBBY_WITH_ID(lobbyId)}`;

  useEffect(() => {
    if (!lobbyId) return;

    api
      .getLobby(lobbyId)
      .then((data) => {
        setLobby(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [lobbyId]);

  useEffect(() => {
    if (!joined) return;

    socket.on(SOCKET_EVENTS.LOBBY_UPDATE, (data) => {
      setLobby(data);
    });

    return () => {
      socket.off(SOCKET_EVENTS.LOBBY_UPDATE);
    };
  }, [joined, lobbyId]);

  /**
   * Joins the lobby with a full user object (id + display name).
   */
  const joinLobby = (userObj) => {
    if (!userObj.id || !userObj.display_name.trim())
      return { error: 'User ID and display name required' };

    socket.emit(SOCKET_EVENTS.LOBBY_JOIN, { lobby_id: lobbyId, user: userObj });

    setJoined(true);
    setUser(userObj);
    localStorage.setItem(`lobbyUser-${lobbyId}`, JSON.stringify(userObj));

    return { user: userObj };
  };

  /**
   * Leaves the lobby and removes the user from localStorage.
   */
  const leaveLobby = () => {
    if (user) {
      socket.emit(SOCKET_EVENTS.LOBBY_LEAVE, {
        lobby_id: lobbyId,
        user_id: user.id,
      });

      setJoined(false);
      localStorage.removeItem(`lobbyUser-${lobbyId}`);
    }
  };

  /**
   * Toggles the user's ready status.
   */
  const toggleReady = () => {
    if (user) {
      socket.emit(SOCKET_EVENTS.LOBBY_TOGGLE_READY, {
        lobby_id: lobbyId,
        user_id: user.id,
      });
    }
  };

  /**
   * Updates the user's display name and persists it.
   * @param {string} newDisplayName - The new display name.
   */
  const updateDisplayName = (newDisplayName) => {
    if (!newDisplayName.trim()) return;
    if (user) {
      const updatedUser = { ...user, display_name: newDisplayName };
      socket.emit(SOCKET_EVENTS.LOBBY_UPDATE_DISPLAY_NAME, {
        lobby_id: lobbyId,
        user_id: user.id,
        new_display_name: newDisplayName,
      });

      setUser(updatedUser);
      localStorage.setItem(`lobbyUser-${lobbyId}`, JSON.stringify(updatedUser));
    }
  };

  return {
    lobby,
    lobbyUrl,
    loading,
    joined,
    joinLobby,
    leaveLobby,
    toggleReady,
    updateDisplayName,
    user,
  };
};

export default useLobby;
