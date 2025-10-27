-- CreateTable
CREATE TABLE `main_slider_slides` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `slideOrder` INTEGER NOT NULL DEFAULT 0,
    `postId` VARCHAR(191) NULL,
    `imageFileId` VARCHAR(191) NULL,
    `url` VARCHAR(191) NULL,

    INDEX `main_slider_slides_imageFileId_idx`(`imageFileId`),
    INDEX `main_slider_slides_slideOrder_idx`(`slideOrder`),
    INDEX `main_slider_slides_postId_idx`(`postId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `main_slider_slides` ADD CONSTRAINT `main_slider_slides_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `main_slider_slides` ADD CONSTRAINT `main_slider_slides_imageFileId_fkey` FOREIGN KEY (`imageFileId`) REFERENCES `files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
