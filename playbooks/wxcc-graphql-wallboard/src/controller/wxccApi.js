const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Rolling window (days) for wallboard GraphQL queries.
 * Set `WALLBOARD_LOOKBACK_DAYS` in `.env`; read at call time (same value as wallboard JSON routes).
 */
export function getWallboardLookbackDays() {
  const parsed = Number.parseInt(process.env.WALLBOARD_LOOKBACK_DAYS ?? "7", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
}

/**
 * Rolling `from` / `to` epoch milliseconds for wallboard GraphQL `task(...)` queries.
 */
export function wallboardQueryTimeRange() {
  const to = Date.now();
  const days = getWallboardLookbackDays();
  return { from: to - days * MS_PER_DAY, to };
}

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
