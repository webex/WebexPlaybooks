/**
 * Login with Webex — Express server serving the interactive demo pages
 *
 * Serves static files from public/ (index.html, openid3.html, pkce.html, etc.)
 * and provides /config.js for client_id injection (openid3 flow).
 *
 * Required environment variables:
 * - WEBEX_CLIENT_ID (for ID Token flow; PKCE flow uses form input)
 * - PORT (optional, default 3000)
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.WEBEX_CLIENT_ID;
const publicDir = path.join(__dirname, "public");

app.use(express.static(publicDir));

// Inject client_id for openid3.html (ID Token flow) — never expose client secret
app.get("/config.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.send(
    `window.WEBEX_CLIENT_ID = ${JSON.stringify(CLIENT_ID || "")};`
  );
});

app.listen(PORT, () => {
  console.log(`Login with Webex demo: http://localhost:${PORT}`);
  if (!CLIENT_ID) {
    console.warn(
      "Set WEBEX_CLIENT_ID for the ID Token flow (openid3.html)."
    );
  }
});
