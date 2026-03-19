'use strict';

/**
 * Local helper: HTTP server that opens Google Chrome with a meeting URL from the path.
 * Postman (or another client) calls GET /myConf?conf=<url-encoded-meeting-url>.
 *
 * Does NOT: validate callers, support Windows/Linux browser launch (returns 501), or run in production.
 *
 * Environment:
 *   PORT — listen port (default 3000)
 *   CHROME_APP_NAME — macOS app name for `open -a` (default "Google Chrome")
 */

const http = require('http');
const { spawn } = require('child_process');

const PORT = Number(process.env.PORT) || 3000;
const CHROME_APP_NAME = process.env.CHROME_APP_NAME || 'Google Chrome';

if (process.platform !== 'darwin') {
  console.warn(
    'Warning: browser launch is only implemented for macOS. Other platforms should open URLs manually.',
  );
}

http
  .createServer((req, res) => {
    console.log(req.url);

    if (req.url.endsWith('favicon.ico')) {
      return res.writeHead(404, { 'Content-Type': 'text/plain' }).end('no favicon here');
    }

    const prefix = '/myConf?conf=';
    if (!req.url.includes(prefix)) {
      return res
        .writeHead(400, { 'Content-Type': 'text/plain' })
        .end('Expected path like /myConf?conf=<encoded-url>');
    }

    const raw = req.url.split(prefix)[1];
    let meetingUrl;
    try {
      meetingUrl = decodeURIComponent(raw);
    } catch {
      return res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Invalid URL encoding');
    }

    if (!meetingUrl || !/^https?:\/\//i.test(meetingUrl)) {
      return res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Expected http(s) meeting URL');
    }

    if (process.platform !== 'darwin') {
      return res
        .writeHead(501, { 'Content-Type': 'text/plain' })
        .end('Chrome launch is only implemented for macOS. Open the meeting URL manually.');
    }

    const child = spawn('open', ['-a', CHROME_APP_NAME, meetingUrl], {
      stdio: 'inherit',
    });

    child.on('error', (err) => {
      console.error(err);
      res.writeHead(500).end(JSON.stringify({ message: String(err.message) }));
    });

    child.on('close', (code) => {
      if (res.writableEnded) return;
      if (code !== 0) {
        return res.writeHead(500).end(JSON.stringify({ message: `open exited with code ${code}` }));
      }
      return res.writeHead(200).end('ok');
    });
  })
  .listen(PORT, () => {
    console.log(`Chrome tab helper listening on http://127.0.0.1:${PORT}`);
  });
