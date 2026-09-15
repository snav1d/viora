-- AlterTable
ALTER TABLE `Order` MODIFY `orderType` ENUM('SINGLE_SELLER', 'MULTI_SELLER', 'SERVICE') NOT NULL;

-- AlterTable
ALTER TABLE `OrderItem` ADD COLUMN `acceptedAt` DATETIME(3) NULL,
    ADD COLUMN `customerNotes` TEXT NULL,
    ADD COLUMN `designFileUrl` VARCHAR(191) NULL,
    ADD COLUMN `expressFee` DECIMAL(12, 0) NULL,
    ADD COLUMN `isExpressDelivery` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `printColor` VARCHAR(191) NULL,
    ADD COLUMN `printFinish` ENUM('CHROME', 'MATTE') NULL,
    ADD COLUMN `requestedDeliveryDate` DATETIME(3) NULL;

-- AlterTable
-- printableColors is added nullable first, backfilled, then tightened to NOT NULL - added
-- directly as `JSON NOT NULL` with no explicit DEFAULT, MySQL/MariaDB's own implicit default for
-- an existing row (ServiceOffering already has one seeded row) is an empty string, not valid
-- JSON, which fails this column's own json_valid() CHECK constraint on every future read -
-- confirmed directly, the exact same issue as docs/decisions.md ADR 29's phoneNumbers migration.
ALTER TABLE `ServiceOffering` ADD COLUMN `minOrderQuantity` INTEGER NULL,
    ADD COLUMN `printableColors` JSON NULL,
    ADD COLUMN `supportsChrome` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `supportsMatte` BOOLEAN NOT NULL DEFAULT false;

-- UpdateData
UPDATE `ServiceOffering` SET `printableColors` = '[]' WHERE `printableColors` IS NULL;

-- AlterTable
ALTER TABLE `ServiceOffering` MODIFY COLUMN `printableColors` JSON NOT NULL;

-- AlterTable
ALTER TABLE `ServiceProviderProfile` ADD COLUMN `businessLicenseImageUrl` VARCHAR(191) NULL,
    MODIFY `commissionRate` DECIMAL(5, 2) NOT NULL DEFAULT 10.00;

-- CreateTable
CREATE TABLE `PrintPricingTier` (
    `id` VARCHAR(191) NOT NULL,
    `serviceOfferingId` VARCHAR(191) NOT NULL,
    `minQuantity` INTEGER NOT NULL,
    `maxQuantity` INTEGER NULL,
    `unitPrice` DECIMAL(12, 0) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PrintPricingTier_serviceOfferingId_idx`(`serviceOfferingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PrintPricingTier` ADD CONSTRAINT `PrintPricingTier_serviceOfferingId_fkey` FOREIGN KEY (`serviceOfferingId`) REFERENCES `ServiceOffering`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
