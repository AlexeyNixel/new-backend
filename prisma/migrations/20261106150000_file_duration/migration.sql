-- Длительность аудиофайлов: подкасты показывают её на карточке и в плеере
-- AlterTable
ALTER TABLE `files` ADD COLUMN `duration` INTEGER NULL;
