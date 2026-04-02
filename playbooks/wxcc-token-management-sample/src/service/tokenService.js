/**
 * Database helpers for persisting OAuth tokens (single row id=1 in this sample).
 * Does NOT implement per-org rows or encryption at rest — use a vault/KMS in production.
 */

const { Token } = require('../models/Token');
const getToken = () => {
  // Gets the Access Token from the database. This is not per org (yet). Can be extended if needed.
  const token = Token.findOne({
    where: {
      id: 1,
    },
  });
  if (token) return token;
  else return {};
};

const updateToken = (token) => {
  const raw = token.access_token || '';
  const parts = raw.split('_');
  let accessToken;
  let clusterId;
  let orgId;

  // Legacy WxCC composite: accessCluster_org in three segments
  if (parts.length === 3) {
    [accessToken, clusterId, orgId] = parts;
  } else {
    accessToken = raw;
    orgId = process.env.ORG_ID || '';
    clusterId = process.env.CLUSTER_ID || 'unknown';
  }

  const record = Token.upsert(
    {
      id: 1,
      org_id: orgId,
      cluster_id: clusterId,
      access_token: accessToken,
      expires_in: token.expires_in,
      refresh_token: token.refresh_token,
      refresh_token_expires_in: token.refresh_token_expires_in,
      token_type: token.token_type,
    },
    { returning: true }
  );
  return record;
};

const getAccessToken = async () => {
  // Fetches the latest access Token if present in the database, else, it returns nothing.
  const token = await getToken();
  let access_token = (await token.access_token) ? token.access_token : '';
  if (process.env.DEBUG_TOKEN === 'true') {
    console.log('Returning access token (length %s)', access_token ? access_token.length : 0);
  }
  return { access_token: access_token };
};

module.exports = { getToken, updateToken, getAccessToken };
