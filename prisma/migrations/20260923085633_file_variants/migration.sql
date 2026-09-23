-- AlterTable
-- Уменьшенные копии картинок для srcset (см. FilesService.createVariants)
ALTER TABLE `files` ADD COLUMN `variants` JSON NULL;
