#!/usr/bin/env bash
# Railway/Linux build — switches Prisma to Postgres when DATABASE_URL is postgresql://
set -euo pipefail

SCHEMA="apps/web/prisma/schema.prisma"

if [[ "${DATABASE_URL:-}" == postgresql* ]]; then
  echo "DATABASE_URL is Postgres — using postgresql provider"
  sed -i 's/provider = "sqlite"/provider = "postgresql"/' "$SCHEMA"
else
  echo "WARNING: DATABASE_URL is not Postgres. Railway needs a linked PostgreSQL service."
fi

npm install
npm run build

if [[ "${DATABASE_URL:-}" == postgresql* ]]; then
  echo "Pushing schema and seeding database..."
  npm run db:push -w @acuity/web
  npm run db:seed -w @acuity/web
fi

echo "Railway build complete."
