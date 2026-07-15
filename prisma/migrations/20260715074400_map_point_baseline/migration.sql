-- Baseline: the `map_points` table was created directly on the database
-- (commit a592bb5 "Реализовать точки на карте для литкарты" and follow-ups)
-- without ever generating a migration file. This migration records its
-- original shape (before the `image` -> `imageFileId` rename done in
-- 20260715074432_map_point_image_relation) so the migration history can be
-- replayed from scratch (e.g. against the shadow database).
CREATE TABLE `map_points` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` VARCHAR(500) NULL,
    `image` VARCHAR(500) NULL,
    `content` LONGTEXT NULL,
    `lat` DOUBLE NOT NULL,
    `lng` DOUBLE NOT NULL,
    `preset` VARCHAR(100) NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
