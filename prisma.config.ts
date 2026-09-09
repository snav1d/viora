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
loadEnv({ path: path.join(__dirname, ".env") });

export default defineConfig({
  schema: path.join(__dirname, "prisma/schema.prisma"),
  migrations: {
    path: path.join(__dirname, "prisma/migrations"),
    seed: `tsx ${path.join(__dirname, "prisma/seed.ts")}`,
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
