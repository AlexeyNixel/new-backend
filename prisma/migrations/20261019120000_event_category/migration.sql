-- AlterTable
-- Тип события для афиши (выбирает редактор); NULL — не указан, сайт определяет тип по названию
ALTER TABLE `events` ADD COLUMN `category` ENUM('MASTER', 'MUSIC', 'GAME', 'TALK') NULL;
