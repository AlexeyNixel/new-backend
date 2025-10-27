/*
  Warnings:

  - You are about to drop the column `title` on the `main_slider_slides` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `main_slider_slides` DROP COLUMN `title`;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` VARCHAR(200) NOT NULL,
    `postId` VARCHAR(191) NULL,
    `startTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endTime` DATETIME(3) NULL,

    INDEX `notifications_postId_idx`(`postId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Book` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` LONGTEXT NOT NULL,
    `content` LONGTEXT NOT NULL,
    `category` VARCHAR(200) NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `isVideo` BOOLEAN NOT NULL DEFAULT false,
    `litresLink` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NavigationItem` (
    `id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
