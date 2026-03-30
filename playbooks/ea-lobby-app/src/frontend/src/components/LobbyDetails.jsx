import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, Typography, Link, Button } from '@mui/material';
import useWebex from '../hooks/useWebex';

const LobbyDetails = ({ lobbyId, lobbyName, lobbyUrl }) => {
  const { isShared, isRunningInWebex, toggleShare } = useWebex();

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h5" fontWeight="bold">
          {lobbyName}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Lobby ID: {lobbyId}
        </Typography>
        <Typography variant="body2">
          Lobby URL:{' '}
          <Link href={lobbyUrl} target="_blank">
            {lobbyUrl}
          </Link>
        </Typography>

        {/* Share Status */}
        <Typography variant="body1" sx={{ mt: 2 }}>
          <strong>Lobby Sharing:</strong>{' '}
          {isShared ? 'Active ✅' : 'Inactive ❌'}
        </Typography>

        {/* Toggle Share Button */}
        <Button
          variant="contained"
          color={isShared ? 'error' : 'primary'}
          sx={{ mt: 2 }}
          onClick={() => toggleShare(lobbyUrl)}
          disabled={!isRunningInWebex} // Disable if not in Webex
        >
          {isShared ? 'Deactivate Shared Lobby' : 'Activate Shared Lobby'}
        </Button>

        {!isRunningInWebex && (
          <Typography
            variant="caption"
            color="error"
            sx={{ display: 'block', mt: 1 }}
          >
            Sharing is only available inside Webex.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

LobbyDetails.propTypes = {
  lobbyId: PropTypes.string.isRequired,
  lobbyName: PropTypes.string.isRequired,
  lobbyUrl: PropTypes.string.isRequired,
};

export default LobbyDetails;
