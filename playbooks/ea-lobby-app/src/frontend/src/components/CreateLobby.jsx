import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Container,
  Typography,
  CircularProgress,
} from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import { ROUTES } from '../constants';
import useWebex from '../hooks/useWebex';
import api from '../utils/api';

const CreateLobby = () => {
  const navigate = useNavigate();
  const [lobbyName, setLobbyName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { isLoading, username, meetingName } = useWebex();

  // Once isLoading is false, set default values from Webex SDK
  // This is a workaround to avoid setting default values before Webex SDK is ready
  useEffect(() => {
    if (!isLoading) {
      setLobbyName(meetingName);
      setDisplayName(username);
    }
  }, [isLoading, meetingName, username]);

  const handleCreateLobby = async () => {
    if (!lobbyName.trim() || !displayName.trim()) return;
    setLoading(true);

    try {
      const hostId = uuidv4();
      const data = await api.createLobby(hostId, displayName, lobbyName);
      navigate(ROUTES.LOBBY_WITH_ID(data.lobby_id), {
        state: { user: { id: hostId, display_name: displayName } },
      });
    } catch (error) {
      console.error('Error creating lobby:', error);
      alert(error.message || 'Failed to create lobby.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 4 }}>
      <Typography variant="h4">Create a Lobby</Typography>
      <TextField
        fullWidth
        label="Lobby Name"
        variant="outlined"
        margin="normal"
        value={lobbyName}
        onChange={(e) => setLobbyName(e.target.value)}
      />
      <TextField
        fullWidth
        label="Your Display Name"
        variant="outlined"
        margin="normal"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />
      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
        onClick={handleCreateLobby}
        disabled={loading}
      >
        {loading ? (
          <CircularProgress size={24} sx={{ color: 'white' }} />
        ) : (
          'Create Lobby'
        )}
      </Button>
    </Container>
  );
};

export default CreateLobby;
