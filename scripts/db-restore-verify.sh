#!/bin/sh
set -eu
umask 077

usage() {
  echo "Usage: $0 --archive ARCHIVE.dump.age --database DISPOSABLE_DATABASE" >&2
  exit 2
}

completed=0
restored=0
database=''
user=''
cleanup() {
  status=$?
  trap - EXIT HUP INT TERM
  if [ "$restored" -eq 1 ]; then
    if ! docker compose exec -T db dropdb -U "$user" --if-exists "$database" >/dev/null 2>&1; then
      echo "Failed to remove disposable verification database: $database" >&2
      status=1
    fi
  fi
  if [ "$completed" -ne 1 ] || [ "$status" -ne 0 ]; then
    printf '%s\n' '{"status":"failed","operation":"restore_verify"}' >&2
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

archive=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    --archive) [ "$#" -ge 2 ] || usage; archive=$2; shift 2 ;;
    --database) [ "$#" -ge 2 ] || usage; database=$2; shift 2 ;;
    *) usage ;;
  esac
done

[ -n "$archive" ] && [ -n "$database" ] || usage
case "$database" in *[!A-Za-z0-9_]*) echo 'Database name must contain only letters, numbers, and underscores.' >&2; exit 2 ;; esac
case "$database" in postgres|template0|template1) echo "Refusing protected target database: $database" >&2; exit 1 ;; esac
case "$database" in *_restore_verify_*|restore_verify_*) : ;; *) echo 'Verification database name must include restore_verify_.' >&2; exit 2 ;; esac

script_directory=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
restore_script="$script_directory/db-restore-encrypted.sh"
[ -f "$restore_script" ] || { echo "Encrypted restore script does not exist: $restore_script" >&2; exit 1; }

container=$(docker compose ps -q db)
[ -n "$container" ] || { echo 'Compose db service is not running.' >&2; exit 1; }
user=$(docker compose exec -T db sh -c 'printf %s "$POSTGRES_USER"')
primary=$(docker compose exec -T db sh -c 'printf %s "$POSTGRES_DB"')
[ "$database" != "$primary" ] || { echo 'Refusing to verify the configured primary database.' >&2; exit 1; }

started_at=$(date +%s)
sh "$restore_script" --archive "$archive" --database "$database"
restored=1

migration_table=$(docker compose exec -T db psql -U "$user" -d "$database" -tAc "SELECT CASE WHEN to_regclass('public._prisma_migrations') IS NULL THEN 0 ELSE 1 END")
[ "$migration_table" = '1' ] || { echo 'Restored database is missing the Prisma migration table.' >&2; exit 1; }
successful_migrations=$(docker compose exec -T db psql -U "$user" -d "$database" -tAc 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')
[ "$successful_migrations" -gt 0 ] 2>/dev/null || { echo 'Restored database has no successful Prisma migrations.' >&2; exit 1; }
incomplete_migrations=$(docker compose exec -T db psql -U "$user" -d "$database" -tAc 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL')
[ "$incomplete_migrations" = '0' ] || { echo 'Restored database contains an incomplete Prisma migration.' >&2; exit 1; }
public_tables=$(docker compose exec -T db psql -U "$user" -d "$database" -tAc "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'")
[ "$public_tables" -gt 0 ] 2>/dev/null || { echo 'Restored database has no application tables.' >&2; exit 1; }

if [ -n "${RESTORE_VERIFY_SQL:-}" ] || [ -n "${RESTORE_VERIFY_EXPECTED:-}" ]; then
  [ -n "${RESTORE_VERIFY_SQL:-}" ] && [ -n "${RESTORE_VERIFY_EXPECTED:-}" ] || {
    echo 'RESTORE_VERIFY_SQL and RESTORE_VERIFY_EXPECTED must be set together.' >&2
    exit 1
  }
  verification_result=$(docker compose exec -T db psql -U "$user" -d "$database" -tAc "$RESTORE_VERIFY_SQL")
  [ "$verification_result" = "$RESTORE_VERIFY_EXPECTED" ] || {
    echo 'Operator-configured restore verification did not return the expected value.' >&2
    exit 1
  }
fi

docker compose exec -T db dropdb -U "$user" --if-exists "$database" >/dev/null
restored=0
finished_at=$(date +%s)
elapsed_seconds=$((finished_at - started_at))
completed=1
printf '{"status":"ok","operation":"restore_verify","elapsed_seconds":%s}\n' "$elapsed_seconds"
