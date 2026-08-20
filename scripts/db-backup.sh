#!/bin/sh
set -eu
umask 077

usage() {
  echo "Usage: $0 --database SOURCE_DATABASE --output ARCHIVE.dump" >&2
  exit 2
}

database=''
output=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    --database) [ "$#" -ge 2 ] || usage; database=$2; shift 2 ;;
    --output) [ "$#" -ge 2 ] || usage; output=$2; shift 2 ;;
    *) usage ;;
  esac
done

[ -n "$database" ] && [ -n "$output" ] || usage
case "$database" in *[!A-Za-z0-9_]*) echo 'Database name must contain only letters, numbers, and underscores.' >&2; exit 2 ;; esac
[ ! -e "$output" ] || { echo "Refusing to overwrite $output" >&2; exit 1; }
[ ! -e "$output.sha256" ] || { echo "Refusing to overwrite $output.sha256" >&2; exit 1; }
parent=$(dirname "$output")
[ -d "$parent" ] || { echo "Output directory does not exist: $parent" >&2; exit 1; }

container=$(docker compose ps -q db)
[ -n "$container" ] || { echo 'Compose db service is not running.' >&2; exit 1; }
user=$(docker compose exec -T db sh -c 'printf %s "$POSTGRES_USER"')
if ! database_exists=$(docker compose exec -T db psql -U "$user" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$database'"); then
  echo 'Failed to query the Compose db service for the source database.' >&2
  exit 1
fi
[ "$database_exists" = '1' ] || {
  echo "Source database does not exist: $database" >&2
  exit 1
}

archive_name=$(basename "$output")
temporary_archive="$parent/.$archive_name.tmp"
temporary_checksum="$parent/.$archive_name.sha256.tmp"
cleanup() {
  rm -f "$temporary_archive" "$temporary_checksum" "$output" "$output.sha256"
}
trap cleanup EXIT HUP INT TERM

docker compose exec -T db pg_dump -U "$user" --format=custom --compress=6 --no-owner --no-privileges "$database" > "$temporary_archive"
docker compose exec -T db pg_restore --list < "$temporary_archive" >/dev/null
if command -v shasum >/dev/null 2>&1; then
  checksum_output=$(shasum -a 256 "$temporary_archive")
elif command -v sha256sum >/dev/null 2>&1; then
  checksum_output=$(sha256sum "$temporary_archive")
else
  echo 'No SHA-256 utility found; backup was not published.' >&2
  exit 1
fi
checksum=${checksum_output%% *}
printf '%s  %s\n' "$checksum" "$archive_name" > "$temporary_checksum"
mv "$temporary_archive" "$output"
mv "$temporary_checksum" "$output.sha256"
trap - EXIT HUP INT TERM
printf 'Backup created: %s\nChecksum: %s\nSource database: %s\n' "$output" "$output.sha256" "$database"
