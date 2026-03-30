import React from 'react';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import useLobby from '../hooks/useLobby';
import { ROUTES } from '../constants';

const BreadcrumbsNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { lobbyId } = useParams();
  const { lobby, loading } = useLobby(lobbyId);

  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Breadcrumbs separator="›" aria-label="breadcrumb">
        <Link
          color="inherit"
          onClick={() => navigate(ROUTES.HOME)}
          sx={{ cursor: 'pointer' }}
        >
          Home
        </Link>
        {pathnames.includes('lobby') && (
          <Link
            color="inherit"
            onClick={() => navigate(ROUTES.LOBBY)}
            sx={{ cursor: 'pointer' }}
          >
            Lobby
          </Link>
        )}
        {lobbyId && (
          <Typography color="text.primary">
            {loading ? 'Loading...' : lobby?.lobby_name || 'Unknown Lobby'}
          </Typography>
        )}
      </Breadcrumbs>
    </Box>
  );
};

export default BreadcrumbsNav;
