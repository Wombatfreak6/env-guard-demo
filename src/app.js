import express from "express";

/**
 * Build the Express application.
 *
 * The validated configuration is injected instead of being read from
 * `process.env` inside route handlers. That keeps the app easy to test and
 * makes it obvious where configuration comes from.
 *
 * @param {{ PORT: number, DATABASE_URL: string, JWT_SECRET: string, NODE_ENV: string }} config
 * @returns {import("express").Express}
 */
export function createApp(config) {
  const app = express();

  app.use(express.json());

  // Basic service information.
  app.get("/", (request, response) => {
    response.json({
      message: "EnvGuard Demo API",
      package: "@wombatfrk/envguard-lite",
    });
  });

  // Health check using values from the validated configuration.
  app.get("/health", (request, response) => {
    response.json({
      status: "ok",
      environment: config.NODE_ENV,
      port: config.PORT,
    });
  });

  // Safe configuration metadata: booleans and type names only.
  // The actual DATABASE_URL and JWT_SECRET are never sent to clients.
  app.get("/config/status", (request, response) => {
    response.json({
      environment: config.NODE_ENV,
      port: config.PORT,
      portType: typeof config.PORT,
      databaseUrlConfigured: Boolean(config.DATABASE_URL),
      jwtSecretConfigured: Boolean(config.JWT_SECRET),
    });
  });

  return app;
}
