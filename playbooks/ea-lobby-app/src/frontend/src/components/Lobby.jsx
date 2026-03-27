import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import useWebex from '../hooks/useWebex';
import useLobby from '../hooks/useLobby';
import LobbyDetails from './LobbyDetails';
import LobbyParticipants from './LobbyParticipants';
import LobbyActions from './LobbyActions';
import JoinLobby from './JoinLobby';
import { Typography, Box } from '@mui/material';

const Lobby = () => {
  const { lobbyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { webexData } = useWebex();

  // Load user from localStorage or default to Webex user
  const storedUser = JSON.parse(localStorage.getItem(`lobbyUser-${lobbyId}`));
  const [user, setUser] = useState(storedUser || location.state?.user || null);

  const {
    lobby,
    loading,
    joined,
    joinLobby,
    leaveLobby,
    toggleReady,
    updateDisplayName,
    lobbyUrl,
  } = useLobby(lobbyId, user);

  const [newDisplayName, setNewDisplayName] = useState('');

  // Create a new user object from Webex data
  useEffect(() => {
    if (webexData && !user) {
      setUser({
        id: webexData.user.id,
        display_name: webexData.user.displayName || 'Guest',
      });
    }
  }, [webexData, user]);

  useEffect(() => {
    if (!joined && user?.id) {
      joinLobby(user);
    }
  }, [joined, user, joinLobby]);

  // Handle Join Lobby action by setting user and joining the lobby
  const handleJoinLobby = (userObj) => {
    setUser(userObj);
    joinLobby(userObj);
  };

  if (loading)
    return <Typography textAlign="center">Loading lobby...</Typography>;

  // Show Join Lobby screen for new users
  if (!joined) {
    return <JoinLobby onJoin={handleJoinLobby} />;
  }

  return (
    <Box sx={{ mt: 4, mx: 'auto', maxWidth: 600 }}>
      {/* Lobby Information */}
      <LobbyDetails
        lobbyId={lobbyId}
        lobbyName={lobby.lobby_name}
        lobbyUrl={lobbyUrl}
      />

      {/* Participants List */}
      <LobbyParticipants
        participants={lobby.participants}
        currentUser={user}
        toggleReady={toggleReady}
      />

      {/* User Actions */}
      <LobbyActions
        newDisplayName={newDisplayName}
        setNewDisplayName={setNewDisplayName}
        updateDisplayName={updateDisplayName}
        leaveLobby={() => {
          leaveLobby();
          navigate('/lobby'); // Ensure user is redirected after leaving
        }}
      />
    </Box>
  );
};

export default Lobby;
