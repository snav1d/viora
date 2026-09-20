-- AlterTable
ALTER TABLE `ServiceProviderProfile` ADD COLUMN `categoryId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `ServiceProviderProfile_categoryId_idx` ON `ServiceProviderProfile`(`categoryId`);

-- AddForeignKey
ALTER TABLE `ServiceProviderProfile` ADD CONSTRAINT `ServiceProviderProfile_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
