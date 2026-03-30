import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  Container,
} from '@mui/material';
import CreateLobby from './components/CreateLobby';
import Lobby from './components/Lobby';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import BreadcrumbsNav from './components/BreadcrumbsNav';
import useWebex from './hooks/useWebex';
import { ROUTES } from './constants';

function App() {
  const { theme: webexTheme } = useWebex();
  const [darkMode, setDarkMode] = useState(false);

  // Sync theme when Webex environment is detected
  useEffect(() => {
    setDarkMode(webexTheme === 'dark');
  }, [webexTheme]);

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
      <Container>
        <Routes>
          <Route path={ROUTES.HOME} element={<LandingPage />} />
          <Route
            path={ROUTES.LOBBY}
            element={
              <>
                <BreadcrumbsNav />
                <CreateLobby />
              </>
            }
          />
          <Route
            path={ROUTES.LOBBY_WITH_ID(':lobbyId')}
            element={
              <>
                <BreadcrumbsNav />
                <Lobby />
              </>
            }
          />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Container>
    </ThemeProvider>
  );
}

export default App;
