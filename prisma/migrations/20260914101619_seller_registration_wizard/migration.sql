/*
  Warnings:

  - You are about to drop the column `categoryId` on the `SellerProfile` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `SellerProfile` DROP FOREIGN KEY `SellerProfile_categoryId_fkey`;

-- DropIndex
DROP INDEX `SellerProfile_categoryId_idx` ON `SellerProfile`;

-- AlterTable
-- phoneNumbers is added nullable first, backfilled, then tightened to NOT NULL below - added
-- directly as `JSON NOT NULL` with no explicit DEFAULT, MySQL/MariaDB's own implicit default for
-- an existing row lands on an empty string, which is not valid JSON and fails this column's own
-- `json_valid()` CHECK constraint on every future read (confirmed locally against this exact
-- migration - see docs/decisions.md ADR 29). This sequence guarantees every row - old or new -
-- ends up with a real `[]`, regardless of server default behavior.
ALTER TABLE `SellerProfile` DROP COLUMN `categoryId`,
    ADD COLUMN `address` TEXT NULL,
    ADD COLUMN `avatarUrl` VARCHAR(191) NULL,
    ADD COLUMN `businessLicenseImageUrl` VARCHAR(191) NULL,
    ADD COLUMN `phoneNumbers` JSON NULL,
    ADD COLUMN `referralSource` VARCHAR(191) NULL,
    ADD COLUMN `referralSourceOther` VARCHAR(191) NULL,
    ADD COLUMN `termsAcceptedAt` DATETIME(3) NULL,
    ADD COLUMN `unionId` VARCHAR(191) NULL;

-- UpdateData
UPDATE `SellerProfile` SET `phoneNumbers` = '[]' WHERE `phoneNumbers` IS NULL;

-- AlterTable
ALTER TABLE `SellerProfile` MODIFY COLUMN `phoneNumbers` JSON NOT NULL;

-- CreateTable
CREATE TABLE `SellerCategory` (
    `sellerProfileId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    INDEX `SellerCategory_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`sellerProfileId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SellerCategory` ADD CONSTRAINT `SellerCategory_sellerProfileId_fkey` FOREIGN KEY (`sellerProfileId`) REFERENCES `SellerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SellerCategory` ADD CONSTRAINT `SellerCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
