import { config as loadEnv } from "dotenv";
import path from "path";
import { defineConfig, env } from "prisma/config";

// Resolved against this file's own location, not process.cwd(). On cPanel's Node.js Selector
// (CloudLinux), node_modules is a symlink into ~/nodevenv/.../lib/node_modules, and running
// `npm install` there leaves the postinstall `prisma generate` step with a cwd under that
// symlinked venv path instead of the real project root - a plain relative "prisma/schema.prisma"
// then fails to resolve and prisma generate errors with "Could not find Prisma Schema".
// __dirname always points at the real project root (where this config file lives) regardless
// of cwd, so every path below (including .env, which `env()` below needs already loaded) is
// built from it instead of the bare cwd-relative `import "dotenv/config"`.
const envPath = path.join(__dirname, ".env");
const envResult = loadEnv({ path: envPath });

// A missing .env is not itself fatal - env vars may come from the hosting platform directly
// (e.g. cPanel's "Setup Node.js App" panel lets you set them with no .env file on disk at
// all). But surface it loudly rather than staying silent: on the host that prompted this file's
// __dirname fix, a failure at this exact point previously surfaced downstream as a misleading
// "Could not find Prisma Schema" error instead of the real cause - see docs/decisions.md ADR 13.
if (envResult.error) {
  const isMissingFile =
    envResult.error instanceof Error && (envResult.error as NodeJS.ErrnoException).code === "ENOENT";
  if (isMissingFile) {
    console.warn(`[prisma.config.ts] No .env file at ${envPath} - relying on process.env only.`);
  } else {
    console.warn(`[prisma.config.ts] Failed to read ${envPath}:`, envResult.error);
  }
}

let databaseUrl: string;
try {
  databaseUrl = env("DATABASE_URL");
} catch (error) {
  console.error(
    `[prisma.config.ts] DATABASE_URL is not set. Checked ${envPath} and process.env directly. ` +
      "Set it in .env (see .env.example) for local dev, or in the hosting platform's " +
      "environment variables for a deployed environment (docs/README.md §5).",
  );
  throw error;
}

export default defineConfig({
  schema: path.join(__dirname, "prisma/schema.prisma"),
  migrations: {
    path: path.join(__dirname, "prisma/migrations"),
    seed: `tsx ${path.join(__dirname, "prisma/seed.ts")}`,
  },
  datasource: {
    url: databaseUrl,
  },
});
