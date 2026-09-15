-- CreateTable
CREATE TABLE `comics` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(300) NOT NULL,
    `title` VARCHAR(256) NOT NULL,
    `description` LONGTEXT NULL,
    `content` LONGTEXT NULL,
    `author` VARCHAR(200) NULL,
    `illustrator` VARCHAR(200) NULL,
    `volumeNumber` INTEGER NULL,
    `year` INTEGER NULL,
    `ageRating` INTEGER NULL,
    `externalLink` VARCHAR(500) NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `seriesId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `comics_slug_key`(`slug`),
    INDEX `comics_seriesId_idx`(`seriesId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comic_images` (
    `id` VARCHAR(191) NOT NULL,
    `comicId` VARCHAR(191) NOT NULL,
    `fileId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    INDEX `comic_images_comicId_idx`(`comicId`),
    INDEX `comic_images_fileId_fkey`(`fileId`),
    UNIQUE INDEX `comic_images_comicId_fileId_key`(`comicId`, `fileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comic_genres` (
    `id` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(32) NOT NULL,
    `title` VARCHAR(64) NOT NULL,

    UNIQUE INDEX `comic_genres_tag_key`(`tag`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `genres_on_comics` (
    `comicId` VARCHAR(191) NOT NULL,
    `genreId` VARCHAR(191) NOT NULL,

    INDEX `genres_on_comics_genreId_fkey`(`genreId`),
    PRIMARY KEY (`comicId`, `genreId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comic_series` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(300) NOT NULL,
    `title` VARCHAR(256) NOT NULL,
    `description` VARCHAR(1024) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `comic_series_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `comics` ADD CONSTRAINT `comics_seriesId_fkey` FOREIGN KEY (`seriesId`) REFERENCES `comic_series`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comic_images` ADD CONSTRAINT `comic_images_comicId_fkey` FOREIGN KEY (`comicId`) REFERENCES `comics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comic_images` ADD CONSTRAINT `comic_images_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `files`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `genres_on_comics` ADD CONSTRAINT `genres_on_comics_comicId_fkey` FOREIGN KEY (`comicId`) REFERENCES `comics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `genres_on_comics` ADD CONSTRAINT `genres_on_comics_genreId_fkey` FOREIGN KEY (`genreId`) REFERENCES `comic_genres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
