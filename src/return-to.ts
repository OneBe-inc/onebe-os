/** A shared allowlist for post-login navigation, including after URL normalization. */
export function safeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\/(dashboard|sales|projects|finance|approvals|internal|settings)(\/|\?|$)/.test(
      value,
    ) ||
    /[\\\u0000-\u0020\u007f]/.test(value) ||
    value.length > 1500
  )
    return "/dashboard";
  const url = new URL(value, "https://onebe.invalid");
  return url.origin === "https://onebe.invalid" &&
    /^\/(dashboard|sales|projects|finance|approvals|internal|settings)(\/|$)/.test(
      url.pathname,
    )
    ? url.pathname + url.search
    : "/dashboard";
}
