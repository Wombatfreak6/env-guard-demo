# EnvGuard Demo

A small Express.js API that demonstrates how to use the published npm package
[`@wombatfrk/envguard-lite`](https://www.npmjs.com/package/@wombatfrk/envguard-lite)
to validate environment variables at application startup.

> **This is a demonstration project.** It consumes EnvGuard Lite as a normal
> npm dependency. It does not contain, copy or reimplement EnvGuard's validation
> logic, and it does not import the package from a local path.

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Why this project exists](#2-why-this-project-exists)
3. [What EnvGuard Lite does](#3-what-envguard-lite-does)
4. [Technologies used](#4-technologies-used)
5. [Installation](#5-installation)
6. [Environment setup](#6-environment-setup)
7. [Project structure](#7-project-structure)
8. [How EnvGuard is integrated](#8-how-envguard-is-integrated)
9. [Code examples](#9-code-examples)
10. [Successful startup demonstration](#10-successful-startup-demonstration)
11. [Invalid configuration demonstration](#11-invalid-configuration-demonstration)
12. [API endpoints and example responses](#12-api-endpoints-and-example-responses)
13. [Running tests](#13-running-tests)
14. [How to use the published npm package](#14-how-to-use-the-published-npm-package)
15. [Original npm package](#15-original-npm-package)
16. [Original EnvGuard GitHub repository](#16-original-envguard-github-repository)

---

## 1. Project overview

EnvGuard Demo is a minimal backend that:

- loads configuration from `.env` with **dotenv**,
- validates every environment variable with **@wombatfrk/envguard-lite**,
- converts `PORT` from a string to a number automatically,
- applies defaults for `PORT` and `NODE_ENV`,
- restricts `NODE_ENV` to `development`, `production` or `test`,
- refuses to start when the environment is invalid,
- exposes a few safe endpoints built on the validated configuration.

No database is required. No frontend, no ORM, no extra dependencies.

---

## 2. Why this project exists

Environment variables are strings and can be missing, empty or malformed.
Reading them directly inside a server leads to failures that are hard to trace:

```js
app.listen(process.env.PORT); // "undefined" → random port or crash
const debug = process.env.DEBUG; // "false" is a truthy string
```

This project shows the practical answer: validate the whole environment **once**,
at startup, and fail fast with one clear, aggregated error. It also serves as the
practical usage demonstration for publishing `@wombatfrk/envguard-lite` on npm.

The goal is to demonstrate:

- installing a published npm package,
- importing and using its public API,
- environment variable validation,
- automatic type conversion,
- default values,
- enum validation,
- aggregated validation errors,
- fail-fast application startup.

---

## 3. What EnvGuard Lite does

EnvGuard Lite is a tiny, zero-dependency validator for environment variables.
You describe your variables in a schema and it:

| Feature | Behaviour |
| --- | --- |
| **Required variables** | Missing or empty values are reported |
| **Type conversion** | `string`, `number`, `boolean`, `url` |
| **Defaults** | Applied when a variable is missing, and validated |
| **Enums** | Value must be one of a fixed set of options |
| **Aggregated errors** | One `EnvValidationError` containing every failure |
| **No secret leakage** | Error messages never contain environment values |
| **No `.env` reading** | It is a pure function over the object you pass in |

In this project, dotenv loads `.env` into `process.env`, and EnvGuard Lite
validates the result. Each tool does one job.

---

## 4. Technologies used

| Technology | Version | Purpose |
| --- | --- | --- |
| Node.js | 20+ (verified on v24) | Runtime, ESM, built-in test runner |
| Express.js | 5.x | HTTP server and routes |
| @wombatfrk/envguard-lite | 1.0.0 | Environment validation |
| dotenv | 18.x | Loads `.env` into `process.env` |
| node:test + node:assert | built-in | Tests, no test framework dependency |

The project uses **ES Modules** (`"type": "module"`), so every import is ESM.

---

## 5. Installation

```bash
git clone https://github.com/Wombatfreak6/envguard-demo.git
cd envguard-demo
npm install
```

Or install the dependencies explicitly:

```bash
npm install express dotenv @wombatfrk/envguard-lite
```

`@wombatfrk/envguard-lite` is a **runtime dependency** — it appears in
`dependencies`, not `devDependencies`, because the application needs it to boot.

Verify the installed package:

```bash
npm ls @wombatfrk/envguard-lite
```

```text
envguard-demo@1.0.0
└── @wombatfrk/envguard-lite@1.0.0
```

The lockfile records the registry tarball, which proves this is the published
package and not a local path:

```text
https://registry.npmjs.org/@wombatfrk/envguard-lite/-/envguard-lite-1.0.0.tgz
```

---

## 6. Environment setup

Copy the example file and adjust the values:

```bash
cp .env.example .env
```

`.env.example`:

```dotenv
PORT=3000
DATABASE_URL=postgresql://localhost:5432/envguard_demo
JWT_SECRET=replace-this-with-a-local-secret
NODE_ENV=development
```

- `.env` is listed in `.gitignore` and must never be committed.
- Values are only checked for shape; no database connection is opened and
  `JWT_SECRET` is never used to sign anything in this demo.

---

## 7. Project structure

```text
envguard-demo/
├── src/
│   ├── config.js                # Schema + loadConfig() + default config
│   ├── app.js                   # Express app factory (routes)
│   └── server.js                # Entry point: dotenv → config → listen
├── scripts/
│   └── test-invalid-config.js   # Demonstrates aggregated validation errors
├── tests/
│   └── config.test.js           # node:test suite for loadConfig()
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 8. How EnvGuard is integrated

### The schema

`src/config.js` declares every variable once:

```js
import { validateEnv, EnvValidationError } from "@wombatfrk/envguard-lite";

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
```

### The loader

`loadConfig(env)` validates the object it is given and returns a plain
configuration object. It handles `EnvValidationError` separately from
unexpected errors, and it never logs environment values:

```js
export function loadConfig(env = process.env) {
  try {
    return validateEnv(configSchema, env);
  } catch (error) {
    if (error instanceof EnvValidationError) {
      throw error; // aggregated, value-free message from EnvGuard
    }

    throw new Error(
      `Unexpected error while loading configuration: ${error.message}`,
      { cause: error },
    );
  }
}
```

Because `env` is a parameter, tests pass plain objects and never touch
`process.env`:

```js
const config = loadConfig({ DATABASE_URL: "https://example.com", JWT_SECRET: "s" });
```

### The default configuration

`src/config.js` also exports the application's default configuration:

```js
export const config = {
  get PORT() { return getConfig().PORT; },
  get DATABASE_URL() { return getConfig().DATABASE_URL; },
  get JWT_SECRET() { return getConfig().JWT_SECRET; },
  get NODE_ENV() { return getConfig().NODE_ENV; },
};
```

`getConfig()` validates `process.env` once, on first access. Validation is
deferred until then so that importing the module in tests does not validate the
developer's machine.

### Startup

`src/server.js` loads dotenv first, then starts the server with the validated
configuration and prints a startup message:

```js
import "dotenv/config";
import { EnvValidationError } from "@wombatfrk/envguard-lite";
import { config } from "./config.js";
import { createApp } from "./app.js";
```

If EnvGuard throws, the aggregated message is printed and the process exits
with code `1` — the server never starts.

### Injecting configuration

`createApp(config)` receives the configuration object. Route handlers never read
`process.env`; they use the injected values only.

---

## 9. Code examples

Validating a custom object and reading types:

```js
import { loadConfig } from "./src/config.js";

const config = loadConfig({
  PORT: "8080",
  DATABASE_URL: "postgresql://localhost:5432/envguard_demo",
  JWT_SECRET: "local-secret",
});

console.log(config.PORT); // 8080
console.log(typeof config.PORT); // "number"
console.log(config.NODE_ENV); // "development" (default applied)
```

Building the app without starting a listener (useful in tests):

```js
import { createApp } from "./src/app.js";
import { loadConfig } from "./src/config.js";

const config = loadConfig({
  DATABASE_URL: "https://example.com",
  JWT_SECRET: "local-secret",
});

const app = createApp(config); // ready to be mounted or tested
```

---

## 10. Successful startup demonstration

With a valid `.env`:

```bash
npm start
```

```text
> envguard-demo@1.0.0 start
> node src/server.js

EnvGuard Demo API listening on port 3000 (development)
Health check: http://localhost:3000/health
```

With an invalid environment, startup is aborted instead:

```text
Startup aborted: invalid environment configuration.

Environment validation failed with 3 errors:
  - PORT: must be a valid number.
  - DATABASE_URL: must be a valid absolute URL.
  - JWT_SECRET: is required but was not set.
```

Exit code: `1`.

---

## 11. Invalid configuration demonstration

`scripts/test-invalid-config.js` deliberately supplies a broken environment:

```js
const invalidEnv = {
  PORT: "invalid-number",
  DATABASE_URL: "localhost:5432",
  // JWT_SECRET is deliberately omitted.
  NODE_ENV: "development",
};
```

Run it with:

```bash
npm run demo:fail
```

Output:

```text
EnvGuard rejected the configuration.
No server was started.

Environment validation failed with 3 errors:
  - PORT: must be a valid number.
  - DATABASE_URL: must be a valid absolute URL.
  - JWT_SECRET: is required but was not set.

  kind=type variable=PORT
  kind=type variable=DATABASE_URL
  kind=missing variable=JWT_SECRET
```

The script never starts Express and exits with code `1`, which makes it safe to
use in CI as a "this must fail" check.

---

## 12. API endpoints and example responses

### `GET /`

Service identification.

```bash
curl http://localhost:3000/
```

```json
{
  "message": "EnvGuard Demo API",
  "package": "@wombatfrk/envguard-lite"
}
```

### `GET /health`

Health check built from validated configuration values.

```bash
curl http://localhost:3000/health
```

```json
{
  "status": "ok",
  "environment": "development",
  "port": 3000
}
```

### `GET /config/status`

Safe configuration metadata. It reports **whether** secrets are set, never their
values.

```bash
curl http://localhost:3000/config/status
```

```json
{
  "environment": "development",
  "port": 3000,
  "portType": "number",
  "databaseUrlConfigured": true,
  "jwtSecretConfigured": true
}
```

`DATABASE_URL` and `JWT_SECRET` are compared against `undefined`/empty only; the
actual strings are never serialised into a response, log line or error message.

---

## 13. Running tests

```bash
npm test
```

```text
✔ applies the default PORT of 3000 when PORT is missing
✔ converts PORT from a string into a number
✔ requires DATABASE_URL
✔ requires JWT_SECRET
✔ defaults NODE_ENV to development
✔ accepts a fully valid configuration
✔ rejects a PORT that is not a number
✔ rejects a DATABASE_URL that is not an absolute URL
✔ reports every validation error in a single aggregated error
ℹ tests 9
ℹ pass 9
ℹ fail 0
```

The suite uses the built-in `node:test` and `node:assert` modules only. Every
test calls `loadConfig()` with an explicit environment object, so no `.env` file,
no database and no `process.env` mutation is involved.

> **Note on the `test` script:** it is `node --test "tests/**/*.test.js"` rather
> than a bare `node --test`. Node's default discovery also matches
> `scripts/test-invalid-config.js` (the `test-*.js` pattern), and that script
> intentionally exits with code `1`, which would be reported as a failing test.
> Scoping the glob keeps the demonstration script out of the suite.

---

## 14. How to use the published npm package

In any ES Module project:

```bash
npm install @wombatfrk/envguard-lite
```

Then:

```js
import { validateEnv, EnvValidationError } from "@wombatfrk/envguard-lite";

try {
  const config = validateEnv({
    PORT: { type: "number", default: 3000 },
    DATABASE_URL: { type: "url", required: true },
    JWT_SECRET: { type: "string", required: true },
    NODE_ENV: {
      type: "string",
      enum: ["development", "production", "test"],
      default: "development",
    },
  });

  console.log(config.PORT, typeof config.PORT); // 3000 "number"
} catch (error) {
  if (error instanceof EnvValidationError) {
    console.error(error.message); // all failures at once, no values
    process.exit(1);
  }
  throw error;
}
```

Requirements: Node.js 18+, ES Modules only. EnvGuard Lite does not read `.env`
files — load them with dotenv or `node --env-file=.env` before validating.

---

## 15. Original npm package

**npm:** <https://www.npmjs.com/package/@wombatfrk/envguard-lite>

```bash
npm install @wombatfrk/envguard-lite
```

---

## 16. Original EnvGuard GitHub repository

**GitHub:** <https://github.com/Wombatfreak6/envguard-lite>

The source repository contains the package implementation, its own tests and
documentation. This demo project does not modify it.

---

## License

MIT
