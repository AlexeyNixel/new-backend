-- Доступ сотрудников к разделам админки. NULL — все разделы (так остаются уже заведённые сотрудники)
ALTER TABLE `users` ADD COLUMN `sections` JSON NULL;
