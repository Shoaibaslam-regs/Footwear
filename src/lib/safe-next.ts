/** Only same-site relative paths (no "//host" or "https://…"): safe to redirect to after login. */
export function safeNextPath(value: unknown, fallback: string): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}
