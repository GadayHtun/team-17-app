import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Mirror tsconfig paths ("@/*" -> "src/*") without the ESM-only
      // vite-tsconfig-paths plugin (config is loaded as CJS here).
      "@": path.resolve(__dirname, "src"),
      // `server-only` throws on import outside a react-server bundle; stub it
      // so server-only modules (storage) are testable under Node.
      "server-only": path.resolve(__dirname, "test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
