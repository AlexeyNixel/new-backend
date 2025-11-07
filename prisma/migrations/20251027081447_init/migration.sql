-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `posts` (
    `id` VARCHAR(191) NOT NULL,
    `previewFileId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `title` VARCHAR(200) NOT NULL,
    `description` LONGTEXT NULL,
    `content` LONGTEXT NULL,
    `slug` VARCHAR(250) NOT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `departmentId` VARCHAR(191) NULL,
    `isPinned` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `posts_slug_key`(`slug`),
    INDEX `posts_departmentId_idx`(`departmentId`),
    INDEX `posts_previewFileId_idx`(`previewFileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(250) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `previewFileId` VARCHAR(191) NULL,

    UNIQUE INDEX `departments_slug_key`(`slug`),
    INDEX `departments_previewFileId_idx`(`previewFileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tags` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(250) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tags_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tags_on_posts` (
    `postId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`postId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `files` (
    `id` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(200) NOT NULL,
    `mimeType` VARCHAR(50) NOT NULL,
    `hash` VARCHAR(64) NOT NULL,
    `type` ENUM('IMAGE', 'DOCUMENT', 'VIDEO', 'AUDIO', 'ARCHIVE', 'OTHER') NOT NULL,
    `path` VARCHAR(400) NOT NULL,
    `size` INTEGER NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `files_hash_key`(`hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `main_slider_slides` (
    `id` VARCHAR(191) NOT NULL,
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
    `test` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `navigation_items` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `url` VARCHAR(500) NULL,
    `slug` VARCHAR(100) NOT NULL,
    `description` VARCHAR(200) NULL,
    `icon` VARCHAR(50) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isExternal` BOOLEAN NOT NULL DEFAULT false,
    `target` VARCHAR(191) NOT NULL DEFAULT '_self',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `parentId` VARCHAR(191) NULL,

    UNIQUE INDEX `navigation_items_slug_key`(`slug`),
    INDEX `navigation_items_parentId_idx`(`parentId`),
    INDEX `navigation_items_order_idx`(`order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_previewFileId_fkey` FOREIGN KEY (`previewFileId`) REFERENCES `files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_previewFileId_fkey` FOREIGN KEY (`previewFileId`) REFERENCES `files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tags_on_posts` ADD CONSTRAINT `tags_on_posts_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tags_on_posts` ADD CONSTRAINT `tags_on_posts_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `main_slider_slides` ADD CONSTRAINT `main_slider_slides_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `main_slider_slides` ADD CONSTRAINT `main_slider_slides_imageFileId_fkey` FOREIGN KEY (`imageFileId`) REFERENCES `files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `navigation_items` ADD CONSTRAINT `navigation_items_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `navigation_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
