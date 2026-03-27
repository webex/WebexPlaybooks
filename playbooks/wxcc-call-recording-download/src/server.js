/**
 * Webex Contact Center — call recording download (webhook + captures API).
 *
 * Demonstrates: OAuth (authorization code) to hold a WxCC/Webex access token in
 * memory, dashboard at GET / (list/register subscriptions), POST /webhook for
 * capture:available events, POST /v1/captures/query, then streaming the file.
 *
 * NOT for production: tokens are only in RAM (lost on restart); webhook signature
 * verification is not shown; minimal error handling.
 *
 * Required env: CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, ORG_ID.
 * Optional: PORT, HOST, WXCC_API_BASE, FILE_PATH (see env.template).
 */

const express = require('express');
const dotenv = require('dotenv');
const url = require('url');
const path = require('path');
const { default: axios } = require('axios');
const fs = require('fs');
const { pipeline } = require('stream/promises');

const app = express();
dotenv.config();

let loginDetails = null;

function wxccApiBase() {
  return (process.env.WXCC_API_BASE || 'https://api.wxcc-us1.cisco.com').replace(/\/$/, '');
}

function wxccCapturesQueryUrl() {
  return `${wxccApiBase()}/v1/captures/query`;
}

function normalizeWebhookDestinationUrl(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    const err = new Error('destinationUrl is required');
    err.statusCode = 400;
    throw err;
  }
  let u;
  try {
    u = new URL(trimmed);
  } catch {
    const err = new Error('Invalid URL');
    err.statusCode = 400;
    throw err;
  }
  if (u.protocol !== 'https:') {
    const err = new Error('destinationUrl must use HTTPS');
    err.statusCode = 400;
    throw err;
  }
  if (u.search) {
    const err = new Error('destinationUrl must not include query parameters');
    err.statusCode = 400;
    throw err;
  }
  let p = u.pathname.replace(/\/+$/, '') || '';
  if (!p.endsWith('/webhook')) {
    p = `${p}/webhook`.replace(/\/{2,}/g, '/');
  }
  u.pathname = p;
  return u.toString();
}

function extractSubscriptionArray(body) {
  if (!body || typeof body !== 'object') return [];
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body.items)) return body.items;
  if (Array.isArray(body.subscriptions)) return body.subscriptions;
  return [];
}

function mapSubscriptionForClient(s) {
  if (!s || typeof s !== 'object') return null;
  return {
    id: s.id ?? s.subscriptionId ?? s.subscription_id ?? '',
    name: s.name ?? '',
    destinationUrl: s.destinationUrl ?? s.destination_url ?? '',
    eventTypes: Array.isArray(s.eventTypes) ? s.eventTypes : (s.event_types ?? []),
    status: s.status ?? '',
  };
}

app.use(express.json());

// Register GET / before express.static so `/` is not swallowed by dist/index.html.
app.get('/', (req, res) => {
  if (loginDetails && loginDetails.access_token) {
    return res.sendFile(path.join(__dirname, 'dist', 'dashboard.html'));
  }
  return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('/login', (req, res) => {
  const authUrl = 'https://webexapis.com/v1/authorize';

  console.log('Redirecting to Webex authorize (client_id from env).');

  res.redirect(
    url.format({
      pathname: authUrl,
      query: {
        response_type: 'code',
        client_id: process.env.CLIENT_ID,
        redirect_uri: process.env.REDIRECT_URI,
        scope: 'cjp:config cjp:config_read cjp:config_write',
        state: '',
      },
    })
  );
});

app.get('/auth/webex/callback', async (req, res) => {
  const code = req.query.code || null;
  if (!code) {
    console.error('OAuth callback missing code:', req.query.error || 'unknown');
    return res.status(500).json({ error: 'Authorization code missing' });
  }

  const payload = {
    grant_type: 'authorization_code',
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    code: code,
    redirect_uri: process.env.REDIRECT_URI,
  };
  const data = Object.keys(payload)
    .map((key) => `${key}=${encodeURIComponent(payload[key])}`)
    .join('&');

  try {
    const response = await axios.post(
      'https://webexapis.com/v1/access_token',
      data,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    loginDetails = response.data || {
      error: 'Error while fetching access token',
    };

    console.log('Access token received and stored in memory (not logged).');

    return res.redirect('/');
  } catch (err) {
    console.error(
      'Token exchange failed:',
      err.response ? err.response.status : err.message
    );
    return res.status(500).json({ error: 'Token exchange failed' });
  }
});

app.post('/webhook', async (req, res) => {
  const type = req.body && req.body.type ? req.body.type : '';

  if (type === 'capture:available') {
    if (!loginDetails || !loginDetails.access_token) {
      console.error(
        'capture:available webhook received but no OAuth session; visit /login first.'
      );
      return res
        .status(503)
        .send(
          'No access token in memory. Open /login in a browser, then retry the webhook.'
        );
    }

    console.log('Received capture:available; processing…');

    const details = req.body.data;
    const taskId = details.taskId;
    const filePath = details.filePath;
    const createdTime = new Date(details.createdTime);
    console.log(
      `Recording event taskId=${taskId} path=${filePath} created=${createdTime}`
    );

    const headers = {
      Authorization: `Bearer ${loginDetails.access_token}`,
      'Content-Type': 'application/json',
    };
    const payload = {
      query: {
        orgId: process.env.ORG_ID,
        urlExpiration: 30,
        taskIds: [taskId],
        includeSegments: false,
      },
    };

    let response;
    try {
      response = await axios.post(wxccCapturesQueryUrl(), payload, {
        headers: headers,
      });
    } catch (error) {
      console.error('captures/query failed:', error.response?.data || error.message);
      return res.status(502).send('captures/query failed');
    }

    let recordingDetails;
    try {
      const row = response.data.data.pop();
      recordingDetails = row.recording.pop().attributes;
    } catch (e) {
      console.error('Unexpected captures/query response shape:', e.message);
      return res.status(502).send('Unexpected API response');
    }

    const localDir = path.resolve(
      process.cwd(),
      process.env.FILE_PATH || './recordings'
    );
    const fileName = `${taskId}-${recordingDetails.fileName}`;
    const destPath = path.join(localDir, fileName);

    fs.mkdirSync(localDir, { recursive: true });

    console.log(`Downloading from storage URL to ${destPath}`);

    try {
      const recordingData = await axios({
        method: 'GET',
        url: recordingDetails.filePath,
        responseType: 'stream',
      });

      const writeStream = fs.createWriteStream(destPath);
      await pipeline(recordingData.data, writeStream);
    } catch (error) {
      console.error('Recording download or write failed:', error.message);
      return res.status(502).send('Recording download failed');
    }

    console.log('Recording saved to disk:', destPath);
    return res.status(200).send('Webhook Triggered');
  }

  if (type.includes('agent')) {
    console.log('Agent webhook (log only):', JSON.stringify(req.body.data));
  } else {
    console.log('Webhook ignored (not capture:available).');
  }

  return res.status(200).send('Webhook Triggered');
});

app.get('/api/session', (req, res) => {
  if (loginDetails && loginDetails.access_token) {
    return res.json({
      authenticated: true,
      expires_in: loginDetails.expires_in,
      token_prefix: `${loginDetails.access_token.slice(0, 10)}…`,
    });
  }
  return res.json({ authenticated: false });
});

app.get('/api/subscriptions', async (req, res) => {
  if (!loginDetails || !loginDetails.access_token) {
    return res.status(401).json({ error: 'Not authenticated. Open /login first.' });
  }
  try {
    const response = await axios.get(`${wxccApiBase()}/v1/subscriptions`, {
      headers: { Authorization: `Bearer ${loginDetails.access_token}` },
    });
    const arr = extractSubscriptionArray(response.data);
    const subscriptions = arr.map(mapSubscriptionForClient).filter(Boolean);
    return res.json({ subscriptions });
  } catch (err) {
    console.error('list subscriptions failed:', err.response?.data || err.message);
    return res.status(502).json({ error: 'Failed to list subscriptions' });
  }
});

app.post('/api/register-subscription', async (req, res) => {
  if (!loginDetails || !loginDetails.access_token) {
    return res.status(401).json({ error: 'Not authenticated. Open /login first.' });
  }
  let destinationUrl;
  try {
    destinationUrl = normalizeWebhookDestinationUrl(req.body && req.body.destinationUrl);
  } catch (e) {
    return res.status(e.statusCode || 400).json({ error: e.message });
  }
  const payload = {
    name: `wxcc-recording-download-playbook-${Date.now()}`,
    description: 'WxCC call recording download sample (Webex Playbooks)',
    destinationUrl,
    eventTypes: ['capture:available'],
  };
  try {
    const response = await axios.post(`${wxccApiBase()}/v1/subscriptions`, payload, {
      headers: {
        Authorization: `Bearer ${loginDetails.access_token}`,
        'Content-Type': 'application/json',
      },
    });
    const id =
      response.data && response.data.id != null
        ? response.data.id
        : response.data && response.data.data && response.data.data.id != null
          ? response.data.data.id
          : '';
    return res.status(200).json({
      message: 'Subscription registered.',
      id: id || undefined,
    });
  } catch (err) {
    console.error('register-subscription failed:', err.response?.data || err.message);
    const status = err.response && err.response.status;
    const data = err.response && err.response.data;
    let msg = 'Subscription registration failed';
    if (typeof data === 'string') {
      msg = data;
    } else if (data && typeof data === 'object') {
      msg = data.message || data.error || data.description || msg;
      if (typeof msg !== 'string') {
        msg = JSON.stringify(msg);
      }
    }
    const httpStatus =
      typeof status === 'number' && status >= 400 && status < 600 ? status : 502;
    return res.status(httpStatus).json({ error: msg });
  }
});

app.get('/*', function (req, res) {
  res.sendFile('index.html', { root: path.join(__dirname, 'dist') });
});

const port = process.env.PORT || 5000;
const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
