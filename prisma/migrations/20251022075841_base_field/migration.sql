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
    `departmentId` VARCHAR(191) NOT NULL,
    `pinned` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `posts_slug_key`(`slug`),
    INDEX `posts_departmentId_idx`(`departmentId`),
    INDEX `posts_previewFileId_idx`(`previewFileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(191) NOT NULL,
    `oldId` INTEGER NULL,
    `previewFileId` VARCHAR(191) NULL,
    `title` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(250) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `departments_oldId_key`(`oldId`),
    UNIQUE INDEX `departments_title_key`(`title`),
    UNIQUE INDEX `departments_slug_key`(`slug`),
    INDEX `departments_previewFileId_idx`(`previewFileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `files` (
    `id` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(200) NOT NULL,
    `mimeType` VARCHAR(50) NOT NULL,
    `hash` VARCHAR(64) NOT NULL,
    `path` VARCHAR(400) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `files_hash_key`(`hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_previewFileId_fkey` FOREIGN KEY (`previewFileId`) REFERENCES `files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_previewFileId_fkey` FOREIGN KEY (`previewFileId`) REFERENCES `files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
