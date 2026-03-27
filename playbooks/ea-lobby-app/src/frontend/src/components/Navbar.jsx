import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  MoreVert as MenuIcon,
  CheckCircle as OnlineIcon,
  Error as OfflineIcon,
  Warning as WarningIcon,
  AccountCircle as UserIcon,
  Videocam as MeetingIcon,
} from '@mui/icons-material';
import useWebex from '../hooks/useWebex';

const Navbar = ({ darkMode, setDarkMode }) => {
  const {
    isConnected,
    loading,
    error,
    username,
    meetingName,
    isRunningInWebex,
  } = useWebex();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Webex Launchpad
        </Typography>

        {/* Dark Mode Toggle */}
        <IconButton color="inherit" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>

        {/* Webex Status Dropdown */}
        <IconButton color="inherit" onClick={handleMenuOpen}>
          <MenuIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          {[
            // Webex Status
            <MenuItem key="status" disabled>
              {loading ? (
                <CircularProgress size={18} />
              ) : isConnected ? (
                <>
                  <OnlineIcon color="success" sx={{ mr: 1 }} /> Connected to
                  Webex
                </>
              ) : (
                <>
                  <OfflineIcon color="error" sx={{ mr: 1 }} /> Webex Not
                  Connected
                </>
              )}
            </MenuItem>,

            // Webex Running Environment
            !isRunningInWebex &&
              ((<Divider key="divider-outside-webex" />),
              (
                <MenuItem key="outside-webex" disabled>
                  <WarningIcon color="warning" sx={{ mr: 1 }} /> Running Outside
                  Webex
                </MenuItem>
              )),

            // Webex User Info (Only Show If Inside Webex)
            isRunningInWebex &&
              ((<Divider key="divider-user-info" />),
              (
                <MenuItem key="username" disabled>
                  <UserIcon sx={{ mr: 1 }} /> {username}
                </MenuItem>
              ),
              (
                <MenuItem key="meeting-name" disabled>
                  <MeetingIcon sx={{ mr: 1 }} /> {meetingName}
                </MenuItem>
              )),

            // Show Error if Connection Fails
            error &&
              ((<Divider key="divider-error" />),
              (
                <MenuItem key="error" disabled>
                  Error: {error}
                </MenuItem>
              )),
          ].filter(Boolean)}{' '}
          {/* Filter out falsy values like `false` */}
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

Navbar.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  setDarkMode: PropTypes.func.isRequired,
};

export default Navbar;
