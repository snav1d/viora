/*
  Warnings:

  - Made the column `categoryId` on table `ServiceProviderProfile` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `ServiceProviderProfile` DROP FOREIGN KEY `ServiceProviderProfile_categoryId_fkey`;

-- AlterTable
ALTER TABLE `ServiceProviderProfile` MODIFY `categoryId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `ServiceProviderProfile` ADD CONSTRAINT `ServiceProviderProfile_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
