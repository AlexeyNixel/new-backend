-- Baseline: `navigation_items`.`updatedAt` already has `DEFAULT
-- CURRENT_TIMESTAMP(3)` on the database, but the original init migration
-- created it without a default. This migration records that fact in the
-- migration history to match the already-applied state.
ALTER TABLE `navigation_items` MODIFY `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
