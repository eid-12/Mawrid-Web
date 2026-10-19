#!/usr/bin/env bash
set -euo pipefail

: "${DB_HOST:?Set DB_HOST}"
: "${DB_PORT:=3306}"
: "${DB_NAME:?Set DB_NAME}"
: "${DB_USER:?Set DB_USER}"
: "${DB_PASSWORD:?Set DB_PASSWORD}"

if [[ ! "${DB_NAME}" =~ ^[A-Za-z0-9_]+$ ]]; then
  printf 'DB_NAME must contain only letters, digits, and underscores\n' >&2
  exit 1
fi

backup_dir="${BACKUP_DIR:-./backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="${backup_dir}/${DB_NAME}-${timestamp}.sql"

umask 077
mkdir -p "${backup_dir}"
export MYSQL_PWD="${DB_PASSWORD}"
trap 'unset MYSQL_PWD' EXIT

mysqldump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --user="${DB_USER}" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  --set-gtid-purged=OFF \
  --databases "${DB_NAME}" > "${backup_file}"

sha256sum "${backup_file}" > "${backup_file}.sha256"
mysql --host="${DB_HOST}" --port="${DB_PORT}" --user="${DB_USER}" \
  --batch --skip-column-names \
  --execute="SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA='${DB_NAME}' ORDER BY TABLE_NAME" \
  > "${backup_file}.table-counts.tsv"

printf 'Backup written to %s\n' "${backup_file}"
