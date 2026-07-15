-- Rename `image` (plain string) to `imageFileId` and turn it into a relation to `files`
ALTER TABLE `map_points` CHANGE COLUMN `image` `imageFileId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `map_points_imageFileId_idx` ON `map_points`(`imageFileId`);

-- AddForeignKey
ALTER TABLE `map_points` ADD CONSTRAINT `map_points_imageFileId_fkey` FOREIGN KEY (`imageFileId`) REFERENCES `files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
