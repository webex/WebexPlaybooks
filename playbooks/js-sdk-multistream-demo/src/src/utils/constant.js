/**
 * Webex multistream demo — configuration from environment variables.
 *
 * This sample loads ACCESS_TOKEN, SPACE_ID, and SIP_URL from Create React App
 * REACT_APP_* variables (see env.template). It demonstrates browser-side Webex
 * Meetings (multistream) and the Space Widget; it does not implement OAuth,
 * token refresh, or secure server-side secret handling.
 *
 * Security: any value in REACT_APP_* is compiled into the client bundle. Use
 * short-lived lab tokens only; do not ship production user secrets this way.
 *
 * Required at dev time (e.g. in .env.local next to package.json):
 *   REACT_APP_WEBEX_ACCESS_TOKEN
 *   REACT_APP_WEBEX_SPACE_ID
 *   REACT_APP_WEBEX_SIP_URL
 */

export const ACCESS_TOKEN = process.env.REACT_APP_WEBEX_ACCESS_TOKEN || "";
export const SPACE_ID = process.env.REACT_APP_WEBEX_SPACE_ID || "";
export const SIP_URL = process.env.REACT_APP_WEBEX_SIP_URL || "";
