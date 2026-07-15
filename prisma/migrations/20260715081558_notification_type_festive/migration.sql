-- Baseline: `festive` was added to `notifications`.`type` enum directly on
-- the database (commit 1961a20 "Новый тип уведомления") without generating
-- a migration file. This migration only records that fact in the migration
-- history — the DB already has this value, so the ALTER is written to match
-- the already-applied state and is a no-op when run against `nomb_dev`.
ALTER TABLE `notifications` MODIFY `type` ENUM('success', 'warning', 'error', 'festive') NOT NULL;
