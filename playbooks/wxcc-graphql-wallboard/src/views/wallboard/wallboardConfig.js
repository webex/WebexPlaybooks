/**
 * Legend text for charts that reflect `WALLBOARD_LOOKBACK_DAYS`.
 * `wallboard_lookback_days` comes from each wallboard JSON route alongside `data`.
 */
export function wallboardRangeLegendLabelForDays(days) {
  const n = Number.isFinite(Number(days)) && Number(days) > 0 ? Number(days) : 7;
  return `Totals over the past ${n} days`;
}
