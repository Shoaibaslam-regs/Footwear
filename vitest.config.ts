import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Local runs read MONGODB_URI / JWT_SECRET from .env (CI passes them in).
if (existsSync(".env")) process.loadEnvFile(".env");

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  "server-only": fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url)),
};

export default defineConfig({
  resolve: { alias },
  test: {
    // The integration files share one throwaway database, so files run one at a time.
    fileParallelism: false,
    projects: [
      {
        resolve: { alias },
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/setup/integration.ts"],
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
