# Viora (ویورا)

Party-planning marketplace platform for Tehran — Sprint 0 project skeleton.

Full documentation, architecture decisions, and the original project brief live in
[`docs/README.md`](docs/README.md) — start there.

## Quick start

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL / AUTH_SESSION_SECRET
npm run db:migrate
npm run db:seed
npm run dev
```

Requires a local PostgreSQL instance. See [`docs/README.md`](docs/README.md) for the full
setup, configuration reference, and deployment notes.
