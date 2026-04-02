/**
 * Browser OAuth 2.0 authorization-code flow for initial tokens.
 * GET /login -> Webex authorize -> GET /auth/webex/callback -> tokenService.updateToken
 *
 * Requires: CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, OAUTH_SCOPES, ORG_ID (for non-composite tokens).
 * Does not log codes or tokens.
 */

const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const { updateToken } = require('../service/tokenService');

const router = express.Router();
const AUTHORIZE_URL = 'https://webexapis.com/v1/authorize';
const TOKEN_URL = 'https://webexapis.com/v1/access_token';

router.get('/login', (req, res) => {
  const redirectUri = process.env.REDIRECT_URI;
  const clientId = process.env.CLIENT_ID;
  const scopes = (process.env.OAUTH_SCOPES || '').trim();

  if (!redirectUri || !clientId || !scopes) {
    res.status(500);
    res.type('html');
    res.send(
      '<p>Missing configuration. Set REDIRECT_URI, CLIENT_ID, and OAUTH_SCOPES in <code>.env</code>.</p>'
    );
    return;
  }

  const state = crypto.randomBytes(24).toString('hex');
  res.cookie('oauth_state', state, {
    httpOnly: true,
    maxAge: 10 * 60 * 1000,
    sameSite: 'lax',
    path: '/',
  });

  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes);
  url.searchParams.set('state', state);

  res.redirect(url.toString());
});

router.get('/auth/webex/callback', async (req, res) => {
  const { code, state, error, error_description: errorDesc } = req.query;

  if (error) {
    res.status(400);
    res.type('html');
    res.send(
      `<p>OAuth error: <strong>${escapeHtml(String(error))}</strong> ${escapeHtml(String(errorDesc || ''))}</p>`
    );
    return;
  }

  if (!code || typeof code !== 'string') {
    res.status(400).send('Missing authorization code.');
    return;
  }

  if (!state || state !== req.cookies.oauth_state) {
    res.status(400).send('Invalid or missing OAuth state. Start again from /login.');
    return;
  }

  res.clearCookie('oauth_state', { path: '/' });

  const redirectUri = process.env.REDIRECT_URI;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!redirectUri || !clientId || !clientSecret) {
    res.status(500).send('Server missing REDIRECT_URI, CLIENT_ID, or CLIENT_SECRET.');
    return;
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  try {
    const tokenRes = await axios.post(TOKEN_URL, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    });

    await updateToken(tokenRes.data);
    res.type('html');
    res.send(
      '<p>Tokens stored in SQLite. You can close this tab.</p><p>Flow Designer can use <code>GET /api/token</code> with your configured headers. Scheduled refresh uses the refresh token in the database.</p>'
    );
  } catch (err) {
    const status = err.response && err.response.status;
    const body = err.response && err.response.data;
    console.error('OAuth code exchange failed', status || err.message);
    res.status(502);
    res.type('html');
    res.send(
      '<p>Token exchange failed. Check client secret, redirect URI, and that the code was not reused.</p>'
    );
  }
});

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

module.exports = router;
