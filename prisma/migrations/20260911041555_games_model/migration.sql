-- Снимаем вьюхи, читавшие внешнюю БД nomb_games — заменяются настоящими
-- таблицами ниже. Вьюхи создавались вне миграций (как и часть других
-- вьюх в проекте), поэтому Prisma не сгенерировала DROP VIEW сама.
DROP VIEW IF EXISTS `games`;
DROP VIEW IF EXISTS `genres`;

-- CreateTable
CREATE TABLE `games` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(300) NOT NULL,
    `externalId` VARCHAR(32) NULL,
    `title` VARCHAR(256) NOT NULL,
    `shortDescription` VARCHAR(512) NULL,
    `description` LONGTEXT NULL,
    `playerMin` INTEGER NULL,
    `playerMax` INTEGER NULL,
    `playerAge` INTEGER NULL,
    `durationMin` INTEGER NULL,
    `durationMax` INTEGER NULL,
    `year` INTEGER NULL,
    `status` ENUM('IN_STOCK', 'ON_HANDS', 'TEMPORARILY_UNAVAILABLE', 'WRITTEN_OFF', 'LOST', 'DAMAGED') NOT NULL DEFAULT 'IN_STOCK',
    `place` VARCHAR(512) NULL,
    `comment` VARCHAR(1024) NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `videoUrl` VARCHAR(500) NULL,
    `seriesId` VARCHAR(191) NULL,
    `rulesFileId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `games_slug_key`(`slug`),
    UNIQUE INDEX `games_externalId_key`(`externalId`),
    INDEX `games_seriesId_idx`(`seriesId`),
    INDEX `games_rulesFileId_idx`(`rulesFileId`),
    FULLTEXT INDEX `games_title_shortDescription_description_idx`(`title`, `shortDescription`, `description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `game_images` (
    `id` VARCHAR(191) NOT NULL,
    `gameId` VARCHAR(191) NOT NULL,
    `fileId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    INDEX `game_images_gameId_idx`(`gameId`),
    INDEX `game_images_fileId_fkey`(`fileId`),
    UNIQUE INDEX `game_images_gameId_fileId_key`(`gameId`, `fileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `game_genres` (
    `id` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(32) NOT NULL,
    `title` VARCHAR(64) NOT NULL,

    UNIQUE INDEX `game_genres_tag_key`(`tag`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `genres_on_games` (
    `gameId` VARCHAR(191) NOT NULL,
    `genreId` VARCHAR(191) NOT NULL,

    INDEX `genres_on_games_genreId_fkey`(`genreId`),
    PRIMARY KEY (`gameId`, `genreId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `game_series` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(300) NOT NULL,
    `title` VARCHAR(256) NOT NULL,
    `description` VARCHAR(1024) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `game_series_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `games` ADD CONSTRAINT `games_seriesId_fkey` FOREIGN KEY (`seriesId`) REFERENCES `game_series`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `games` ADD CONSTRAINT `games_rulesFileId_fkey` FOREIGN KEY (`rulesFileId`) REFERENCES `files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `game_images` ADD CONSTRAINT `game_images_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `games`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `game_images` ADD CONSTRAINT `game_images_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `files`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `genres_on_games` ADD CONSTRAINT `genres_on_games_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `games`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `genres_on_games` ADD CONSTRAINT `genres_on_games_genreId_fkey` FOREIGN KEY (`genreId`) REFERENCES `game_genres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
