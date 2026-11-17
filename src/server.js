// Load .env *before* anything reads process.env. Import order matters here:
// this module is evaluated before ./config.js because it is imported first.
import "dotenv/config";

import { EnvValidationError } from "@wombatfrk/envguard-lite";
import { config } from "./config.js";
import { createApp } from "./app.js";

function startServer() {
  const app = createApp(config);

  const server = app.listen(config.PORT, () => {
    console.log(
      `EnvGuard Demo API listening on port ${config.PORT} (${config.NODE_ENV})`,
    );
    console.log(`Health check: http://localhost:${config.PORT}/health`);
  });

  return server;
}

try {
  startServer();
} catch (error) {
  if (error instanceof EnvValidationError) {
    // EnvGuard aggregates every problem into one message and never includes
    // environment variable values.
    console.error("Startup aborted: invalid environment configuration.");
    console.error("");
    console.error(error.message);
    process.exit(1);
  }

  console.error("Startup aborted due to an unexpected error.");
  console.error(error.message);
  process.exit(1);
}
