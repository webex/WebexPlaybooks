import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Helper function for making API requests
const apiRequest = async (method, endpoint, data = null) => {
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}${endpoint}`,
      data,
    });
    return response.data;
  } catch (error) {
    console.error(`API Error: ${method.toUpperCase()} ${endpoint}`, error);
    throw error.response?.data || { message: 'API request failed' };
  }
};

// API functions
const api = {
  getLobby: (lobbyId) => apiRequest('get', `/lobby/${lobbyId}`),
  createLobby: (hostId, hostDisplayName, lobbyName) =>
    apiRequest('post', '/lobby', {
      host_id: hostId,
      host_display_name: hostDisplayName,
      lobby_name: lobbyName,
    }),
};

export default api;
