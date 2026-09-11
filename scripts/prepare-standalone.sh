#!/bin/sh
# Finishes what `next build` (with output: "standalone" in next.config.ts) leaves undone:
# static assets aren't copied into .next/standalone by design (Next expects a CDN in front
# instead), so this does it by hand per the official guidance. Also strips any .env* file
# Next's file tracer pulled into the bundle - it does this for every build regardless of
# what's actually needed at runtime, which would otherwise ship whoever built it locally's
# DATABASE_URL/AUTH_SESSION_SECRET straight into the deploy artifact. See docs/decisions.md.
set -e

cd "$(dirname "$0")/.."

if [ ! -d .next/standalone ]; then
  echo "prepare-standalone: .next/standalone not found - run 'next build' first." >&2
  exit 1
fi

cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
# config/*.json is already bundled by Next's compiler wherever it's `import`ed, but
# result-template.txt is plain text with no such loader - lib/wizard/engine.ts reads it via
# fs.readFileSync(process.cwd() + ...) at runtime, so the whole directory needs to physically
# exist next to server.js. See docs/decisions.md ADR 22.
cp -r config .next/standalone/
rm -f .next/standalone/.env .next/standalone/.env.*

echo "prepare-standalone: .next/standalone is ready to deploy."
