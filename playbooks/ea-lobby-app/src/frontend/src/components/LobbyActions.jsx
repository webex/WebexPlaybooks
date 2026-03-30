import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid2,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

const LobbyActions = ({
  newDisplayName,
  setNewDisplayName,
  updateDisplayName,
  leaveLobby,
}) => {
  const [openDialog, setOpenDialog] = useState(false);

  const handleLeaveLobby = () => {
    setOpenDialog(true);
  };

  const confirmLeaveLobby = () => {
    leaveLobby();
    setOpenDialog(false);
  };

  return (
    <>
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6">Your Actions</Typography>
          <Grid2 container spacing={2} columns={12} sx={{ mt: 1 }}>
            <Grid2 sx={{ gridColumn: 'span 8' }}>
              <TextField
                fullWidth
                label="New Display Name"
                variant="outlined"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
              />
            </Grid2>
            <Grid2 sx={{ gridColumn: 'span 4' }}>
              <Button
                fullWidth
                variant="contained"
                disabled={!newDisplayName.trim()}
                onClick={() => updateDisplayName(newDisplayName)}
              >
                Update Name
              </Button>
            </Grid2>
            <Grid2 sx={{ gridColumn: 'span 12', mt: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                onClick={handleLeaveLobby}
              >
                Leave Lobby
              </Button>
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Leaving */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Leave Lobby</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to leave the lobby? You may need to rejoin if
            you leave.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmLeaveLobby} color="error" variant="contained">
            Leave
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ✅ Define PropTypes for Type Safety
LobbyActions.propTypes = {
  newDisplayName: PropTypes.string.isRequired,
  setNewDisplayName: PropTypes.func.isRequired,
  updateDisplayName: PropTypes.func.isRequired,
  leaveLobby: PropTypes.func.isRequired,
};

export default LobbyActions;
