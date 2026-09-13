-- AlterTable
ALTER TABLE `OrderItem` ADD COLUMN `shippedAt` DATETIME(3) NULL,
    ADD COLUMN `trackingCode` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `SellerProfile` ADD COLUMN `categoryId` VARCHAR(191) NULL,
    ADD COLUMN `description` TEXT NULL;

-- CreateIndex
CREATE INDEX `SellerProfile_categoryId_idx` ON `SellerProfile`(`categoryId`);

-- AddForeignKey
ALTER TABLE `SellerProfile` ADD CONSTRAINT `SellerProfile_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
