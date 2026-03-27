import React from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ textAlign: 'center', mt: 4 }}>
      <Typography variant="h3" gutterBottom>
        Welcome to Webex Launchpad 🚀
      </Typography>
      <Typography variant="h6" color="textSecondary" component="p">
        A seamless way to create and join pre-game lobbies for Webex meetings.
        Instantly connect, chat, and get ready with your team before the big
        event.
      </Typography>
      <Box sx={{ mt: 4 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => navigate(ROUTES.LOBBY)}
        >
          Create a Lobby
        </Button>
      </Box>
    </Container>
  );
};

export default LandingPage;
