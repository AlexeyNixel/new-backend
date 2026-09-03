-- Глубокий поиск по новостям.
--
-- `contentText` — тело новости без HTML: генерируемая STORED-колонка, которую
-- MySQL/MariaDB пересчитывает сама на каждый INSERT/UPDATE строки `posts`.
-- Приложение её не пишет (её нет в data при create/update). Prisma не умеет
-- моделировать генерируемые колонки, поэтому DDL прописан здесь вручную, а в
-- schema.prisma колонка объявлена как обычная `contentText String? @db.LongText`.
--
-- Очистка тела: 1) вырезать <script>/<style> вместе с содержимым,
-- 2) убрать остальные теги, 3) заменить HTML-сущности на пробел,
-- 4) схлопнуть пробелы. REGEXP_REPLACE доступен в MariaDB 10.0.5+.
ALTER TABLE `posts`
    ADD COLUMN `contentText` LONGTEXT
    GENERATED ALWAYS AS (
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(`content`, '(?is)<(script|style)[^>]*>.*?</\\1>', ' '),
                    '<[^>]*>', ' '
                ),
                '&(#[0-9]+|[a-zA-Z]+);', ' '
            ),
            '[[:space:]]+', ' '
        )
    ) STORED;

-- FULLTEXT-индекс для MATCH(...) AGAINST(...). На ADD COLUMN выше MariaDB уже
-- посчитала `contentText` для всех существующих строк, отдельный бэкофилл не нужен.
CREATE FULLTEXT INDEX `posts_title_description_contentText_idx`
    ON `posts` (`title`, `description`, `contentText`);
