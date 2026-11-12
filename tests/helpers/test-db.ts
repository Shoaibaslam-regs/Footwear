/**
 * The throwaway test database. MONGODB_TEST_URI if set (CI), otherwise the
 * .env MONGODB_URI with `_test` added to the database name. Anything that
 * doesn't end in `_test` / `_e2e` is refused, so tests can never touch live data.
 */
export function deriveUri(base: string, suffix: "_test" | "_e2e"): string {
  // Multi-host mongodb:// URIs aren't valid for new URL(), so use a regex.
  const m = base.match(/^(mongodb(?:\+srv)?:\/\/[^/]+)\/([^?]*)(\?.*)?$/);
  if (!m) throw new Error("MONGODB_URI has an unexpected shape");
  const name = m[2] || "footwear";
  return `${m[1]}/${name.endsWith(suffix) ? name : name + suffix}${m[3] ?? ""}`;
}

export function testDbUri(suffix: "_test" | "_e2e" = "_test"): string {
  const explicit = suffix === "_test" ? process.env.MONGODB_TEST_URI : process.env.MONGODB_E2E_URI;
  const uri = explicit || (process.env.MONGODB_URI ? deriveUri(process.env.MONGODB_URI, suffix) : "");
  if (!uri) throw new Error("Set MONGODB_URI (in .env) or MONGODB_TEST_URI to run these tests.");
  assertSafe(uri, suffix);
  return uri;
}

export function assertSafe(uri: string, suffix: "_test" | "_e2e") {
  const name = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/)?.[1] ?? "";
  if (!name.endsWith(suffix)) throw new Error(`Refusing to run tests against database "${name}": its name must end in ${suffix}.`);
}
