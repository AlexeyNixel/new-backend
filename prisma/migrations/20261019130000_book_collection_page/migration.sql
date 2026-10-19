-- Страница подборки на сайте: адрес (slug) и описание; порядок книг в подборке.

-- AlterTable
-- slug добавляем в три шага: у существующих подборок адреса ещё нет.
-- Временно ставим slug = id; при первом сохранении в админке бэкенд
-- заменит его на адрес из названия (BookCategoryService.update).
ALTER TABLE `book_collection` ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `slug` VARCHAR(250) NULL;

UPDATE `book_collection` SET `slug` = `id` WHERE `slug` IS NULL;

ALTER TABLE `book_collection` MODIFY `slug` VARCHAR(250) NOT NULL;

-- AlterTable
-- Порядок книг; у уже добавленных книг 0 — между собой они идут по дате добавления.
ALTER TABLE `books_on_collections` ADD COLUMN `position` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX `book_collection_slug_key` ON `book_collection`(`slug`);
