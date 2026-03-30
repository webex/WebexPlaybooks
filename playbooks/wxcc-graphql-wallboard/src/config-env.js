/**
 * Load `.env` from this directory before any other app modules read `process.env`.
 * Invoked via `node --import ./config-env.js server.js` (see package.json).
 * Plain `import "dotenv/config"` in server.js is unreliable in ESM because sibling
 * imports may run before dotenv (evaluation order is not source-order guaranteed).
 */
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });
