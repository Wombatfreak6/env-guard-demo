import test from "node:test";
import assert from "node:assert/strict";

import { EnvValidationError } from "@wombatfrk/envguard-lite";
import { loadConfig } from "../src/config.js";

/** A complete, valid environment. A fresh copy is returned on every call. */
function validEnv() {
  return {
    PORT: "8080",
    DATABASE_URL: "postgresql://localhost:5432/envguard_demo",
    JWT_SECRET: "test-secret",
    NODE_ENV: "test",
  };
}

/** Run `loadConfig` and return the thrown EnvValidationError. */
function getValidationError(env) {
  try {
    loadConfig(env);
  } catch (error) {
    assert.ok(
      error instanceof EnvValidationError,
      `expected an EnvValidationError, received ${error}`,
    );
    return error;
  }

  assert.fail("expected loadConfig to throw, but it returned successfully");
}

test("applies the default PORT of 3000 when PORT is missing", () => {
  const env = validEnv();
  delete env.PORT;

  const config = loadConfig(env);

  assert.equal(config.PORT, 3000);
});

test("converts PORT from a string into a number", () => {
  const config = loadConfig(validEnv());

  assert.equal(config.PORT, 8080);
  assert.equal(typeof config.PORT, "number");
});

test("requires DATABASE_URL", () => {
  const env = validEnv();
  delete env.DATABASE_URL;

  const error = getValidationError(env);

  assert.ok(error.variables.includes("DATABASE_URL"));
  assert.equal(
    error.errors.find((detail) => detail.variable === "DATABASE_URL").kind,
    "missing",
  );
});

test("requires JWT_SECRET", () => {
  const env = validEnv();
  delete env.JWT_SECRET;

  const error = getValidationError(env);

  assert.ok(error.variables.includes("JWT_SECRET"));
  assert.equal(
    error.errors.find((detail) => detail.variable === "JWT_SECRET").kind,
    "missing",
  );
});

test("defaults NODE_ENV to development", () => {
  const env = validEnv();
  delete env.NODE_ENV;

  const config = loadConfig(env);

  assert.equal(config.NODE_ENV, "development");
});

test("accepts a fully valid configuration", () => {
  const config = loadConfig(validEnv());

  assert.deepEqual(config, {
    PORT: 8080,
    DATABASE_URL: "postgresql://localhost:5432/envguard_demo",
    JWT_SECRET: "test-secret",
    NODE_ENV: "test",
  });
});

test("rejects a PORT that is not a number", () => {
  const env = { ...validEnv(), PORT: "not-a-number" };

  const error = getValidationError(env);

  assert.deepEqual(error.variables, ["PORT"]);
  assert.equal(error.errors[0].kind, "type");
});

test("rejects a DATABASE_URL that is not an absolute URL", () => {
  const env = { ...validEnv(), DATABASE_URL: "localhost:5432" };

  const error = getValidationError(env);

  assert.deepEqual(error.variables, ["DATABASE_URL"]);
  assert.equal(error.errors[0].kind, "type");
});

test("reports every validation error in a single aggregated error", () => {
  const env = {
    PORT: "invalid-number",
    DATABASE_URL: "localhost:5432",
    // JWT_SECRET is missing.
    NODE_ENV: "development",
  };

  const error = getValidationError(env);

  assert.equal(error.errors.length, 3);
  assert.deepEqual(error.variables.sort(), [
    "DATABASE_URL",
    "JWT_SECRET",
    "PORT",
  ]);
  assert.match(error.message, /Environment validation failed with 3 errors/);
});
