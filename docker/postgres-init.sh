#!/bin/sh
set -e
for db in lumina_identity lumina_organization lumina_content lumina_ai lumina_sysadmin; do
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE $db"
done
