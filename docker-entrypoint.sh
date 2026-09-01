#!/bin/sh
set -e

# If running in all-in-one embedded mode (no external DATABASE_URL provided or pointing to localhost)
if [ -z "$DATABASE_URL" ] || echo "$DATABASE_URL" | grep -q "localhost\|127.0.0.1"; then
  echo "==> Initializing embedded PostgreSQL..."
  PGDATA="/data/postgres"
  
  if [ ! -d "$PGDATA" ]; then
    mkdir -p "$PGDATA" /app/storage
    chown -R postgres:postgres "$PGDATA"
    su - postgres -c "initdb -D $PGDATA --auth-local=trust --auth-host=trust"
  fi

  # Start PostgreSQL daemon
  echo "==> Starting PostgreSQL daemon..."
  su - postgres -c "pg_ctl -D $PGDATA -l /tmp/postgres.log start"
  
  # Ensure inknest database exists
  su - postgres -c "psql -d postgres -tc \"SELECT 1 FROM pg_database WHERE datname = 'inknest'\" | grep -q 1 || psql -d postgres -c 'CREATE DATABASE inknest;'"
  su - postgres -c "psql -d inknest -c 'CREATE EXTENSION IF NOT EXISTS vector;'"

  export DATABASE_URL="postgres://postgres@127.0.0.1:5432/inknest"
fi

# Run migrations
echo "==> Running database migrations..."
if [ -f "scripts/migrate.mjs" ]; then
  node scripts/migrate.mjs || echo "Migration step completed or skipped."
fi

# Start Next.js App
echo "==> Starting Inkest Server on port ${PORT:-3000}..."
exec node server.js
