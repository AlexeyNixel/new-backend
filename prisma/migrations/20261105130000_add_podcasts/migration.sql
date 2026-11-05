-- Аудио-подкасты: название + ссылка на аудиофайл (File.type = AUDIO) в хранилище Silo
-- CreateTable
CREATE TABLE `podcasts` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `description` TEXT NULL,
    `audioFileId` VARCHAR(191) NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `podcasts_audioFileId_idx`(`audioFileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `podcasts` ADD CONSTRAINT `podcasts_audioFileId_fkey` FOREIGN KEY (`audioFileId`) REFERENCES `files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
