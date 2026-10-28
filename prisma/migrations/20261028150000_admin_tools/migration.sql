-- Инструменты админки: пользователи, выставки, статистика коротких ссылок, проверка ссылок

-- AlterTable: блокировка пользователей и время последнего входа
ALTER TABLE `users` ADD COLUMN `isBlocked` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lastLoginAt` DATETIME(3) NULL;

-- AlterTable: название и скрытие виртуальных выставок
ALTER TABLE `files` ADD COLUMN `title` VARCHAR(300) NULL,
    ADD COLUMN `isHidden` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: переходы по коротким ссылкам по дням
CREATE TABLE `short_link_clicks` (
    `shortLinkId` VARCHAR(191) NOT NULL,
    `day` DATE NOT NULL,
    `clicks` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`shortLinkId`, `day`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: отчёты проверки битых ссылок
CREATE TABLE `link_check_reports` (
    `id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,
    `total` INTEGER NOT NULL DEFAULT 0,
    `checked` INTEGER NOT NULL DEFAULT 0,
    `brokenCount` INTEGER NOT NULL DEFAULT 0,
    `results` JSON NULL,
    `error` TEXT NULL,

    INDEX `link_check_reports_startedAt_idx`(`startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `short_link_clicks` ADD CONSTRAINT `short_link_clicks_shortLinkId_fkey` FOREIGN KEY (`shortLinkId`) REFERENCES `short_links`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
