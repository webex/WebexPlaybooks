/**
 * This file stores the logic to call the "Scheduler" to refresh the tokens every INTERVAL hours.
 * To store tokens it uses the Token model / SQLite via tokenService.
 *
 * What this does: on startup and on a fixed interval, POSTs to Webex OAuth token endpoint with
 * grant_type=refresh_token and persists the response in the database.
 *
 * What this does NOT do: production-grade secret storage, multi-tenant isolation, or log redaction.
 *
 * Environment: CLIENT_ID, CLIENT_SECRET; refresh_token from DB row id=1 if set, else REFRESH_TOKEN (see env.template).
 */

// Scheduler
const {
  ToadScheduler,
  SimpleIntervalJob,
  AsyncTask,
} = require('toad-scheduler');
// HTTP Client
const axios = require('axios');
const dotenv = require('dotenv').config();
const path = require('path');
// Store the Token inside the Database
const { db } = require('../db/db');
const { getToken, updateToken } = require('../service/tokenService');

// Global Constants - You may refactor this into another file if required.
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const authUrl = 'https://webexapis.com/v1/access_token';
// You can externalize this property as well - interval in hours OR minutes OR seconds
const INTERVAL = 10;

// Connect to your database. Change the parameters inside of db.js to switch your database type.
db.sync({
  force: false,
})
  .then(() => console.log('DB Connected!'))
  .catch((err) => console.log(err));

const getRefreshToken = async () => {
  if (!clientId || !clientSecret) {
    console.log('Skipping refresh_token grant: CLIENT_ID or CLIENT_SECRET not set');
    return;
  }

  let refreshTokenValue = '';
  try {
    const row = await getToken();
    if (row && row.refresh_token) {
      refreshTokenValue = row.refresh_token;
    } else if (row && typeof row.get === 'function') {
      const plain = row.get({ plain: true });
      if (plain && plain.refresh_token) {
        refreshTokenValue = plain.refresh_token;
      }
    }
  } catch (e) {
    console.error('Error reading refresh_token from DB:', e.message);
  }

  if (!refreshTokenValue) {
    refreshTokenValue = process.env.REFRESH_TOKEN || '';
  }

  if (!refreshTokenValue) {
    console.log(
      'Skipping refresh_token grant: no refresh_token in database or REFRESH_TOKEN env'
    );
    return;
  }

  const webexUrl = authUrl;
  const params = {
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshTokenValue,
  };

  console.log(
    'Trying refresh_token grant (client_id=%s, client_secret and refresh_token redacted)',
    clientId
  );

  let urlParams = Object.entries(params)
    .map((x) => `${encodeURIComponent(x[0])}=${encodeURIComponent(x[1])}`)
    .join('&');

  const config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
  };

  try {
    const response = await axios.post(webexUrl, urlParams, config);

    console.log(
      'Storing token response in database (access_token and refresh_token not logged)'
    );
    // Gives -> access_token, expires_in, refresh_token, refresh_token_expires_in, token_type
    // Returned access token
    let token_data = await response.data;
    let token = '';
    // Checking
    try {
      token = await getToken();
    } catch (error) {
      console.error(`Error while fetching token: ${error}`);
    }
    if (token) {
      console.log('Found existing token row in DB; updating from refresh response');
    } else {
      console.log(`No Existing token found, updating / creating first one..`);
    }

    // Update Token in DB - Client Secret update
    let dbResponse = '';
    try {
      dbResponse = await updateToken(token_data);
      console.log('Token row upsert completed');
    } catch (error) {
      console.error(`Error while updating DB: ${error}`);
    }
    return dbResponse;
  } catch (error) {
    console.error(`MAJOR ERROR in RETRIEVING THE ACCESS TOKEN: ${error}`);
  }
};

const initializeScheduler = () => {
  // Initialize the Access Token upon startup.
  getRefreshToken();
  console.info('Initializing the Scheduler..');
  const scheduler = new ToadScheduler();
  const task = new AsyncTask('Fetch Refresh Token', getRefreshToken);
  // Setup the Scheduler to get the refresh token every INTERVAL hours
  // E.g: For minutes, use: const job = new SimpleIntervalJob({ minutes: INTERVAL }, task);
  //const job = new SimpleIntervalJob({ seconds: INTERVAL }, task);
  const job = new SimpleIntervalJob({ hours: INTERVAL }, task);
  scheduler.addSimpleIntervalJob(job);
  console.info(`Scheduler initialized with Interval:${INTERVAL}`);
};

module.exports = { getRefreshToken, initializeScheduler };
