-- AlterTable
-- Дата мероприятия для новостей-анонсов (только дата). NULL — обычная новость:
-- сайт показывает дату публикации. Сортировка по-прежнему по publishedAt.
ALTER TABLE `posts` ADD COLUMN `eventDate` DATE NULL;
