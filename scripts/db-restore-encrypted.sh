#!/bin/sh
set -eu
umask 077

usage() {
  echo "Usage: $0 --archive ARCHIVE.dump.age --database TARGET_DATABASE" >&2
  exit 2
}

completed=0
temporary_directory=''
cleanup() {
  status=$?
  trap - EXIT HUP INT TERM
  [ -z "$temporary_directory" ] || rm -rf "$temporary_directory"
  if [ "$completed" -ne 1 ]; then
    printf '%s\n' '{"status":"failed","operation":"encrypted_restore"}' >&2
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

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
case "$database" in *[!A-Za-z0-9_]*) echo 'Database name must contain only letters, numbers, and underscores.' >&2; exit 2 ;; esac
case "$database" in postgres|template0|template1) echo "Refusing protected target database: $database" >&2; exit 1 ;; esac
[ -f "$archive" ] || { echo "Encrypted archive does not exist: $archive" >&2; exit 1; }
encrypted_checksum="$archive.sha256.age"
[ -f "$encrypted_checksum" ] || { echo "Encrypted checksum sidecar does not exist: $encrypted_checksum" >&2; exit 1; }
[ -n "${AGE_IDENTITY_FILE:-}" ] || { echo 'AGE_IDENTITY_FILE must name a readable age identity file.' >&2; exit 1; }
[ -r "$AGE_IDENTITY_FILE" ] || { echo "Age identity file is not readable: $AGE_IDENTITY_FILE" >&2; exit 1; }
command -v age >/dev/null 2>&1 || { echo 'age CLI is required.' >&2; exit 1; }
command -v mktemp >/dev/null 2>&1 || { echo 'mktemp is required.' >&2; exit 1; }

script_directory=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
restore_script="$script_directory/db-restore.sh"
[ -f "$restore_script" ] || { echo "Existing restore script does not exist: $restore_script" >&2; exit 1; }

temporary_root=${TMPDIR:-/tmp}
[ -d "$temporary_root" ] || { echo "Temporary directory does not exist: $temporary_root" >&2; exit 1; }
temporary_directory=$(mktemp -d "$temporary_root/learnspace-encrypted-restore.XXXXXX")
plaintext_archive="$temporary_directory/backup.dump"

age -d -i "$AGE_IDENTITY_FILE" -o "$plaintext_archive" "$archive"
age -d -i "$AGE_IDENTITY_FILE" -o "$plaintext_archive.sha256" "$encrypted_checksum"
sh "$restore_script" --archive "$plaintext_archive" --database "$database"

completed=1
printf '%s\n' '{"status":"ok","operation":"encrypted_restore"}'
