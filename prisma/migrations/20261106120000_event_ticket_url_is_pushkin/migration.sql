-- Билеты события: ссылка на кассу + признак Пушкинской карты
-- AlterTable
ALTER TABLE `events` ADD COLUMN `ticketUrl` VARCHAR(1000) NULL,
    ADD COLUMN `isPushkin` BOOLEAN NOT NULL DEFAULT false;
