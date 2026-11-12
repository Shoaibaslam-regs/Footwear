import { rmSync } from "node:fs";

/**
 * Playwright stops the test server abruptly, so its own cleanup may not run.
 * Pages `next start` regenerated from the test database must never outlive
 * the run (a later `npm start` would serve them).
 */
export default function teardown() {
  rmSync(".next/server/route-cache", { recursive: true, force: true });
}
