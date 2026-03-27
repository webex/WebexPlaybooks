import { useState, useEffect } from 'react';
import Application from '@webex/embedded-app-sdk';

/**
 * Custom hook to manage Webex SDK state and connection status.
 *
 * @returns {Object} Webex SDK state and metadata.
 * @property {Object|null} webexData - The Webex SDK instance, meeting details, and user info.
 * @property {boolean} loading - Indicates whether the SDK is initializing.
 * @property {string|null} error - Error message if initialization fails.
 * @property {boolean} isConnected - Whether the Webex SDK is connected.
 * @property {boolean} isRunningInWebex - Whether the app is running inside Webex.
 * @property {boolean} isShared - Whether the lobby is currently shared.
 * @property {string|null} username - Webex user's display name.
 * @property {string|null} meetingName - The current Webex meeting name.
 * @property {string} theme - Current Webex theme (light/dark).
 * @property {Function} toggleShare - Function to activate/deactivate lobby sharing.
 */
const useWebex = () => {
  const [webexData, setWebexData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRunningInWebex, setIsRunningInWebex] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [username, setUsername] = useState(null);
  const [meetingName, setMeetingName] = useState(null);
  const [theme, setTheme] = useState('light'); // Default to light theme

  useEffect(() => {
    const initializeWebex = async () => {
      try {
        const app = new Application();

        // Set timeout to detect if app is running outside Webex
        const timeout = setTimeout(() => {
          setIsRunningInWebex(false);
          setLoading(false);
          setUsername('Unknown User');
          setMeetingName('No Active Meeting');
          setTheme('light'); // Default theme
        }, 5000);

        await app.onReady(); // Completes only if inside Webex
        clearTimeout(timeout); // Webex detected, cancel timeout

        // Fetch Webex user and meeting details
        const meeting = await app.context.getMeeting();
        const user = app.application.states.user;
        setUsername(user?.displayName || 'Unknown User');
        setMeetingName(meeting?.title || 'No Active Meeting');

        // Detect Webex environment
        setIsRunningInWebex(true);

        // Fetch initial share state
        const sharedState = app.isShared;
        setIsShared(sharedState);

        // Fetch initial theme
        const webexTheme = app.application.states.theme || 'light';
        setTheme(webexTheme.toLowerCase());

        // Listen for theme changes
        app.on('application:themeChanged', (data) => {
          setTheme(data.toLowerCase());
        });

        // Listen for share state changes
        app.on('application:shareStateChanged', (shareState) => {
          setIsShared(shareState);
        });

        setWebexData({ app, meeting, user });
        setIsConnected(true);
      } catch (err) {
        console.error('Error initializing Webex SDK:', err);
        setError(err.message || 'Failed to connect to Webex');
        setIsConnected(false);
        setIsRunningInWebex(false);
      } finally {
        setLoading(false);
      }
    };

    initializeWebex();
  }, []);

  /**
   * Toggles the shared state of the lobby.
   * @param {string} lobbyUrl - The URL to share.
   */
  const toggleShare = async (lobbyUrl) => {
    if (!webexData?.app || !isRunningInWebex) return;

    try {
      if (isShared) {
        await webexData.app.clearShareUrl();
      } else {
        await webexData.app.setShareUrl(lobbyUrl, lobbyUrl, 'lobby');
      }
    } catch (err) {
      console.error('Error toggling share state:', err);
    }
  };

  return {
    webexData,
    loading,
    error,
    isConnected,
    isRunningInWebex,
    isShared,
    username,
    meetingName,
    theme,
    toggleShare,
  };
};

export default useWebex;
