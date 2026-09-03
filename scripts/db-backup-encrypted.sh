#!/bin/sh
set -eu
umask 077

usage() {
  echo "Usage: $0 --database SOURCE_DATABASE --output ARCHIVE.dump.age" >&2
  exit 2
}

emit_failure() {
  printf '%s\n' '{"status":"failed","operation":"encrypted_backup"}' >&2
}

completed=0
temporary_directory=''
temporary_publish_directory=''
temporary_encrypted_archive=''
temporary_encrypted_checksum=''
published_archive=0
published_checksum=0
output=''
encrypted_checksum=''
cleanup() {
  status=$?
  trap - EXIT HUP INT TERM
  [ -z "$temporary_directory" ] || rm -rf "$temporary_directory"
  [ -z "$temporary_publish_directory" ] || rm -rf "$temporary_publish_directory"
  if [ "$completed" -ne 1 ]; then
    [ "$published_archive" -ne 1 ] || rm -f "$output"
    [ "$published_checksum" -ne 1 ] || rm -f "$encrypted_checksum"
    emit_failure
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

database=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    --database) [ "$#" -ge 2 ] || usage; database=$2; shift 2 ;;
    --output) [ "$#" -ge 2 ] || usage; output=$2; shift 2 ;;
    *) usage ;;
  esac
done

[ -n "$database" ] && [ -n "$output" ] || usage
case "$database" in *[!A-Za-z0-9_]*) echo 'Database name must contain only letters, numbers, and underscores.' >&2; exit 2 ;; esac
[ -n "${AGE_RECIPIENT:-}" ] || { echo 'AGE_RECIPIENT must contain one literal age recipient.' >&2; exit 1; }
command -v age >/dev/null 2>&1 || { echo 'age CLI is required.' >&2; exit 1; }
command -v mktemp >/dev/null 2>&1 || { echo 'mktemp is required.' >&2; exit 1; }

script_directory=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
backup_script="$script_directory/db-backup.sh"
[ -f "$backup_script" ] || { echo "Existing backup script does not exist: $backup_script" >&2; exit 1; }

parent=$(dirname "$output")
[ -d "$parent" ] || { echo "Output directory does not exist: $parent" >&2; exit 1; }
encrypted_checksum="$output.sha256.age"
[ ! -e "$output" ] || { echo "Refusing to overwrite $output" >&2; exit 1; }
[ ! -e "$encrypted_checksum" ] || { echo "Refusing to overwrite $encrypted_checksum" >&2; exit 1; }

temporary_root=${TMPDIR:-/tmp}
[ -d "$temporary_root" ] || { echo "Temporary directory does not exist: $temporary_root" >&2; exit 1; }
temporary_directory=$(mktemp -d "$temporary_root/learnspace-encrypted-backup.XXXXXX")
temporary_publish_directory=$(mktemp -d "$parent/.learnspace-encrypted-publish.XXXXXX")
plaintext_archive="$temporary_directory/backup.dump"
temporary_encrypted_archive="$temporary_publish_directory/archive.age"
temporary_encrypted_checksum="$temporary_publish_directory/checksum.age"

sh "$backup_script" --database "$database" --output "$plaintext_archive"
age -r "$AGE_RECIPIENT" -o "$temporary_encrypted_archive" "$plaintext_archive"
age -r "$AGE_RECIPIENT" -o "$temporary_encrypted_checksum" "$plaintext_archive.sha256"

[ ! -e "$output" ] || { echo "Output appeared during backup; refusing to overwrite $output" >&2; exit 1; }
[ ! -e "$encrypted_checksum" ] || { echo "Output appeared during backup; refusing to overwrite $encrypted_checksum" >&2; exit 1; }
ln "$temporary_encrypted_archive" "$output"
published_archive=1
rm -f "$temporary_encrypted_archive"
ln "$temporary_encrypted_checksum" "$encrypted_checksum"
published_checksum=1
rm -f "$temporary_encrypted_checksum"

completed=1
printf '%s\n' '{"status":"ok","operation":"encrypted_backup"}'
