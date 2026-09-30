#!/bin/sh
# Runs the migration twice on a scratch Postgres with a stand-in for Supabase, then the access checks.
#   PGHOST=/var/tmp/sgp-pg PGPORT=5439 tests/sql/run.sh
set -e
cd "$(dirname "$0")/../.."
DB=${DB:-desk_test}
export PGOPTIONS='-c client_min_messages=warning'
psql -U postgres -qc "drop database if exists $DB" -c "create database $DB" postgres
psql -U postgres -d "$DB" -q -v ON_ERROR_STOP=1 -f tests/sql/supabase-stub.sql
psql -U postgres -d "$DB" -q -v ON_ERROR_STOP=1 -f supabase/migrations/20261001000000_desk.sql
psql -U postgres -d "$DB" -q -v ON_ERROR_STOP=1 -f supabase/migrations/20261001000000_desk.sql
psql -U postgres -d "$DB" -q -v ON_ERROR_STOP=1 -f tests/sql/test-access.sql
