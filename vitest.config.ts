import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 30_000,
    setupFiles: ["dotenv/config"],
    include: ["src/**/*.test.ts"],
    exclude: ["dist", "node_modules"],
    coverage: {
      provider: "v8",
      include: ["src/**/service/**/*.ts"],
      exclude: ["src/__test__/**", "**/*.d.ts", "node_modules", "dist"],
    },
  },
});
