import { validateEnv, EnvValidationError } from "@wombatfrk/envguard-lite";

/**
 * Schema describing every environment variable this application needs.
 *
 * EnvGuard Lite uses it to:
 * - check that required variables are present,
 * - convert strings into the declared JavaScript type,
 * - apply defaults when a variable is missing,
 * - restrict values to a fixed set of allowed options (enum).
 */
export const configSchema = {
  PORT: { type: "number", default: 3000 },
  DATABASE_URL: { type: "url", required: true },
  JWT_SECRET: { type: "string", required: true },
  NODE_ENV: {
    type: "string",
    enum: ["development", "production", "test"],
    default: "development",
  },
};

/**
 * Validate an environment object and return the resulting configuration.
 *
 * The `env` parameter exists so the function can be tested with plain objects
 * without touching `process.env`.
 *
 * @param {Record<string, string | undefined>} [env=process.env]
 * @returns {{ PORT: number, DATABASE_URL: string, JWT_SECRET: string, NODE_ENV: string }}
 * @throws {EnvValidationError} When one or more variables are invalid.
 * @throws {Error} When an unexpected error occurs while validating.
 */
export function loadConfig(env = process.env) {
  try {
    return validateEnv(configSchema, env);
  } catch (error) {
    // Expected outcome: the user's environment is invalid. EnvGuard already
    // built a safe, aggregated message (it never includes values).
    if (error instanceof EnvValidationError) {
      throw error;
    }

    // Anything else (for example a malformed schema) is a programming error.
    // Re-throw it with context instead of silently swallowing it.
    throw new Error(
      `Unexpected error while loading configuration: ${error.message}`,
      { cause: error },
    );
  }
}

let cachedDefaultConfig;

/**
 * Return the default application configuration, loading it once on first use.
 *
 * Validation is deliberately postponed until this function is called: importing
 * this module inside a unit test must not validate the machine's real
 * `process.env`.
 *
 * @returns {ReturnType<typeof loadConfig>}
 */
export function getConfig() {
  if (cachedDefaultConfig === undefined) {
    cachedDefaultConfig = loadConfig(process.env);
  }

  return cachedDefaultConfig;
}

/**
 * Default application configuration.
 *
 * Each property is read lazily, so `getConfig()` (and therefore EnvGuard)
 * only runs when the server actually accesses a value.
 */
export const config = {
  get PORT() {
    return getConfig().PORT;
  },
  get DATABASE_URL() {
    return getConfig().DATABASE_URL;
  },
  get JWT_SECRET() {
    return getConfig().JWT_SECRET;
  },
  get NODE_ENV() {
    return getConfig().NODE_ENV;
  },
};
