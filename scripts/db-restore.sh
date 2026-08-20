#!/bin/sh
set -eu
umask 077

usage() {
  echo "Usage: $0 --archive ARCHIVE.dump --database TARGET_DATABASE" >&2
  exit 2
}

archive=''
database=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    --archive) [ "$#" -ge 2 ] || usage; archive=$2; shift 2 ;;
    --database) [ "$#" -ge 2 ] || usage; database=$2; shift 2 ;;
    *) usage ;;
  esac
done

[ -n "$archive" ] && [ -n "$database" ] || usage
[ -f "$archive" ] || { echo "Archive does not exist: $archive" >&2; exit 1; }
case "$database" in *[!A-Za-z0-9_]*) echo 'Database name must contain only letters, numbers, and underscores.' >&2; exit 2 ;; esac
case "$database" in postgres|template0|template1) echo "Refusing protected target database: $database" >&2; exit 1 ;; esac

[ -f "$archive.sha256" ] || {
  echo "Checksum sidecar does not exist: $archive.sha256" >&2
  exit 1
}
if command -v shasum >/dev/null 2>&1; then
  (cd "$(dirname "$archive")" && shasum -a 256 -c "$(basename "$archive").sha256")
elif command -v sha256sum >/dev/null 2>&1; then
  (cd "$(dirname "$archive")" && sha256sum -c "$(basename "$archive").sha256")
else
  echo 'Cannot verify checksum: no SHA-256 utility found.' >&2
  exit 1
fi

container=$(docker compose ps -q db)
[ -n "$container" ] || { echo 'Compose db service is not running.' >&2; exit 1; }
user=$(docker compose exec -T db sh -c 'printf %s "$POSTGRES_USER"')
primary=$(docker compose exec -T db sh -c 'printf %s "$POSTGRES_DB"')
[ "$database" != "$primary" ] || { echo 'Refusing to restore into the configured primary database.' >&2; exit 1; }
docker compose exec -T db pg_restore --list < "$archive" >/dev/null
if docker compose exec -T db psql -U "$user" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$database'" | grep -qx 1; then
  echo "Refusing existing target database: $database" >&2
  exit 1
fi

docker compose exec -T db createdb -U "$user" --template=template0 "$database"
cleanup() {
  docker compose exec -T db dropdb -U "$user" --if-exists "$database" >/dev/null 2>&1 || true
}
trap cleanup EXIT HUP INT TERM

docker compose exec -T db pg_restore -U "$user" --dbname="$database" --exit-on-error --single-transaction --no-owner --no-privileges < "$archive"
docker compose exec -T db psql -U "$user" -d "$database" -c ANALYZE >/dev/null
trap - EXIT HUP INT TERM
printf 'Restore completed into disposable database: %s\nVerify it, then remove it with:\n  docker compose exec -T db dropdb -U %s %s\n' "$database" "$user" "$database"
