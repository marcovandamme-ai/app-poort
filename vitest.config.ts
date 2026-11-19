import { defineConfig } from "vitest/config";

// The integration tests share one database, so test files run one after another.
export default defineConfig({ test: { fileParallelism: false } });
