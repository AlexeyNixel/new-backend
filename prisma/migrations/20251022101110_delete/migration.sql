/*
  Warnings:

  - You are about to drop the column `oldId` on the `departments` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `departments_oldId_key` ON `departments`;

-- DropIndex
DROP INDEX `departments_title_key` ON `departments`;

-- AlterTable
ALTER TABLE `departments` DROP COLUMN `oldId`;
