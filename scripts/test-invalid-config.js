/**
 * Demonstrates EnvGuard Lite rejecting an invalid configuration.
 *
 * This script is intentionally broken:
 *   - PORT is not a number,
 *   - DATABASE_URL is not an absolute URL,
 *   - JWT_SECRET is missing.
 *
 * EnvGuard reports all three problems at once. No Express server is started,
 * and the process exits with a non-zero status code.
 *
 * Run with: npm run demo:fail
 */
import { EnvValidationError } from "@wombatfrk/envguard-lite";
import { loadConfig } from "../src/config.js";

const invalidEnv = {
  PORT: "invalid-number",
  DATABASE_URL: "localhost:5432",
  // JWT_SECRET is deliberately omitted.
  NODE_ENV: "development",
};

try {
  loadConfig(invalidEnv);

  // Reaching this point would mean EnvGuard let an invalid configuration pass.
  console.error("ERROR: expected validation to fail, but it succeeded.");
  process.exit(1);
} catch (error) {
  if (error instanceof EnvValidationError) {
    console.error("EnvGuard rejected the configuration.");
    console.error("No server was started.");
    console.error("");
    console.error(error.message);
    console.error("");

    for (const detail of error.errors) {
      console.error(`  kind=${detail.kind} variable=${detail.variable}`);
    }

    process.exit(1);
  }

  console.error("Unexpected error while loading the configuration:");
  console.error(error);
  process.exit(1);
}
