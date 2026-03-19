'use strict';

/**
 * Smoke test: GET https://webexapis.com/v1/meetingPreferences with a bearer token.
 * Mirrors the first step in the bundled Postman collection.
 *
 * Does NOT: refresh tokens, create meetings, or replace the full G2G test sequence.
 *
 * Environment:
 *   WEBEX_ACCESS_TOKEN — service app (or test) access token (required)
 */

const token = process.env.WEBEX_ACCESS_TOKEN;
if (!token) {
  console.error('WEBEX_ACCESS_TOKEN is required');
  process.exit(1);
}

async function main() {
  const res = await fetch('https://webexapis.com/v1/meetingPreferences', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  console.log('HTTP', res.status);
  console.log(text.slice(0, 2000));
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
