// Socket event constants
export const SOCKET_EVENTS = {
  LOBBY_JOIN: 'lobby:join',
  LOBBY_LEAVE: 'lobby:leave',
  LOBBY_UPDATE_DISPLAY_NAME: 'lobby:update_display_name',
  LOBBY_TOGGLE_READY: 'lobby:toggle_ready',
  LOBBY_UPDATE: 'lobby:update',
  LOBBY_ERROR: 'lobby:error',
};

// Route constants
export const ROUTES = {
  HOME: '/',
  LOBBY: '/lobby',
  LOBBY_WITH_ID: (lobbyId) => `/lobby/${lobbyId}`,
};
