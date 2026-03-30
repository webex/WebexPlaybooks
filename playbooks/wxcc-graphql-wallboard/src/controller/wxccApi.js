/**
 * Builds the WxCC GraphQL Search URL for the tenant org.
 * WXCC_API_BASE must match your cluster (e.g. US1, EU1).
 * @see https://developer.webex.com/webex-contact-center/docs/api/v1/search
 */
export function wxccSearchEndpoint(orgId) {
  const base = (process.env.WXCC_API_BASE || "https://api.wxcc-us1.cisco.com").replace(
    /\/$/,
    ""
  );
  const q = new URLSearchParams({ orgId: String(orgId) });
  return `${base}/search?${q.toString()}`;
}
