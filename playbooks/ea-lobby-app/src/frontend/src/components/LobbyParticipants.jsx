import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
} from '@mui/material';
import PropTypes from 'prop-types';

const LobbyParticipants = ({ participants, currentUser, toggleReady }) => {
  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <strong>Display Name</strong>
            </TableCell>
            <TableCell align="center">
              <strong>Ready</strong>
            </TableCell>
            <TableCell align="right">
              <strong>Actions</strong>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {participants.map((participant) => {
            const isCurrentUser = participant.id === currentUser?.id;
            return (
              <TableRow key={participant.id}>
                <TableCell>
                  <Typography fontWeight={isCurrentUser ? 'bold' : 'normal'}>
                    {participant.display_name} {isCurrentUser ? '(You)' : ''}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  {participant.ready ? '✅ Ready' : '❌ Not Ready'}
                </TableCell>
                <TableCell align="right">
                  {isCurrentUser && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={toggleReady}
                    >
                      {participant.ready ? 'Unready' : 'Ready'}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

LobbyParticipants.propTypes = {
  participants: PropTypes.array.isRequired,
  currentUser: PropTypes.object,
  toggleReady: PropTypes.func.isRequired,
};

export default LobbyParticipants;
