# Database migration plan

## Current evidence

- Hibernate currently owns schema changes through `ddl-auto=update`.
- The application also performs two legacy `users` column compatibility changes during startup.
- `schema/reference-schema-2026-10-19.sql` was generated from the current application against a disposable MySQL 8 instance.
- The reference dump restores successfully into an empty database with the same 11 tables and 105 columns.
- This reference is derived from the code. It is not a production dump and cannot establish whether production contains legacy columns, extra indexes, or schema drift.

## Required production baseline

Run these steps from the database host or another trusted administrative host. Do not copy database credentials into shell history.

1. Put the application into a short maintenance window so no writes occur after the backup starts.
2. Run `backend/scripts/backup_database.sh` with credentials supplied by a protected environment or secret store.
3. Store the SQL dump, SHA-256 file, and table counts outside the database host.
4. Capture `SHOW CREATE TABLE` for every table and compare it with the reference schema.
5. Restore the backup into a disposable MySQL 8 database and compare table counts and critical row counts.
6. Start the current application against the restored copy with `SPRING_JPA_DDL_AUTO=validate`. Resolve every mismatch before adding Flyway.

Production remains on `update` until these steps are complete because changing to `validate` without the real baseline can prevent startup.

## Flyway introduction

After the restored copy validates:

1. Add Flyway and the MySQL Flyway module.
2. Convert the verified production schema into `V1__baseline.sql`. Remove environment-specific definers and volatile dump metadata.
3. Move the two startup compatibility alterations into an idempotent versioned migration.
4. Run Flyway `baseline` on the restored database only, using version 1.
5. Set `ddl-auto=validate` and run the full application and integration suite against that restored copy.
6. Test upgrade from a second fresh copy of the production backup and compare schema plus row counts.
7. Schedule production migration only after review of the generated SQL and recovery rehearsal.

Do not enable `baselineOnMigrate` automatically in production. An incorrect empty schema or connection target could otherwise be accepted silently.

## Recovery procedure

If a migration fails before application traffic resumes, stop the new application, preserve the failed database for diagnosis, create a clean database, and restore the verified pre-migration dump. Verify its checksum and table counts, then restart the previous application image with its previous environment.

If traffic has resumed and new writes exist, do not overwrite the database blindly. Stop writes, take another backup, determine whether a forward repair can preserve the new rows, and restore only after the data-loss decision is explicit.
