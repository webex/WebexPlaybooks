import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, TextField, Button } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';

const JoinLobby = ({ onJoin }) => {
  const [displayName, setDisplayName] = useState('');

  const handleJoin = () => {
    if (displayName.trim()) {
      const userId = uuidv4(); // Generate a unique ID for the user
      onJoin({ id: userId, display_name: displayName });
    }
  };

  return (
    <Box sx={{ textAlign: 'center', mt: 4 }}>
      <Typography variant="h5">Join Lobby</Typography>
      <TextField
        fullWidth
        label="Enter your display name"
        variant="outlined"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        sx={{ mt: 2 }}
      />
      <Button variant="contained" sx={{ mt: 2 }} onClick={handleJoin}>
        Join Lobby
      </Button>
    </Box>
  );
};

JoinLobby.propTypes = {
  onJoin: PropTypes.func.isRequired,
};

export default JoinLobby;
